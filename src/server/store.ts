import { BlobPreconditionFailedError, get, head, list, put } from "@vercel/blob";
import { fakeCount, fakeDir, fakeRead, fakeWrite } from "./fake-store";

/**
 * Private Vercel Blob storage: accounts, sign-in challenges, wardrobes and
 * photos all live in one private store connected to the project (which sets
 * BLOB_READ_WRITE_TOKEN). Nothing here is ever served publicly.
 */
export function storeConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.BLOB_READ_WRITE_TOKEN || (env.BLOB_STORE_ID && env.VERCEL_OIDC_TOKEN) || env.OOTD_FAKE_BLOB_DIR);
}

export class Conflict extends Error {}

export async function readJson<T>(path: string): Promise<{ value: T; etag: string } | null> {
  if (fakeDir()) {
    const f = fakeRead(path);
    return f ? { value: JSON.parse(f.bytes.toString()) as T, etag: f.etag } : null;
  }
  const result = await get(path, { access: "private", useCache: false });
  if (!result || result.statusCode !== 200) return null;
  const text = await new Response(result.stream).text();
  return { value: JSON.parse(text) as T, etag: result.blob.etag };
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
