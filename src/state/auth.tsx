"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { validEmail } from "@/lib/account";

/**
 * Who is signed in. OOTD runs its own sign-in: an emailed link plus a
 * 6-digit code (src/app/api/auth), and a signed HttpOnly session cookie.
 */
export interface Account {
  id: string;
  email: string | null;
}

interface AuthContext {
  /** Accounts exist on this deployment. */
  configured: boolean;
  /** The session has been read (signed in or not). */
  ready: boolean;
  user: Account | null;
  /** Email a sign-in link and code. Returns an error message, or null when sent. */
  sendLink: (email: string) => Promise<string | null>;
  /** Sign in with the code from the email. Returns an error message, or null when signed in. */
  verifyCode: (email: string, code: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthContext | null>(null);

async function post(path: string, body?: unknown): Promise<{ ok: boolean; json: Record<string, unknown> }> {
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { ok: res.ok, json: (await res.json().catch(() => ({}))) as Record<string, unknown> };
  } catch {
    return { ok: false, json: { error: "Couldn’t reach OOTD. Check your connection." } };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [user, setUser] = useState<Account | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session", { cache: "no-store" });
      const json = res.ok ? ((await res.json()) as { configured?: boolean; user?: Account | null }) : {};
      setConfigured(Boolean(json.configured));
      setUser((prev) => (json.user ? (prev?.id === json.user.id ? prev : json.user) : null));
    } catch {
      // Offline: keep whoever was signed in, so the device's copy stays usable.
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sendLink = useCallback(async (email: string) => {
    if (!validEmail(email)) return "That email address doesn’t look right.";
    const { ok, json } = await post("/api/auth/start", { email: email.trim() });
    return ok ? null : String(json.error ?? "The sign-in email couldn’t be sent. Try again in a moment.");
  }, []);

  const verifyCode = useCallback(async (email: string, code: string) => {
    const { ok, json } = await post("/api/auth/code", { email: email.trim(), code });
    if (!ok) return String(json.error ?? "That code didn’t work.");
    const u = json.user as Account | undefined;
    if (u) setUser(u);
    return null;
  }, []);

  const signOut = useCallback(async () => {
    await post("/api/auth/signout");
    setUser(null);
  }, []);

  const value = useMemo<AuthContext>(
    () => ({ configured, ready, user, sendLink, verifyCode, signOut }),
    [configured, ready, user, sendLink, verifyCode, signOut],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
