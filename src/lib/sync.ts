/**
 * Pure rules for keeping this device and the cloud backup in step. The
 * provider in src/state/cloud.tsx does the fetching; this decides what to do.
 */

/** JSON with sorted keys, so the same state always gives the same text. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map((v) => (v === undefined ? "null" : canonicalJson(v))).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
}

/** A short, stable fingerprint (cyrb53) of a state, to tell whether it changed. */
export function fingerprint(value: unknown): string {
  const text = canonicalJson(value);
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36) + `.${text.length.toString(36)}`;
}

/** What this device last agreed with the cloud on. */
export interface SyncedMark {
  etag: string;
  savedAt: string;
  fingerprint: string;
}

export interface Remote {
  etag: string;
  savedAt: string;
  pieces: number;
}

export type SyncAction =
  /** Nothing to do. */
  | "idle"
  /** Send this device's state (the cloud hasn't moved since we last agreed, or is empty). */
  | "push"
  /** This device hasn't changed since we last agreed; take the newer cloud copy. */
  | "pull"
  /** A fresh device with nothing on it, and a backup exists: offer to restore. */
  | "offer-restore"
  /** Both changed. Ask which to keep; never pick for the athlete. */
  | "conflict"
  /** Both hold the same wardrobe (a save landed but its reply never arrived): record that they agree. */
  | "adopt";

export function decide(input: {
  localPieces: number;
  localFingerprint: string;
  mark: SyncedMark | null;
  remote: Remote | null;
  /** The cloud copy holds exactly what this device holds. */
  sameAsRemote?: boolean;
}): SyncAction {
  const { localPieces, localFingerprint, mark, remote, sameAsRemote } = input;
  const localChanged = !mark || mark.fingerprint !== localFingerprint;
  if (!remote) return localPieces > 0 ? "push" : "idle";
  if (mark && mark.etag === remote.etag) return localChanged ? "push" : "idle";
  // The page closed before a save's reply came back: the cloud already has this state.
  if (sameAsRemote) return "adopt";
  // The cloud moved on (another device), or this device has never synced.
  if (!localChanged) return "pull";
  if (localPieces === 0 && remote.pieces > 0) return "offer-restore";
  if (remote.pieces === 0) return "push";
  return "conflict";
}

/** Retry delays after a failed save, in milliseconds. */
export function retryDelay(attempt: number): number {
  return Math.min(10 * 60_000, 15_000 * 2 ** Math.max(0, attempt - 1));
}
