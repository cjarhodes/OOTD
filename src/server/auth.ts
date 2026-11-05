import { createClient } from "@supabase/supabase-js";

/**
 * Who is calling OOTD's own API: the Supabase access token in the
 * Authorization header, checked with Supabase Auth. Null when it is missing,
 * expired or forged, or accounts aren't configured.
 */
export interface Caller {
  id: string;
  email: string | null;
}

export async function callerFrom(request: Request, env: NodeJS.ProcessEnv = process.env): Promise<Caller | null> {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const token = /^Bearer\s+(\S+)$/i.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!url || !key || !token) return null;
  try {
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) return null;
    return { id: data.user.id, email: data.user.email ?? null };
  } catch {
    return null;
  }
}
