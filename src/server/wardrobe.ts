import { createHash } from "node:crypto";
import { Conflict, countUnder, exists, readBytes, readJson, writeBytes, writeJson } from "./store";

/**
 * One wardrobe per account, in the private store:
 *   users/<id>/wardrobe.json         the current wardrobe, with its save count
 *   users/<id>/history/<slot>.json   the wardrobe before each hour's first change; 30 slots reused in turn
 *   users/<id>/photos/<sha256>       photos, named by their bytes and never overwritten
 */
export interface StoredWardrobe {
  savedAt: string;
  pieces: number;
  snapshots: number;
  state: { items: unknown[] } & Record<string, unknown>;
}

export const HISTORY_SLOTS = 30;
export const MAX_PHOTOS = 600;
export const PHOTO_TYPES: Record<string, true> = { "image/png": true, "image/jpeg": true, "image/webp": true };

const base = (uid: string) => {
  if (!/^[0-9a-f-]{36}$/.test(uid)) throw new Error("Bad account id");
  return `users/${uid}`;
};

export async function readWardrobe(uid: string) {
  return readJson<StoredWardrobe>(`${base(uid)}/wardrobe.json`);
}

export type SaveOutcome =
  | { ok: true; etag: string; savedAt: string; pieces: number }
  | { ok: false; code: "OD409" | "OD410"; remotePieces: number; savedAt?: string };

/** What a save should do, given what's stored (pure, for tests). */
export function judgeSave(
  current: { value: StoredWardrobe; etag: string } | null,
  incomingPieces: number,
  ifMatch: string | null,
  force: boolean,
): { ok: true } | { ok: false; code: "OD409" | "OD410" } {
  if (!current) return { ok: true };
  if (!force && ifMatch !== current.etag) return { ok: false, code: "OD409" };
  const stored = current.value.pieces;
  if (!force && stored > 0 && (incomingPieces === 0 || incomingPieces * 2 < stored)) return { ok: false, code: "OD410" };
  return { ok: true };
}

/** Whether the version being replaced goes into history: the first change each hour, and every forced save. */
export function keepsHistory(previousSavedAt: string, now: Date, force: boolean): boolean {
  return force || previousSavedAt.slice(0, 13) !== now.toISOString().slice(0, 13);
}

export async function saveWardrobe(
  uid: string,
  state: StoredWardrobe["state"],
  ifMatch: string | null,
  force: boolean,
  now = new Date(),
): Promise<SaveOutcome> {
  const current = await readWardrobe(uid);
  const pieces = state.items.length;
  const verdict = judgeSave(current, pieces, ifMatch, force);
  if (!verdict.ok) return { ok: false, code: verdict.code, remotePieces: current!.value.pieces, savedAt: current!.value.savedAt };

  let snapshots = current?.value.snapshots ?? 0;
  if (current && keepsHistory(current.value.savedAt, now, force)) {
    await writeJson(`${base(uid)}/history/${snapshots % HISTORY_SLOTS}.json`, current.value);
    snapshots += 1;
  }
  const next: StoredWardrobe = { savedAt: now.toISOString(), pieces, snapshots, state };
  try {
    const etag = await writeJson(`${base(uid)}/wardrobe.json`, next, current ? { ifMatch: current.etag } : { create: true });
    return { ok: true, etag, savedAt: next.savedAt, pieces };
  } catch (e) {
    if (!(e instanceof Conflict)) throw e;
    const latest = await readWardrobe(uid);
    return { ok: false, code: "OD409", remotePieces: latest?.value.pieces ?? 0, savedAt: latest?.value.savedAt };
  }
}

export async function listHistory(uid: string): Promise<{ slot: number; savedAt: string; pieces: number }[]> {
  const out: { slot: number; savedAt: string; pieces: number }[] = [];
  const reads = await Promise.all(
    Array.from({ length: HISTORY_SLOTS }, (_, slot) => readJson<StoredWardrobe>(`${base(uid)}/history/${slot}.json`).then((r) => ({ slot, r }))),
  );
  for (const { slot, r } of reads) if (r) out.push({ slot, savedAt: r.value.savedAt, pieces: r.value.pieces });
  return out.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export async function readHistory(uid: string, slot: number) {
  if (!Number.isInteger(slot) || slot < 0 || slot >= HISTORY_SLOTS) return null;
  return readJson<StoredWardrobe>(`${base(uid)}/history/${slot}.json`);
}

export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export type PhotoOutcome = "stored" | "already" | "limit";

export async function storePhoto(uid: string, hash: string, bytes: Uint8Array, contentType: string): Promise<PhotoOutcome> {
  const path = `${base(uid)}/photos/${hash}`;
  if (await exists(path)) return "already";
  if ((await countUnder(`${base(uid)}/photos/`)) >= MAX_PHOTOS) return "limit";
  try {
    await writeBytes(path, bytes, contentType);
    return "stored";
  } catch (e) {
    if (/already exists/i.test(String((e as Error).message))) return "already";
    throw e;
  }
}

export async function loadPhoto(uid: string, hash: string) {
  return readBytes(`${base(uid)}/photos/${hash}`);
}
