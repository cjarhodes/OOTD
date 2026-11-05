import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * The browser's Supabase client. Accounts are off (sample wardrobe only)
 * when these two public values aren't set. The publishable key is safe in
 * the browser: row-level security and storage policies decide what each
 * signed-in person can read and write.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
export const accountsConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient | null {
  if (!accountsConfigured || typeof window === "undefined") return null;
  client ??= createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Implicit flow: the magic link signs in whichever browser opens it,
      // even if the link was requested from another one.
      flowType: "implicit",
      storageKey: "ootd.auth",
    },
  });
  return client;
}
