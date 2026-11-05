"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { SOURCE_URL } from "@/components/CloudBackup";
import { useCloud } from "@/state/cloud";
import { lastExport, useWardrobe } from "@/state/wardrobe";

const NAV = [
  { href: "/", label: "Today" },
  { href: "/wardrobe", label: "Wardrobe" },
  { href: "/week", label: "Week" },
  { href: "/settings", label: "Settings" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { mode, storageError, personalCount, ready } = useWardrobe();
  const cloud = useCloud();
  const [unsaved, setUnsaved] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem("ootd.nudge") === "1");
    } catch {
      setDismissed(false);
    }
  }, []);
  // Pieces that exist only on this device: no cloud backup, and more than the last export held.
  useEffect(() => {
    if (!ready || cloud.available) return setUnsaved(false);
    setUnsaved(personalCount > (lastExport()?.pieces ?? 0));
  }, [ready, cloud.available, personalCount, path]);
  const attention = ["restore-available", "conflict", "shrink"].includes(cloud.status.phase);
  const current = (href: string) => (href === "/" ? path === "/" : path.startsWith(href)) ? "page" : undefined;
  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="topbar">
        <div className="topbar-inner">
          <Link href="/" className="wordmark" aria-label="OOTD, today">
            OOTD<i>.</i>
          </Link>
          <Link href="/settings" className="label mode" aria-label="Switch wardrobe in Settings">
            {mode === "personal" ? "My wardrobe" : "Sample wardrobe"}
          </Link>
          <nav className="topnav" aria-label="Main">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} aria-current={current(n.href)}>
                {n.label}
              </Link>
            ))}
          </nav>
          <a className="label source-link" href={SOURCE_URL} target="_blank" rel="noopener noreferrer" aria-label="Source on GitHub (opens in a new tab)">
            Source ↗
          </a>
        </div>
      </header>
      <main id="main" className="main" tabIndex={-1}>
        {storageError && path !== "/settings" && (
          <p className="banner" role="alert" style={{ marginBottom: 16 }}>
            {storageError}
          </p>
        )}
        {path !== "/settings" && attention && (
          <p className="banner" role="alert" style={{ marginBottom: 16 }}>
            <span>
              {cloud.status.phase === "restore-available"
                ? "Your cloud backup can be restored to this device."
                : "Your cloud backup needs a decision before it can save again."}
            </span>
            <Link className="text-link" href="/settings">
              Open Settings
            </Link>
          </p>
        )}
        {path !== "/settings" && !attention && unsaved && !dismissed && (
          <p className="banner" style={{ marginBottom: 16 }}>
            <span>
              {personalCount} piece{personalCount === 1 ? " is" : "s are"} saved only in this browser. Download an export in{" "}
              <Link className="text-link" href="/settings">
                Settings
              </Link>{" "}
              so nothing is lost.
            </span>
            <button
              type="button"
              className="text-link"
              onClick={() => {
                setDismissed(true);
                try {
                  sessionStorage.setItem("ootd.nudge", "1");
                } catch {
                  // Dismissed for this visit only.
                }
              }}
            >
              Later
            </button>
          </p>
        )}
        {children}
      </main>
      <nav className="tabbar" aria-label="Main">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} aria-current={current(n.href)}>
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
