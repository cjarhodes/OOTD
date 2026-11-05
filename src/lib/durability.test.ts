import { unzipSync, strFromU8 } from "fflate";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildArchive, csvField, readArchive, sniffImageType, type Photo } from "./archive";
import { emptyPersonal, type PersonalState } from "./db";
import { makeItem } from "./kinds";
import { canonicalJson, decide, fingerprint, retryDelay } from "./sync";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);
const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 9, 9, 9]);
const HASH = "a".repeat(64);

function wardrobe(): { state: PersonalState; photos: Map<string, Photo> } {
  const tee = makeItem({ id: "i-1", name: "White tee, \"heavy\"", kind: "tee", color: "White", photoHash: HASH });
  const coat = makeItem({ id: "i-2", name: "=Navy chore coat", kind: "chore-coat", color: "Navy" });
  const state: PersonalState = {
    ...emptyPersonal(),
    items: [tee, coat],
    wears: [
      { date: "2026-11-01", itemIds: ["i-1", "i-2"], occasion: "office" },
      { date: "2026-11-03", itemIds: ["i-1"] },
    ],
    plans: { "2026-11-06": { date: "2026-11-06", itemIds: ["i-1"], occasion: "office", tier: "fresh" } },
  };
  const photos = new Map<string, Photo>([
    ["i-1", { bytes: PNG, type: "image/png" }],
    ["i-2", { bytes: JPG, type: "" }],
  ]);
  return { state, photos };
}

describe("portable export", () => {
  it("is a ZIP of plain files anyone can open", () => {
    const { state, photos } = wardrobe();
    const files = unzipSync(buildArchive(state, photos, "2026-11-05T10:00:00.000Z"));
    const names = Object.keys(files).sort();
    expect(names).toContain("README.txt");
    expect(names).toContain("wardrobe.csv");
    expect(names).toContain("wears.csv");
    expect(names).toContain("wardrobe.json");
    expect(names.filter((n) => n.startsWith("photos/"))).toHaveLength(2);
    // Types come from the bytes when the blob lost its type.
    expect(names.some((n) => /^photos\/navy-chore-coat-.*\.jpg$/.test(n))).toBe(true);
    expect(names.some((n) => /^photos\/white-tee-heavy-aaaaaaaa\.png$/.test(n))).toBe(true);

    const csv = strFromU8(files["wardrobe.csv"]!).replace(/^﻿/, "").trim().split("\r\n");
    expect(csv[0]).toMatch(/^id,name,kind,kind_label,slot,color,/);
    expect(csv).toHaveLength(3);
    expect(csv[1]).toContain('"White tee, ""heavy"""');
    expect(csv[1]).toMatch(/,2,2026-11-03$/);
    // A name that looks like a formula is defused for spreadsheets.
    expect(csv[2]).toContain("'=Navy chore coat");
    const wears = strFromU8(files["wears.csv"]!).replace(/^﻿/, "").trim().split("\r\n");
    expect(wears[1]).toBe('2026-11-01,office,i-1 i-2,"White tee, ""heavy""; =Navy chore coat"');
  });

  it("restores exactly what it exported, photos included", () => {
    const { state, photos } = wardrobe();
    const read = readArchive(buildArchive(state, photos));
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    expect(read.state.items.map((i) => i.id)).toEqual(["i-1", "i-2"]);
    expect(read.state.items[0]?.photoHash).toBe(HASH);
    expect(read.state.wears).toHaveLength(2);
    expect(read.state.plans["2026-11-06"]?.itemIds).toEqual(["i-1"]);
    expect([...read.photos.get("i-1")!.bytes]).toEqual([...PNG]);
    expect(read.photos.get("i-2")?.type).toBe("image/jpeg");
  });

  it("still reads an export that was unzipped and zipped again inside a folder", async () => {
    const { zipSync } = await import("fflate");
    const { state, photos } = wardrobe();
    const inner = unzipSync(buildArchive(state, photos));
    const nested = zipSync(Object.fromEntries(Object.entries(inner).map(([k, v]) => [`OOTD export/${k}`, v])));
    const read = readArchive(nested);
    expect(read.ok && read.photos.size).toBe(2);
  });

  it("reads the earlier single-file JSON backup", () => {
    const { state } = wardrobe();
    const legacy = {
      app: "ootd",
      version: 1,
      exportedAt: "2026-10-01T00:00:00.000Z",
      state,
      images: { "i-1": `data:image/png;base64,${Buffer.from(PNG).toString("base64")}` },
    };
    const read = readArchive(new TextEncoder().encode(JSON.stringify(legacy)));
    expect(read.ok).toBe(true);
    if (read.ok) expect([...read.photos.get("i-1")!.bytes]).toEqual([...PNG]);
  });

  it("refuses damaged or foreign files without touching anything", () => {
    expect(readArchive(new TextEncoder().encode("hello")).ok).toBe(false);
    expect(readArchive(new Uint8Array([0x50, 0x4b, 3, 4, 0, 0])).ok).toBe(false);
    const { state, photos } = wardrobe();
    const files = unzipSync(buildArchive(state, photos));
    const photo = Object.keys(files).find((n) => n.startsWith("photos/"))!;
    delete files[photo];
    return import("fflate").then(({ zipSync }) => {
      const read = readArchive(zipSync(files));
      expect(read.ok).toBe(false);
      if (!read.ok) expect(read.error).toMatch(/missing/);
    });
  });

  it("quotes CSV fields only when needed and sniffs image types", () => {
    expect(csvField("plain")).toBe("plain");
    expect(csvField("a,b")).toBe('"a,b"');
    expect(csvField("-1")).toBe("'-1");
    expect(csvField(undefined)).toBe("");
    expect(sniffImageType(PNG)).toBe("image/png");
    expect(sniffImageType(JPG)).toBe("image/jpeg");
    expect(sniffImageType(new Uint8Array([1, 2, 3]))).toBeNull();
  });
});

describe("cloud sync rules", () => {
  const remote = { etag: "e1", savedAt: "2026-11-05T09:00:00.000Z", pieces: 10 };
  const mark = { etag: "e1", savedAt: remote.savedAt, fingerprint: "f1" };

  it("fingerprints ignore key order and undefined fields", () => {
    expect(canonicalJson({ b: 1, a: [1, { d: 2, c: undefined }] })).toBe('{"a":[1,{"d":2}],"b":1}');
    expect(fingerprint({ a: 1, b: 2 })).toBe(fingerprint({ b: 2, a: 1 }));
    expect(fingerprint({ a: 1 })).not.toBe(fingerprint({ a: 2 }));
  });

  it("pushes the first backup and changes the cloud hasn't moved past", () => {
    expect(decide({ localPieces: 3, localFingerprint: "x", mark: null, remote: null })).toBe("push");
    expect(decide({ localPieces: 0, localFingerprint: "x", mark: null, remote: null })).toBe("idle");
    expect(decide({ localPieces: 10, localFingerprint: "f2", mark, remote })).toBe("push");
    expect(decide({ localPieces: 10, localFingerprint: "f1", mark, remote })).toBe("idle");
  });

  it("takes a newer cloud copy only when this device hasn't changed", () => {
    const moved = { ...remote, etag: "e2" };
    expect(decide({ localPieces: 10, localFingerprint: "f1", mark, remote: moved })).toBe("pull");
    expect(decide({ localPieces: 11, localFingerprint: "f2", mark, remote: moved })).toBe("conflict");
  });

  it("offers a restore to an empty device and never overwrites a backup with it", () => {
    expect(decide({ localPieces: 0, localFingerprint: "empty", mark: null, remote })).toBe("offer-restore");
  });

  it("asks when a device that never synced already has pieces", () => {
    expect(decide({ localPieces: 4, localFingerprint: "x", mark: null, remote })).toBe("conflict");
    expect(decide({ localPieces: 4, localFingerprint: "x", mark: null, remote: { ...remote, pieces: 0 } })).toBe("push");
  });

  it("backs off between retries", () => {
    expect(retryDelay(1)).toBe(15_000);
    expect(retryDelay(2)).toBe(30_000);
    expect(retryDelay(20)).toBe(600_000);
  });
});

// The state route with storage and the owner cookie stubbed at the boundary.
const store = vi.hoisted(() => ({ current: null as { value: { savedAt: string; state: unknown }; etag: string } | null, writes: 0 }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: "session" }) }) }));
vi.mock("@/server/owner", () => ({ OWNER_COOKIE: "ootd_owner", ownerConfigured: () => true, verifySession: () => true }));
vi.mock("@/server/cloud", async () => {
  const actual = await vi.importActual<typeof import("@/server/cloud")>("@/server/cloud");
  return {
    ...actual,
    cloudConfigured: () => true,
    readState: async () => store.current,
    writeState: async (state: unknown, ifMatch: string | undefined) => {
      if (store.current && ifMatch !== store.current.etag) throw new actual.EtagMismatch();
      store.writes += 1;
      const savedAt = new Date().toISOString();
      store.current = { value: { savedAt, state }, etag: `e${store.writes}` };
      return { etag: store.current.etag, savedAt };
    },
  };
});

describe("cloud state route", () => {
  const pieces = (n: number) => ({ ...emptyPersonal(), items: Array.from({ length: n }, (_, i) => makeItem({ id: `i-${i}`, name: `Tee ${i}`, kind: "tee", color: "White" })) });
  const put = async (body: unknown) => {
    const { PUT } = await import("@/app/api/cloud/state/route");
    const res = await PUT(new Request("http://x/api/cloud/state", { method: "PUT", body: JSON.stringify(body) }));
    return { status: res.status, json: (await res.json()) as Record<string, unknown> };
  };

  beforeEach(() => {
    store.current = null;
    store.writes = 0;
  });
  afterEach(() => vi.clearAllMocks());

  it("saves the first backup and then only changes that name the version they replace", async () => {
    const first = await put({ state: pieces(10) });
    expect(first.status).toBe(200);
    expect((await put({ state: pieces(11) })).status).toBe(412);
    expect((await put({ state: pieces(11), ifMatch: "wrong" })).status).toBe(412);
    const next = await put({ state: pieces(11), ifMatch: first.json.etag });
    expect(next.status).toBe(200);
    expect(store.writes).toBe(2);
  });

  it("refuses to replace a backup with an empty or much smaller one unless forced", async () => {
    const first = await put({ state: pieces(10) });
    const empty = await put({ state: pieces(0), ifMatch: first.json.etag });
    expect(empty.status).toBe(409);
    expect(empty.json.remotePieces).toBe(10);
    expect((await put({ state: pieces(4), ifMatch: first.json.etag })).status).toBe(409);
    // Losing a few pieces is ordinary editing.
    expect((await put({ state: pieces(6), ifMatch: first.json.etag })).status).toBe(200);
    expect((await put({ state: pieces(0), force: true })).status).toBe(200);
  });

  it("rejects state that isn't a valid wardrobe", async () => {
    expect((await put({ state: { items: [{ id: 1 }] } })).status).toBe(400);
    expect(store.writes).toBe(0);
  });
});
