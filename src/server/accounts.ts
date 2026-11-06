import { createHash, createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import type { Caller } from "./session";
import { Conflict, readJson, removeOne, removeUnder, writeJson } from "./store";

/**
 * Accounts and sign-in challenges, kept in the private store.
 *   users/by-email/<sha256 of the email>.json   { id, email, createdAt }
 *   auth/pending/<sha256 of the email>.json     the current sign-in challenge
 * A challenge is a 6-digit code and a link token, sent together, stored only
 * as keyed hashes, good for 15 minutes, 5 wrong tries, and one use.
 */
export const CODE_MINUTES = 15;
export const MAX_ATTEMPTS = 5;
export const RESEND_SECONDS = 45;
export const SENDS_PER_HOUR = 5;

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function emailKey(email: string): string {
  return createHash("sha256").update(normaliseEmail(email)).digest("hex");
}

export interface Challenge {
  /** Kept so a link (which carries only the email's hash) can be checked. */
  email: string;
  codeHash: string;
  tokenHash: string;
  expires: number;
  attempts: number;
  used: boolean;
  /** When codes were sent, for rate limiting. */
  sent: number[];
}

function keyed(secret: string, email: string, value: string): string {
  return createHmac("sha256", secret).update(`${normaliseEmail(email)}\n${value}`).digest("hex");
}

function same(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Whether another email may go out now (pure, for tests). */
export function canSend(previous: Challenge | null, now: number): { ok: true } | { ok: false; reason: string } {
  const recent = (previous?.sent ?? []).filter((t) => now - t < 3_600_000);
  if (recent.some((t) => now - t < RESEND_SECONDS * 1000)) return { ok: false, reason: "We just sent one. Give it a minute, then try again." };
  if (recent.length >= SENDS_PER_HOUR) return { ok: false, reason: "Too many sign-in emails for this address. Try again in an hour." };
  return { ok: true };
}

/** Make a new challenge (pure apart from randomness). */
export function newChallenge(secret: string, email: string, previous: Challenge | null, now: number) {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const token = randomBytes(32).toString("base64url");
  const challenge: Challenge = {
    email: normaliseEmail(email),
    codeHash: keyed(secret, email, `code:${code}`),
    tokenHash: keyed(secret, email, `token:${token}`),
    expires: now + CODE_MINUTES * 60_000,
    attempts: 0,
    used: false,
    sent: [...(previous?.sent ?? []).filter((t) => now - t < 3_600_000), now],
  };
  return { code, token, challenge };
}

export type CheckResult = { ok: true; challenge: Challenge } | { ok: false; reason: string; challenge?: Challenge };

/** Check a code or link token against a challenge (pure, for tests). */
export function checkChallenge(secret: string, email: string, c: Challenge | null, proof: { code?: string; token?: string }, now: number): CheckResult {
  const expired = "That code has expired. Send a new one.";
  if (!c || c.used || c.expires < now) return { ok: false, reason: expired };
  if (c.attempts >= MAX_ATTEMPTS) return { ok: false, reason: "Too many wrong codes. Send a new one." };
  const good = proof.token
    ? same(keyed(secret, email, `token:${proof.token}`), c.tokenHash)
    : typeof proof.code === "string" && /^\d{6}$/.test(proof.code) && same(keyed(secret, email, `code:${proof.code}`), c.codeHash);
  if (!good) return { ok: false, reason: proof.token ? expired : "That code isn’t right.", challenge: { ...c, attempts: c.attempts + 1 } };
  return { ok: true, challenge: { ...c, used: true } };
}

const pendingPath = (email: string) => `auth/pending/${emailKey(email)}.json`;
const userPath = (email: string) => `users/by-email/${emailKey(email)}.json`;

export async function readChallenge(email: string) {
  return readJson<Challenge>(pendingPath(email));
}

export async function saveChallenge(email: string, challenge: Challenge, ifMatch?: string): Promise<void> {
  await writeJson(pendingPath(email), challenge, ifMatch ? { ifMatch } : {});
}

/** The account for an email, created on first sign-in. */
export async function accountFor(email: string): Promise<Caller> {
  const address = normaliseEmail(email);
  const existing = await readJson<{ id: string; email: string }>(userPath(address));
  if (existing) return { id: existing.value.id, email: existing.value.email };
  const created = { id: randomUUID(), email: address, createdAt: new Date().toISOString() };
  try {
    await writeJson(userPath(address), created, { create: true });
    return { id: created.id, email: created.email };
  } catch (e) {
    if (!(e instanceof Conflict)) throw e;
    const again = await readJson<{ id: string; email: string }>(userPath(address));
    if (!again) throw e;
    return { id: again.value.id, email: again.value.email };
  }
}

/** Email addresses come back from links as a key; this finds the challenge by key. */
export async function readChallengeByKey(key: string) {
  if (!/^[a-f0-9]{64}$/.test(key)) return null;
  return readJson<Challenge>(`auth/pending/${key}.json`);
}

/** Is this signed-in account still there? False once it has been deleted, whatever the cookie says. */
export async function accountActive(caller: Caller): Promise<boolean> {
  const record = await readJson<{ id: string }>(userPath(normaliseEmail(caller.email)));
  return record?.value.id === caller.id;
}

/**
 * Delete an account and everything in it: wardrobe, history, photos, the
 * sign-in record and any pending sign-in. Signing in again with the same
 * email starts a new, empty account.
 */
export async function deleteAccount(caller: Caller): Promise<{ objects: number }> {
  const address = normaliseEmail(caller.email);
  // The account record goes first, so nothing can be saved to it while the rest is removed.
  const record = await readJson<{ id: string }>(userPath(address));
  if (record?.value.id === caller.id) await removeOne(userPath(address));
  const objects = await removeUnder(`users/${caller.id}/`);
  await removeOne(`auth/pending/${emailKey(address)}.json`);
  return { objects: objects + 1 };
}
