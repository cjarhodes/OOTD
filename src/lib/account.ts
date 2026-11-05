/**
 * Pure helpers for accounts: where photos live, how save errors read, and
 * each person's monthly AI allowance. The Supabase calls are in
 * src/state/cloud.tsx and src/server/auth.ts; the schema is in
 * supabase/migrations.
 */

export const PHOTO_BUCKET = "ootd-photos";

/** Photos are stored by content: <user id>/<sha256 of the bytes>. */
export function photoPath(userId: string, hash: string): string {
  if (!/^[0-9a-f-]{36}$/.test(userId) || !/^[a-f0-9]{64}$/.test(hash)) throw new Error("Bad photo path");
  return `${userId}/${hash}`;
}

/** An upload of a photo that's already stored is a success: same name, same bytes. */
export function isAlreadyStored(error: { message?: string; statusCode?: string | number } | null | undefined): boolean {
  if (!error) return false;
  return String(error.statusCode) === "409" || /already exists|duplicate/i.test(error.message ?? "");
}

export type SaveFailure =
  | { kind: "conflict"; remotePieces: number | null }
  | { kind: "shrink"; remotePieces: number | null }
  | { kind: "signed-out" }
  | { kind: "rejected"; message: string }
  | { kind: "retry"; message: string };

/** Read an error from ootd_save_wardrobe (see the migration for the codes). */
export function saveFailure(error: { code?: string; details?: string | null; message?: string } | null | undefined): SaveFailure {
  const pieces = Number(error?.details);
  const remotePieces = Number.isFinite(pieces) && error?.details ? pieces : null;
  switch (error?.code) {
    case "OD409":
      return { kind: "conflict", remotePieces };
    case "OD410":
      return { kind: "shrink", remotePieces };
    case "28000":
    case "PGRST301":
    case "PGRST303":
      return { kind: "signed-out" };
    case "OD413":
    case "OD422":
      return { kind: "rejected", message: error.message ?? "That wardrobe couldn’t be saved." };
    default:
      return { kind: "retry", message: "Your wardrobe couldn’t be saved just now. It will retry." };
  }
}

/** Friendly wording for sign-in errors from Supabase Auth. */
export function signInError(message: string | undefined): string {
  const m = (message ?? "").toLowerCase();
  if (m.includes("rate limit") || m.includes("too many")) return "Too many sign-in emails have gone out just now. Try again in a little while.";
  if (m.includes("invalid") && m.includes("email")) return "That email address doesn’t look right.";
  if (m.includes("signups not allowed") || m.includes("signup")) return "New accounts aren’t open right now.";
  return "The sign-in email couldn’t be sent. Try again in a moment.";
}

export function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

export interface Allowance {
  /** Tags allowed this month; null means no per-person limit (the monthly cap still applies). */
  limit: number | null;
  used: number;
}

/** Owners named in OOTD_OWNER_EMAILS get no per-person limit; everyone else gets OOTD_AI_TAGS_PER_MONTH (default 20). */
export function allowanceFor(email: string | null | undefined, env: Record<string, string | undefined>): number | null {
  const owners = (env.OOTD_OWNER_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (email && owners.includes(email.toLowerCase())) return null;
  const n = Number(env.OOTD_AI_TAGS_PER_MONTH);
  return Number.isInteger(n) && n >= 0 ? n : 20;
}

export function userTagKey(userId: string, now = new Date()): string {
  return `ootd:ai:tags:${userId}:${now.toISOString().slice(0, 7)}`;
}
