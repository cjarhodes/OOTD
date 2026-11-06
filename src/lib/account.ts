/**
 * Pure helpers for accounts: how save errors read, email checks, and each
 * person's monthly AI allowance. Storage and sign-in live in src/server.
 */

export type SaveFailure =
  | { kind: "conflict"; remotePieces: number | null }
  | { kind: "shrink"; remotePieces: number | null }
  | { kind: "signed-out" }
  | { kind: "rejected"; message: string }
  | { kind: "retry"; message: string };

/** Read an error from PUT /api/wardrobe (codes are set in src/app/api/wardrobe/route.ts). */
export function saveFailure(error: { code?: string; details?: string | null; message?: string } | null | undefined): SaveFailure {
  const pieces = Number(error?.details);
  const remotePieces = Number.isFinite(pieces) && error?.details ? pieces : null;
  switch (error?.code) {
    case "OD409":
      return { kind: "conflict", remotePieces };
    case "OD410":
      return { kind: "shrink", remotePieces };
    case "28000":
      return { kind: "signed-out" };
    case "OD413":
    case "OD422":
      return { kind: "rejected", message: error.message ?? "That wardrobe couldn’t be saved." };
    default:
      return { kind: "retry", message: "Your wardrobe couldn’t be saved just now. It will retry." };
  }
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
