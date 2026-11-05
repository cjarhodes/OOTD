import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Owner-only access for paid features. A passphrase (OOTD_OWNER_PASSPHRASE)
 * unlocks a signed, HttpOnly session cookie (signed with OOTD_SESSION_SECRET).
 * Visitors to the public demo never get one.
 */
export const OWNER_COOKIE = "ootd_owner";
export const SESSION_DAYS = 90;

export function ownerConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.OOTD_OWNER_PASSPHRASE && env.OOTD_SESSION_SECRET && env.OOTD_SESSION_SECRET.length >= 32);
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function passphraseMatches(candidate: string, env: NodeJS.ProcessEnv = process.env): boolean {
  const expected = env.OOTD_OWNER_PASSPHRASE;
  if (!expected || typeof candidate !== "string") return false;
  // Compare digests so the comparison is constant-time regardless of length.
  const h = (s: string) => createHmac("sha256", "ootd-passphrase").update(s).digest("hex");
  return safeEqual(h(candidate), h(expected));
}

export function createSession(now = Date.now(), env: NodeJS.ProcessEnv = process.env): string {
  const secret = env.OOTD_SESSION_SECRET;
  if (!secret) throw new Error("OOTD_SESSION_SECRET is not set");
  const exp = String(now + SESSION_DAYS * 86_400_000);
  return `${exp}.${sign(exp, secret)}`;
}

export function verifySession(token: string | undefined, now = Date.now(), env: NodeJS.ProcessEnv = process.env): boolean {
  const secret = env.OOTD_SESSION_SECRET;
  if (!token || !secret) return false;
  const [exp, mac] = token.split(".");
  if (!exp || !mac || !/^\d+$/.test(exp)) return false;
  if (Number(exp) < now) return false;
  return safeEqual(mac, sign(exp, secret));
}
