"use client";

import { useRef, useState } from "react";
import { cityLabel, searchCities, type City } from "@/lib/forecast";
import type { Comfort } from "@/lib/types";
import { useOwner } from "@/state/owner";
import { useWardrobe } from "@/state/wardrobe";

const COMFORT: { value: Comfort; label: string }[] = [
  { value: "runs-cold", label: "I run cold" },
  { value: "neutral", label: "Neutral" },
  { value: "runs-warm", label: "I run warm" },
];

export default function SettingsPage() {
  const store = useWardrobe();
  const owner = useOwner();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<City[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [passphrase, setPassphrase] = useState("");
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
    a.download = `ootd-backup-${store.today}.json`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    setMessage("Backup downloaded. Keep it somewhere safe, like iCloud Drive.");
  }

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
            Your wardrobe, photos and history are stored only in this browser on this device. The sample wardrobe is a demo with illustrated pieces.
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

        {owner.status.available && (
          <section className="setting">
            <h2 className="setting-title">Owner and AI tagging</h2>
            {owner.status.owner ? (
              <>
                <div className="setting-row">
                  <span>Unlocked on this device.</span>
                  <button type="button" className="text-link" onClick={() => void owner.lock()}>
                    Lock
                  </button>
                </div>
                {owner.status.ai.configured ? (
                  <p className="setting-note">
                    AI tagging is on. ${(owner.status.ai.spentUsd ?? 0).toFixed(2)} of ${owner.status.ai.capUsd?.toFixed(2)} used this month.
                  </p>
                ) : (
                  <p className="setting-note">AI tagging isn’t configured on this deployment yet.</p>
                )}
              </>
            ) : (
              <form
                className="setting-row"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const err = await owner.unlock(passphrase);
                  setPassphrase("");
                  setMessage(err ?? "Unlocked. AI tagging is available when you add pieces.");
                }}
              >
                <input
                  id="passphrase"
                  className="input"
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="Owner passphrase"
                  aria-label="Owner passphrase"
                  autoComplete="current-password"
                />
                <button type="submit" className="btn alt" disabled={!passphrase}>
                  Unlock
                </button>
              </form>
            )}
          </section>
        )}

        <section className="setting">
          <h2 className="setting-title">Backup</h2>
          <p className="setting-note">
            Safari can clear site data, and a Home Screen install keeps its own storage. Download a backup after adding pieces, and restore it on a new device.
          </p>
          <div className="actions">
            <button type="button" className="btn alt" disabled={store.personalCount === 0} onClick={() => void download()}>
              Download backup
            </button>
            <button type="button" className="btn quiet" onClick={() => fileInput.current?.click()}>
              Restore from backup
            </button>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            aria-label="Choose a backup file"
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
            OOTD is a personal project by{" "}
            <a className="text-link" href="https://cjarhodes.com" target="_blank" rel="noopener noreferrer">
              Alex Rhodes
            </a>
            . Weather by Open-Meteo.
          </p>
        </section>
      </div>
    </>
  );
}
