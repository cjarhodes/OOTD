import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Vercel Blob as production behaves: the API states a version as "<hash>"
 * and put's ifMatch accepts only that, while a download over about 1 KB comes
 * through a compressing CDN with the weak form W/"<hash>". Before the fix,
 * any wardrobe big enough to be compressed could never be saved again.
 */
const objects = new Map<string, { body: string; etag: string }>();

vi.mock("@vercel/blob", () => {
  class BlobPreconditionFailedError extends Error {}
  class BlobNotFoundError extends Error {}
  const etagOf = (body: string) => `"${createHash("sha1").update(body).digest("hex")}"`;
  return {
    BlobPreconditionFailedError,
    BlobNotFoundError,
    head: async (path: string) => {
      const o = objects.get(path);
      if (!o) throw new BlobNotFoundError("The requested blob does not exist");
      return { etag: o.etag };
    },
    get: async (path: string) => {
      const o = objects.get(path);
      if (!o) return null;
      const weak = o.body.length > 1024 ? `W/${o.etag}` : o.etag;
      return { statusCode: 200, stream: new Response(o.body).body, blob: { etag: weak } };
    },
    put: async (path: string, body: string, opts: { allowOverwrite?: boolean; ifMatch?: string }) => {
      const o = objects.get(path);
      if (o && opts.allowOverwrite === false) throw new Error("This blob already exists");
      if (opts.ifMatch && (!o || o.etag !== opts.ifMatch)) throw new BlobPreconditionFailedError("Precondition failed");
      const etag = etagOf(body + Math.random());
      objects.set(path, { body, etag });
      return { etag };
    },
    del: async () => {},
    list: async () => ({ blobs: [], hasMore: false }),
  };
});

const { saveWardrobe, readWardrobe } = await import("./wardrobe");
const { bareEtag, sameEtag } = await import("./store");

const UID = "11111111-2222-3333-4444-555555555555";
const state = (n: number) => ({ version: 1, items: Array.from({ length: n }, (_, i) => ({ id: `piece-${i}`, name: `A fairly long piece name number ${i}` })) });

describe("saving a wardrobe to Blob", () => {
  beforeEach(() => {
    objects.clear();
    delete process.env.OOTD_FAKE_BLOB_DIR;
  });

  it("keeps saving once the wardrobe is big enough for the CDN to weaken its ETag", async () => {
    let saved = await saveWardrobe(UID, state(3), null, false);
    expect(saved.ok).toBe(true);
    // Each later save names the version the last one returned, as a device does.
    for (const n of [10, 40, 43]) {
      const next = await saveWardrobe(UID, state(n), saved.ok ? saved.etag : null, false);
      expect(next).toMatchObject({ ok: true, pieces: n });
      saved = next;
    }
    // A device that read the wardrobe can save against the version it was given.
    const read = await readWardrobe(UID);
    expect(read!.value.pieces).toBe(43);
    expect(await saveWardrobe(UID, state(44), read!.etag, false)).toMatchObject({ ok: true, pieces: 44 });
  });

  it("still refuses a save made against an older version", async () => {
    const first = await saveWardrobe(UID, state(40), null, false);
    await saveWardrobe(UID, state(41), first.ok ? first.etag : null, false);
    expect(await saveWardrobe(UID, state(42), first.ok ? first.etag : null, false)).toMatchObject({ ok: false, code: "OD409" });
  });

  it("lands a forced save whatever version the device holds", async () => {
    // The account already holds a wardrobe big enough to be compressed.
    await saveWardrobe(UID, state(30), null, false);
    expect(await saveWardrobe(UID, state(40), '"stale"', true)).toMatchObject({ ok: true, pieces: 40 });
    expect((await readWardrobe(UID))!.value.pieces).toBe(40);
  });

  it("reads an etag in any form as the same version", () => {
    expect(bareEtag('W/"abc"')).toBe("abc");
    expect(sameEtag('"abc"', 'W/"abc"')).toBe(true);
    expect(sameEtag("abc", '"abc"')).toBe(true);
    expect(sameEtag('"abc"', '"abd"')).toBe(false);
    expect(sameEtag(null, '"abc"')).toBe(false);
  });
});
