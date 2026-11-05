"use client";

import { useEffect, useRef, useState } from "react";
import { CloudBackup, SOURCE_URL, when } from "@/components/CloudBackup";
import { SignIn } from "@/components/SignIn";
import { cityLabel, searchCities, type City } from "@/lib/forecast";
import type { Comfort } from "@/lib/types";
import { useAI } from "@/state/ai";
import { useAuth } from "@/state/auth";
import { useCloud } from "@/state/cloud";
import { lastExport, useWardrobe } from "@/state/wardrobe";

const COMFORT: { value: Comfort; label: string }[] = [
  { value: "runs-cold", label: "I run cold" },
  { value: "neutral", label: "Neutral" },
  { value: "runs-warm", label: "I run warm" },
];

export default function SettingsPage() {
  const store = useWardrobe();
  const auth = useAuth();
  const ai = useAI();
  const cloud = useCloud();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<City[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setSearching(true);
    try {
      setResults(await searchCities(query));
    } catch {
      setMessage("The city search isn’t reachable right now. Try again in a moment.");
    } finally {
      setSearching(false);
    }
  }

  async function download() {
    const blob = await store.exportBackup();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ootd-wardrobe-${store.today}.zip`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    setMessage("Export downloaded. On iPhone it’s in Files, under Downloads; move it to iCloud Drive to keep it.");
  }

  async function signOut() {
    const unsaved = cloud.status.phase !== "synced" && store.personalCount > 0;
    if (unsaved && !window.confirm("Some changes on this device aren’t saved to your account yet. Sign out anyway?")) return;
    await auth.signOut();
    setMessage("Signed out. Your wardrobe stays in your account.");
  }

  // Arriving from a sign-in link: show your own wardrobe from here on.
  const landed = useRef(false);
  useEffect(() => {
    if (landed.current || !auth.user) return;
    const params = new URLSearchParams(window.location.search);
    if (!params.has("signed-in")) return;
    landed.current = true;
    store.setMode("personal");
    setMessage("You’re signed in. Your wardrobe is saved to your account from now on.");
    window.history.replaceState(null, "", "/settings");
  }, [auth.user, store]);

  const [exported, setExported] = useState<ReturnType<typeof lastExport>>(null);
  useEffect(() => setExported(lastExport()), [message]);

  async function restore(file: File) {
    const result = await store.importBackup(file);
    setConfirmRestore(null);
    setMessage(result.ok ? `Restored ${result.count} pieces from the backup.` : result.error);
    if (result.ok) store.setMode("personal");
  }

  return (
    <>
      <div className="page-head">
        <span className="eyebrow">OOTD</span>
        <h1 className="display page-title">Settings</h1>
      </div>

      {message && (
        <p className="banner" role="status">
          <span>{message}</span>
          <button type="button" className="text-link" onClick={() => setMessage(null)}>
            Dismiss
          </button>
        </p>
      )}

      <div className="settings">
        <section className="setting" id="account">
          <h2 className="setting-title">Account</h2>
          {!auth.ready ? (
            <p className="setting-note">Checking…</p>
          ) : auth.user ? (
            <>
              <div className="setting-row">
                <span>
                  Signed in as <strong>{auth.user.email ?? "you"}</strong>
                </span>
                <button type="button" className="text-link" onClick={() => void signOut()}>
                  Sign out
                </button>
              </div>
              <CloudBackup onExport={() => void download()} />
              {ai.status.configured && (
                <p className="setting-note">
                  AI tagging is on.{" "}
                  {ai.left === null ? "No monthly limit on this account." : `${ai.left} of ${ai.status.limit} AI tags left this month.`}
                </p>
              )}
            </>
          ) : (
            <SignIn compact />
          )}
        </section>

        <section className="setting">
          <h2 className="setting-title">Wardrobe</h2>
          <div className="segmented" role="group" aria-label="Which wardrobe" style={{ ["--count" as string]: 2 }}>
            <button type="button" aria-pressed={store.mode === "personal"} onClick={() => store.setMode("personal")}>
              My wardrobe · {store.personalCount}
            </button>
            <button type="button" aria-pressed={store.mode === "sample"} onClick={() => store.setMode("sample")}>
              Sample wardrobe
            </button>
          </div>
          <p className="setting-note">
            Your wardrobe, photos and history are saved to your account and kept on this device, so it works offline. The sample wardrobe is a demo
            with illustrated pieces and needs no account.
          </p>
        </section>

        <section className="setting">
          <h2 className="setting-title">Weather</h2>
          {store.city ? (
            <div className="setting-row">
              <span>
                Live forecast for <strong>{cityLabel(store.city)}</strong>
              </span>
              <button type="button" className="text-link" onClick={() => store.setCity(null)}>
                Remove
              </button>
            </div>
          ) : (
            <p className="setting-note">No city set, so looks use a sample forecast.</p>
          )}
          <form className="setting-row" onSubmit={search}>
            <input
              id="city"
              className="input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for your city"
              aria-label="City"
              autoComplete="address-level2"
            />
            <button type="submit" className="btn alt" disabled={query.trim().length < 2 || searching}>
              {searching ? "Searching…" : "Search"}
            </button>
          </form>
          {results && (
            <ul className="results">
              {results.length === 0 && <li className="setting-note">No places found.</li>}
              {results.map((c) => (
                <li key={`${c.latitude},${c.longitude}`}>
                  <button
                    type="button"
                    onClick={() => {
                      store.setCity(c);
                      setResults(null);
                      setQuery("");
                    }}
                  >
                    {cityLabel(c)}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="setting-note">Only the city name and its coordinates are sent to Open-Meteo. Your location is never requested.</p>
        </section>

        <section className="setting">
          <h2 className="setting-title">How warm do you dress?</h2>
          <div className="segmented" role="group" aria-label="Comfort" style={{ ["--count" as string]: 3 }}>
            {COMFORT.map((c) => (
              <button key={c.value} type="button" aria-pressed={store.comfort === c.value} onClick={() => store.setComfort(c.value)}>
                {c.label}
              </button>
            ))}
          </div>
        </section>

        <section className="setting">
          <h2 className="setting-title">Export</h2>
          <p className="setting-note">
            A ZIP you can open anywhere: a spreadsheet of every piece, your wear log, the photos as ordinary image files, and a JSON file OOTD can
            restore from. Your account keeps everything already; an export is yours to keep anywhere.
            {exported && ` Last exported ${when(exported.at)} with ${exported.pieces} piece${exported.pieces === 1 ? "" : "s"}.`}
          </p>
          <div className="actions">
            <button type="button" className="btn alt" disabled={store.personalCount === 0} onClick={() => void download()}>
              Download export
            </button>
            <button type="button" className="btn quiet" onClick={() => fileInput.current?.click()}>
              Restore from a file
            </button>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="application/zip,.zip,application/json,.json"
            hidden
            aria-label="Choose an export or backup file"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setConfirmRestore(f);
              e.target.value = "";
            }}
          />
          {confirmRestore && (
            <div className="banner" role="alert">
              <span>Replace your wardrobe on this device with “{confirmRestore.name}”?</span>
              <span className="actions">
                <button type="button" className="btn" onClick={() => void restore(confirmRestore)}>
                  Replace
                </button>
                <button type="button" className="btn quiet" onClick={() => setConfirmRestore(null)}>
                  Cancel
                </button>
              </span>
            </div>
          )}
        </section>

        <section className="setting">
          <h2 className="setting-title">About</h2>
          <p className="setting-note">
            OOTD is an open-source project by{" "}
            <a className="text-link" href="https://www.cjarhodes.com" target="_blank" rel="noopener noreferrer">
              Alex Rhodes
            </a>
            . No tracking or ads: your wardrobe is private to your account, and you can export all of it at any time. The{" "}
            <a className="text-link" href={SOURCE_URL} target="_blank" rel="noopener noreferrer">
              source is on GitHub
            </a>{" "}
            under the MIT licence. Weather by Open-Meteo.
          </p>
        </section>
      </div>
    </>
  );
}
