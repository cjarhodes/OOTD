import { BlobNotFoundError, BlobPreconditionFailedError, del, get, head, list, put } from "@vercel/blob";
import { fakeCount, fakeDir, fakeRead, fakeRemove, fakeWrite } from "./fake-store";

/**
 * Private Vercel Blob storage: accounts, sign-in challenges, wardrobes and
 * photos all live in one private store connected to the project (which sets
 * BLOB_READ_WRITE_TOKEN). Nothing here is ever served publicly.
 */
export function storeConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.BLOB_READ_WRITE_TOKEN || (env.BLOB_STORE_ID && env.VERCEL_OIDC_TOKEN) || env.OOTD_FAKE_BLOB_DIR);
}

export class Conflict extends Error {}

/**
 * One form for an etag however it arrived: no weak prefix, no quotes. A CDN
 * that compresses a download (anything over about 1 KB, so any real
 * wardrobe) weakens its ETag to W/"…", which never matches a write's ifMatch.
 */
export function bareEtag(etag: string): string {
  return etag
    .trim()
    .replace(/^W\//i, "")
    .replace(/^"(.*)"$/, "$1");
}

export function sameEtag(a: string | null | undefined, b: string | null | undefined): boolean {
  return Boolean(a && b && bareEtag(a) === bareEtag(b));
}

/** The version as the Blob API states it (what put returns and ifMatch expects), or null if missing. */
async function apiEtag(path: string): Promise<string | null> {
  try {
    return (await head(path)).etag;
  } catch (e) {
    if (e instanceof BlobNotFoundError || /not.?found|does not exist/i.test(String((e as Error).message))) return null;
    throw e;
  }
}

/** Read JSON that will never be written back conditionally (history copies): one download. */
export async function readValue<T>(path: string): Promise<T | null> {
  if (fakeDir()) {
    const f = fakeRead(path);
    return f ? (JSON.parse(f.bytes.toString()) as T) : null;
  }
  const result = await get(path, { access: "private", useCache: false });
  if (!result || result.statusCode !== 200) return null;
  return JSON.parse(await new Response(result.stream).text()) as T;
}

/**
 * Read JSON with the version a conditional write can name. The content comes
 * from a download, the version from the API, checked either side of it so the
 * two always belong together.
 */
export async function readJson<T>(path: string): Promise<{ value: T; etag: string } | null> {
  if (fakeDir()) {
    const f = fakeRead(path);
    return f ? { value: JSON.parse(f.bytes.toString()) as T, etag: f.etag } : null;
  }
  for (let attempt = 0; ; attempt++) {
    const before = await apiEtag(path);
    if (!before) return null;
    const result = await get(path, { access: "private", useCache: false });
    if (!result || result.statusCode !== 200) return null;
    const text = await new Response(result.stream).text();
    const after = await apiEtag(path);
    // Nobody wrote while it downloaded (the download's own ETag agrees too, weak or not).
    if (after && sameEtag(before, after) && (!result.blob.etag || sameEtag(result.blob.etag, before) || attempt >= 2)) {
      return { value: JSON.parse(text) as T, etag: before };
    }
    if (attempt >= 4) throw new Error(`${path} kept changing while it was read`);
  }
}

/**
 * Write JSON. `ifMatch` only lands if nobody wrote in between; `create`
 * only lands if nothing is there yet. Either failing throws Conflict.
 */
export async function writeJson(path: string, value: unknown, opts: { ifMatch?: string; create?: boolean } = {}): Promise<string> {
  if (fakeDir()) {
    const etag = fakeWrite(path, Buffer.from(JSON.stringify(value)), "application/json", opts);
    if (!etag) throw new Conflict();
    return etag;
  }
  try {
    const result = await put(path, JSON.stringify(value), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: !opts.create,
      contentType: "application/json",
      ...(opts.ifMatch ? { ifMatch: opts.ifMatch } : {}),
    });
    return result.etag;
  } catch (e) {
    const message = String((e as Error).message ?? "");
    if (e instanceof BlobPreconditionFailedError || /precondition|already exists/i.test(message)) throw new Conflict();
    throw e;
  }
}

export async function exists(path: string): Promise<boolean> {
  if (fakeDir()) return fakeRead(path) !== null;
  try {
    await head(path);
    return true;
  } catch {
    return false;
  }
}

export async function countUnder(prefix: string): Promise<number> {
  if (fakeDir()) return fakeCount(prefix);
  let count = 0;
  let cursor: string | undefined;
  do {
    const page = await list({ prefix, limit: 1000, cursor });
    count += page.blobs.length;
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return count;
}

export async function writeBytes(path: string, bytes: Uint8Array, contentType: string): Promise<void> {
  if (fakeDir()) {
    if (!fakeWrite(path, Buffer.from(bytes), contentType, { create: true })) throw new Error("already exists");
    return;
  }
  await put(path, Buffer.from(bytes), { access: "private", addRandomSuffix: false, allowOverwrite: false, contentType });
}

export async function readBytes(path: string): Promise<{ stream: ReadableStream<Uint8Array>; contentType: string } | null> {
  if (fakeDir()) {
    const f = fakeRead(path);
    return f ? { stream: new Response(new Uint8Array(f.bytes)).body!, contentType: f.contentType } : null;
  }
  const result = await get(path, { access: "private" });
  if (!result || result.statusCode !== 200) return null;
  return { stream: result.stream, contentType: result.blob.contentType ?? "application/octet-stream" };
}

/** Remove one object. Removing something already gone is fine. */
export async function removeOne(path: string): Promise<void> {
  if (fakeDir()) {
    fakeRemove(path);
    return;
  }
  const page = await list({ prefix: path, limit: 10 });
  const match = page.blobs.filter((b) => b.pathname === path).map((b) => b.url);
  if (match.length) await del(match);
}

/** Remove everything under a prefix (which must end in "/"). Returns how many objects went. */
export async function removeUnder(prefix: string): Promise<number> {
  if (!prefix.endsWith("/")) throw new Error("removeUnder needs a folder prefix");
  if (fakeDir()) return fakeRemove(prefix);
  let removed = 0;
  let cursor: string | undefined;
  do {
    const page = await list({ prefix, limit: 1000, cursor });
    if (page.blobs.length) await del(page.blobs.map((b) => b.url));
    removed += page.blobs.length;
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return removed;
}
