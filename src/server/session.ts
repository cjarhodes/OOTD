import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { Conflict, readJson, storeConfigured, writeJson } from "./store";

/**
 * Sessions: a signed, HttpOnly cookie naming the account. The signing key is
 * OOTD_SESSION_SECRET when set; otherwise one is generated on first use and
 * kept in the private store, so a deployment needs no secret of its own.
 */
export const SESSION_COOKIE = "ootd_session";
export const SESSION_DAYS = 180;

export interface Caller {
  id: string;
  email: string;
}

let cachedKey: string | null = null;

export async function sessionKey(env: NodeJS.ProcessEnv = process.env): Promise<string> {
  if (env.OOTD_SESSION_SECRET && env.OOTD_SESSION_SECRET.length >= 32) return env.OOTD_SESSION_SECRET;
  if (cachedKey) return cachedKey;
  if (!storeConfigured(env)) throw new Error("Storage isn't configured");
  const path = "auth/session-key.json";
  const stored = await readJson<{ key: string }>(path);
  if (stored) return (cachedKey = stored.value.key);
  const key = randomBytes(48).toString("base64url");
  try {
    await writeJson(path, { key }, { create: true });
    return (cachedKey = key);
  } catch (e) {
    // Another instance made it first: use theirs.
    if (!(e instanceof Conflict)) throw e;
    const again = await readJson<{ key: string }>(path);
    if (!again) throw e;
    return (cachedKey = again.value.key);
  }
}

export function sign(payload: string, key: string): string {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function encodeSession(caller: Caller, key: string, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ ...caller, exp: now + SESSION_DAYS * 86_400_000 })).toString("base64url");
  return `${payload}.${sign(payload, key)}`;
}

export function decodeSession(token: string | undefined, key: string, now = Date.now()): Caller | null {
  if (!token) return null;
  const [payload, mac] = token.split(".");
  if (!payload || !mac || !safeEqual(mac, sign(payload, key))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as Partial<Caller> & { exp?: number };
    if (typeof data.id !== "string" || typeof data.email !== "string" || typeof data.exp !== "number" || data.exp < now) return null;
    return { id: data.id, email: data.email };
  } catch {
    return null;
  }
}

/** The signed-in caller, from the session cookie. */
export async function currentCaller(): Promise<Caller | null> {
  if (!storeConfigured()) return null;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    return decodeSession(token, await sessionKey());
  } catch {
    return null;
  }
}

export async function startSession(caller: Caller): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, encodeSession(caller, await sessionKey()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // Lax so the cookie set when a sign-in link is opened from email is kept.
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

/** State-changing requests must come from OOTD's own pages. */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return request.headers.get("sec-fetch-site") === "same-origin";
  try {
    return new URL(origin).host === new URL(request.url).host || new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}
