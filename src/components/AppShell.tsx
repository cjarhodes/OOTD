"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { SOURCE_URL } from "@/components/CloudBackup";
import { SignIn } from "@/components/SignIn";
import { useAuth } from "@/state/auth";
import { useCloud } from "@/state/cloud";
import { lastExport, useWardrobe } from "@/state/wardrobe";

const NAV = [
  { href: "/", label: "Today" },
  { href: "/wardrobe", label: "Wardrobe" },
  { href: "/add", label: "Add" },
  { href: "/week", label: "Week" },
  { href: "/settings", label: "Settings" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { mode, setMode, storageError, personalCount, ready } = useWardrobe();
  const cloud = useCloud();
  const auth = useAuth();
  // Your own wardrobe needs an account; the sample wardrobe never does.
  const needsSignIn = auth.ready && !auth.user && path !== "/settings" && (mode === "personal" || path === "/start" || path === "/setup");
  // The /add page shows its own signed-out preview. The other gates carry the heading of the nav item they sit under.
  const adding = path.startsWith("/add") || path.startsWith("/start") || path.startsWith("/setup");
  const gateTitle = adding ? "Add pieces" : (NAV.find((n) => (n.href === "/" ? path === "/" : path.startsWith(n.href)))?.label ?? "My wardrobe");
  const [unsaved, setUnsaved] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem("ootd.nudge") === "1");
    } catch {
      setDismissed(false);
    }
  }, []);
  // Pieces that exist only on this device: accounts aren't set up, and more than the last export held.
  useEffect(() => {
    if (!ready || auth.configured) return setUnsaved(false);
    setUnsaved(personalCount > (lastExport()?.pieces ?? 0));
  }, [ready, auth.configured, personalCount, path]);
  const attention = ["restore-available", "conflict", "shrink"].includes(cloud.status.phase);
  // Swiping or ticking the basics are ways to add, so they sit under Add.
  const current = (href: string) => (href === "/" ? path === "/" : path.startsWith(href) || (href === "/add" && (path.startsWith("/start") || path.startsWith("/setup")))) ? "page" : undefined;
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
          <Link href="/settings" className="label mode">
            {mode === "personal" ? "My wardrobe" : "Sample wardrobe"}
            <span className="sr-only">: switch in Settings</span>
          </Link>
          <nav className="topnav" aria-label="Main">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} aria-current={current(n.href)}>
                {n.label}
              </Link>
            ))}
          </nav>
          {auth.configured && auth.ready ? (
            <Link className="label source-link" href="/settings#account">
              {auth.user ? "Account" : "Sign in"}
            </Link>
          ) : (
            <a className="label source-link" href={SOURCE_URL} target="_blank" rel="noopener noreferrer" aria-label="Source on GitHub (opens in a new tab)">
              Source ↗
            </a>
          )}
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
                ? "Your wardrobe is in your account and can be brought to this device."
                : "Your account needs a decision before it can save again."}
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
        {needsSignIn ? (
          <section className="signin-gate">
            <div className="page-head">
              <span className="eyebrow">My wardrobe</span>
              <h1 className="display page-title">{gateTitle}</h1>
            </div>
            <SignIn />
            <p className="setting-note">
              Just looking?{" "}
              <button type="button" className="text-link" onClick={() => setMode("sample")}>
                Browse the sample wardrobe
              </button>{" "}
              instead.
            </p>
          </section>
        ) : (
          children
        )}
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
