import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * A file-backed stand-in for Vercel Blob, used only when OOTD_FAKE_BLOB_DIR
 * is set (local end-to-end tests). Same semantics as the real store:
 * etags, conditional writes, create-only writes, and content types.
 */
export function fakeDir(): string | null {
  return process.env.OOTD_FAKE_BLOB_DIR || null;
}

const file = (path: string) => join(fakeDir()!, path);
const etagOf = (bytes: Buffer) => `"${createHash("sha1").update(bytes).digest("hex")}"`;

export function fakeRead(path: string): { bytes: Buffer; etag: string; contentType: string } | null {
  if (!existsSync(file(path))) return null;
  const bytes = readFileSync(file(path));
  const contentType = existsSync(`${file(path)}.type`) ? readFileSync(`${file(path)}.type`, "utf8") : "application/octet-stream";
  return { bytes, etag: etagOf(bytes), contentType };
}

/** Returns the new etag, or null when the condition fails. */
export function fakeWrite(path: string, bytes: Buffer, contentType: string, opts: { ifMatch?: string; create?: boolean }): string | null {
  const current = fakeRead(path);
  if (opts.create && current) return null;
  if (opts.ifMatch && current?.etag !== opts.ifMatch) return null;
  mkdirSync(dirname(file(path)), { recursive: true });
  writeFileSync(file(path), bytes);
  writeFileSync(`${file(path)}.type`, contentType);
  return etagOf(bytes);
}

export function fakeCount(prefix: string): number {
  const dir = file(prefix);
  if (!existsSync(dir)) return 0;
  return readdirSync(dir).filter((n) => !n.endsWith(".type")).length;
}
