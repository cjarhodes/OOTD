"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { FlatLay } from "@/components/FlatLay";
import { shortDate } from "@/lib/dates";
import { lookFromIds } from "@/lib/engine/generate";
import { lookbookEntries, lookbookView, type LookbookView } from "@/lib/lookbook";
import { useForecast } from "@/state/forecast";
import { defaultOccasion, useWardrobe } from "@/state/wardrobe";

const VIEWS: { id: LookbookView; label: string; empty: string }[] = [
  { id: "loved", label: "Loved", empty: "Tap the heart on a look you like and it’s kept here." },
  { id: "worn", label: "Most worn", empty: "Looks you log with Wear this collect here, most worn first." },
  { id: "lately", label: "Not lately", empty: "Favourites you haven’t worn for two weeks show up here, ready to bring back." },
];

export default function LookbookPage() {
  const { ready, today, items, wears, feedback, comfort, savePlan, mode } = useWardrobe();
  const forecast = useForecast();
  const router = useRouter();
  const [view, setView] = useState<LookbookView>("loved");

  const entries = useMemo(() => lookbookEntries(wears, feedback, items), [wears, feedback, items]);
  const counts = useMemo(() => Object.fromEntries(VIEWS.map((v) => [v.id, lookbookView(entries, v.id, today).length])), [entries, today]);
  // Open on a view that has something in it.
  const active = counts[view] === 0 ? (VIEWS.find((v) => counts[v.id]! > 0)?.id ?? view) : view;
  const shown = useMemo(() => lookbookView(entries, active, today), [entries, active, today]);
  const weather = useMemo(() => forecast.weatherFor(today), [forecast, today]);

  const looks = useMemo(
    () =>
      shown
        .map((e) => {
          const occasion = e.occasion ?? defaultOccasion(today);
          const look = lookFromIds(e.itemIds, items, { weather, occasion, date: today, comfort });
          return look ? { entry: e, look, occasion } : null;
        })
        .filter((x) => x !== null),
    [shown, items, weather, today, comfort],
  );

  const total = entries.length;
  const meta = VIEWS.find((v) => v.id === active)!;

  return (
    <>
      <div className="page-head">
        <span className="eyebrow">
          {mode === "personal" ? "Your wardrobe" : "Sample wardrobe"} · {total} {total === 1 ? "look" : "looks"}
        </span>
        <h1 className="display page-title">Lookbook</h1>
      </div>

      <div className="segmented" role="group" aria-label="Which looks" style={{ ["--count" as string]: VIEWS.length }}>
        {VIEWS.map((v) => (
          <button key={v.id} type="button" aria-pressed={active === v.id} onClick={() => setView(v.id)}>
            {v.label}
            {ready && counts[v.id] ? ` · ${counts[v.id]}` : ""}
          </button>
        ))}
      </div>

      {ready && looks.length === 0 ? (
        <div className="plinth empty">
          <p className="display" style={{ fontSize: 28, color: "var(--ink)" }}>
            Nothing here yet
          </p>
          <p>{meta.empty}</p>
          <Link href="/" className="btn alt">
            Today’s look
          </Link>
        </div>
      ) : (
        <ul className="lookbook" aria-busy={!ready}>
          {looks.map(({ entry, look, occasion }) => (
            <li key={entry.signature} className="lookbook-card">
              <div className="plinth">
                <FlatLay pieces={look.pieces} label={`Flat-lay: ${look.name}`} compact />
              </div>
              <div className="lookbook-text">
                <p className="lookbook-name">{look.name.replace(/,[^,]*$/, "")}</p>
                <p className="lookbook-meta label">
                  {entry.loved ? "Loved" : ""}
                  {entry.loved && entry.worn ? " · " : ""}
                  {entry.worn ? `Worn ${entry.worn}×` : entry.loved ? "" : ""}
                  {entry.lastWorn ? ` · last ${shortDate(entry.lastWorn)}` : ""}
                </p>
                <button
                  type="button"
                  className="text-link"
                  onClick={() => {
                    savePlan({ date: today, itemIds: entry.itemIds, occasion, tier: "fresh" });
                    router.push("/");
                  }}
                >
                  Wear it today
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="footer-note">
        Wear it today saves the look as today’s plan. Loved looks also come up more often in your daily suggestions.
      </p>
    </>
  );
}
