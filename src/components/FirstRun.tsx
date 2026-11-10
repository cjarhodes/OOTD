"use client";

import Link from "next/link";
import { AddRoutes } from "@/components/AddRoutes";
import { ESSENTIALS, missingEssentials } from "@/lib/essentials";
import { isOwned } from "@/lib/kinds";
import { useWardrobe } from "@/state/wardrobe";

/**
 * The first-run checklist for a new account: what to add for a first look,
 * then the extras that make looks better. Ticks itself off as pieces arrive.
 */
export function FirstRun() {
  const { items, city, personalCount, setMode } = useWardrobe();
  const have = new Set(items.filter(isOwned).map((i) => i.slot));
  const steps: { done: boolean; label: string; optional?: boolean; href?: string }[] = [
    ...ESSENTIALS.map((e) => ({ done: have.has(e.slot), label: e.label })),
    { done: have.has("mid") || have.has("outer"), label: "A jumper or jacket for cooler days", optional: true },
    { done: Boolean(city), label: "Your city, for real weather", optional: true, href: "/settings#weather" },
  ];
  const left = missingEssentials(items).length;

  return (
    <div className="first-run">
      <p className="display first-run-title">{personalCount === 0 ? "Let’s set up your wardrobe" : `${left} more ${left === 1 ? "piece" : "pieces"} for a first look`}</p>
      <p className="first-run-note">
        Start any way you like. The first three need no photo; if you do take photos, OOTD removes the background.
      </p>
      <ol className="first-run-steps">
        {steps.map((s) => (
          <li key={s.label} data-done={s.done || undefined}>
            <span className="first-run-tick" aria-hidden="true">
              {s.done ? "✓" : ""}
            </span>
            <span>
              {s.href && !s.done ? <Link href={s.href} className="text-link">{s.label}</Link> : s.label}
              {s.optional && <span className="first-run-optional"> · optional</span>}
              <span className="sr-only">{s.done ? " (done)" : " (to do)"}</span>
            </span>
          </li>
        ))}
      </ol>
      <AddRoutes />
      <div className="actions">
        <button type="button" className="btn quiet" onClick={() => setMode("sample")}>
          Try the sample wardrobe
        </button>
      </div>
    </div>
  );
}
