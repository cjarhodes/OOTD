"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useWardrobe } from "@/state/wardrobe";

const NAV = [
  { href: "/", label: "Today" },
  { href: "/wardrobe", label: "Wardrobe" },
  { href: "/week", label: "Week" },
  { href: "/settings", label: "Settings" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { mode, storageError } = useWardrobe();
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
          <span className="avatar" aria-label="Alex Rhodes">
            AR
          </span>
        </div>
      </header>
      <main id="main" className="main" tabIndex={-1}>
        {storageError && path !== "/settings" && (
          <p className="banner" role="alert" style={{ marginBottom: 16 }}>
            {storageError}
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
