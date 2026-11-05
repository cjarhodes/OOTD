import { createHash } from "node:crypto";
import { BlobPreconditionFailedError, del, get, head, list, put } from "@vercel/blob";

/**
 * Private cloud backup in Vercel Blob (store connected to the project, which
 * sets BLOB_READ_WRITE_TOKEN). Layout:
 *   ootd/state.json              current wardrobe state (no photos)
 *   ootd/history/<savedAt>.json  the state as it was before each hour's first change, last 30 kept
 *   ootd/photos/<sha256>.<ext>   photos, content-addressed and never deleted here
 */
const STATE = "ootd/state.json";
const HISTORY = "ootd/history/";
const PHOTOS = "ootd/photos/";
const KEEP_HISTORY = 30;

export const PHOTO_TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

export function cloudConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.BLOB_READ_WRITE_TOKEN || (env.BLOB_STORE_ID && env.VERCEL_OIDC_TOKEN));
}

export interface StoredState {
  savedAt: string;
  state: unknown;
}

async function readJson(path: string): Promise<{ value: StoredState; etag: string } | null> {
  const result = await get(path, { access: "private", useCache: false });
  if (!result || result.statusCode !== 200) return null;
  const text = await new Response(result.stream).text();
  return { value: JSON.parse(text) as StoredState, etag: result.blob.etag };
}

export async function readState() {
  return readJson(STATE);
}

export class EtagMismatch extends Error {}

/** Etags can come back quoted or weak; compare them bare. */
export function sameEtag(a: string | null | undefined, b: string | null | undefined): boolean {
  const bare = (v: string | null | undefined) => (v ?? "").trim().replace(/^W\//i, "").replace(/^"(.*)"$/, "$1");
  return Boolean(a && b && bare(a) === bare(b));
}

const stamp = (iso: string) => iso.replace(/[:.]/g, "-");
const STAMP = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/;

/**
 * Save the state. With `ifMatch`, the write only lands if nobody saved in
 * between. `previous` is what it replaces: the first save in each hour keeps a
 * copy of it in history, so any hour's changes can be rolled back.
 */
export async function writeState(
  state: unknown,
  ifMatch: string | undefined,
  previous: StoredState | null,
  now = new Date(),
): Promise<{ etag: string; savedAt: string }> {
  const savedAt = now.toISOString();
  const body = JSON.stringify({ savedAt, state } satisfies StoredState);
  let result;
  try {
    result = await put(STATE, body, {
      access: "private",
      allowOverwrite: true,
      addRandomSuffix: false,
      contentType: "application/json",
      ...(ifMatch ? { ifMatch } : {}),
    });
  } catch (e) {
    if (e instanceof BlobPreconditionFailedError || /precondition/i.test(String((e as Error).message))) throw new EtagMismatch();
    throw e;
  }
  if (previous && typeof previous.savedAt === "string" && previous.savedAt.slice(0, 13) !== savedAt.slice(0, 13)) {
    try {
      await put(`${HISTORY}${stamp(previous.savedAt)}.json`, JSON.stringify(previous), {
        access: "private",
        allowOverwrite: true,
        addRandomSuffix: false,
        contentType: "application/json",
      });
      await pruneHistory();
    } catch {
      // The save itself landed; a missed snapshot isn't worth failing it.
    }
  }
  return { etag: result.etag, savedAt };
}

async function pruneHistory() {
  const { blobs } = await list({ prefix: HISTORY, limit: 1000 });
  const old = blobs.sort((a, b) => b.pathname.localeCompare(a.pathname)).slice(KEEP_HISTORY);
  if (old.length) await del(old.map((b) => b.url));
}

/** Snapshots, newest first. `at` is the id; `savedAt` is when that version was saved. */
export async function listHistory(): Promise<{ at: string; savedAt: string; size: number }[]> {
  const { blobs } = await list({ prefix: HISTORY, limit: 1000 });
  return blobs
    .map((b) => ({ at: b.pathname.slice(HISTORY.length, -5), size: b.size }))
    .filter(({ at }) => STAMP.test(at))
    .map(({ at, size }) => ({ at, savedAt: `${at.slice(0, 13)}:${at.slice(14, 16)}:${at.slice(17, 19)}.${at.slice(20, 23)}Z`, size }))
    .sort((a, b) => b.at.localeCompare(a.at));
}

export async function readHistory(at: string) {
  if (!STAMP.test(at)) return null;
  return readJson(`${HISTORY}${at}.json`);
}

export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function photoPath(hash: string, ext: string) {
  return `${PHOTOS}${hash}.${ext}`;
}

/** Store a photo under its own hash. Uploading the same photo twice is a no-op. */
export async function writePhoto(hash: string, bytes: Uint8Array, contentType: string): Promise<void> {
  const ext = PHOTO_TYPES[contentType];
  if (!ext) throw new Error("Unsupported image type");
  const path = photoPath(hash, ext);
  try {
    await head(path);
    return;
  } catch {
    // Not stored yet.
  }
  await put(path, Buffer.from(bytes), { access: "private", allowOverwrite: false, addRandomSuffix: false, contentType });
}

export async function readPhoto(hash: string) {
  for (const ext of Object.values(PHOTO_TYPES)) {
    const result = await get(photoPath(hash, ext), { access: "private" });
    if (result && result.statusCode === 200) return { stream: result.stream, contentType: result.blob.contentType ?? "application/octet-stream" };
  }
  return null;
}
