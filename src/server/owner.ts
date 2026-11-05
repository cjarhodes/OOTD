import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Owner-only access for AI tagging and cloud backup. A passphrase
 * (OOTD_OWNER_PASSPHRASE, at least 12 characters) unlocks a signed, HttpOnly
 * session cookie. The signing key is OOTD_SESSION_SECRET when set, otherwise
 * derived from the passphrase, so one variable is enough; changing the
 * passphrase signs everyone out. Visitors to the public demo never get one.
 */
export const OWNER_COOKIE = "ootd_owner";
export const SESSION_DAYS = 90;

export function ownerConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.OOTD_OWNER_PASSPHRASE && env.OOTD_OWNER_PASSPHRASE.length >= 12);
}

function sessionSecret(env: NodeJS.ProcessEnv): string | null {
  if (env.OOTD_SESSION_SECRET && env.OOTD_SESSION_SECRET.length >= 32) return env.OOTD_SESSION_SECRET;
  if (!ownerConfigured(env)) return null;
  return createHmac("sha256", "ootd-session-key").update(env.OOTD_OWNER_PASSPHRASE!).digest("base64url");
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
  const secret = sessionSecret(env);
  if (!secret) throw new Error("Owner access is not configured");
  const exp = String(now + SESSION_DAYS * 86_400_000);
  return `${exp}.${sign(exp, secret)}`;
}

export function verifySession(token: string | undefined, now = Date.now(), env: NodeJS.ProcessEnv = process.env): boolean {
  const secret = sessionSecret(env);
  if (!token || !secret) return false;
  const [exp, mac] = token.split(".");
  if (!exp || !mac || !/^\d+$/.test(exp)) return false;
  if (Number(exp) < now) return false;
  return safeEqual(mac, sign(exp, secret));
}
