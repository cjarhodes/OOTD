"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { signInError, validEmail } from "@/lib/account";
import { accountsConfigured, supabase } from "@/lib/supabase";

/** Who is signed in. Signing in is a magic link sent by Supabase Auth. */
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
  /** A current access token, for calls to OOTD's own API. */
  accessToken: () => Promise<string | null>;
  /** Send a sign-in link. Returns an error message, or null when sent. */
  sendLink: (email: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthContext | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!accountsConfigured);
  const [user, setUser] = useState<Account | null>(null);

  useEffect(() => {
    const client = supabase();
    if (!client) {
      setReady(true);
      return;
    }
    let active = true;
    void client.auth.getSession().then(({ data }) => {
      if (!active) return;
      const u = data.session?.user;
      setUser(u ? { id: u.id, email: u.email ?? null } : null);
      setReady(true);
    });
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      const u = session?.user;
      setUser((prev) => (u ? (prev?.id === u.id ? prev : { id: u.id, email: u.email ?? null }) : null));
      setReady(true);
      // Tidy the tokens out of the address bar after a magic link lands.
      if (u && typeof window !== "undefined" && window.location.hash.includes("access_token")) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const accessToken = useCallback(async () => {
    const client = supabase();
    if (!client) return null;
    const { data } = await client.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  const sendLink = useCallback(async (email: string) => {
    const client = supabase();
    if (!client) return "Accounts aren’t set up on this copy of OOTD.";
    if (!validEmail(email)) return "That email address doesn’t look right.";
    const { error } = await client.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/settings?signed-in=1`, shouldCreateUser: true },
    });
    return error ? signInError(error.message) : null;
  }, []);

  const signOut = useCallback(async () => {
    await supabase()?.auth.signOut();
    setUser(null);
  }, []);

  const value = useMemo<AuthContext>(
    () => ({ configured: accountsConfigured, ready, user, accessToken, sendLink, signOut }),
    [ready, user, accessToken, sendLink, signOut],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
