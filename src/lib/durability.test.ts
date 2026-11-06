import { unzipSync, strFromU8 } from "fflate";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildArchive, csvField, readArchive, sniffImageType, type Photo } from "./archive";
import { emptyPersonal, type PersonalState } from "./db";
import { makeItem } from "./kinds";
import { canSend, checkChallenge, newChallenge } from "@/server/accounts";
import { signInEmail } from "@/server/mail";
import { decodeSession, encodeSession, sameOrigin } from "@/server/session";
import { judgeSave, keepsHistory, type StoredWardrobe } from "@/server/wardrobe";
import { allowanceFor, saveFailure, userTagKey, validEmail } from "./account";
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

// The tagging route with sign-in and the spend store stubbed at the boundary.
const ai = vi.hoisted(() => ({ caller: null as { id: string; email: string | null } | null, count: 0, uncounted: 0, reserved: 0 }));
vi.mock("@/server/auth", () => ({ callerFrom: async () => ai.caller }));
vi.mock("@/server/budget", async () => {
  const actual = await vi.importActual<typeof import("@/server/budget")>("@/server/budget");
  return {
    ...actual,
    budgetConfig: () => ({ url: "https://kv.test", token: "t", capUsd: 3, inputUsdPerMTok: 5, outputUsdPerMTok: 25 }),
    countInWindow: async () => ++ai.count,
    uncount: async () => {
      ai.uncounted += 1;
      ai.count -= 1;
    },
    readCount: async () => ai.count,
    spentThisMonth: async () => 0,
    // Refusing the reservation stops the route before it would call Claude.
    reserve: async () => {
      ai.reserved += 1;
      return null;
    },
    settle: async () => undefined,
  };
});

describe("AI tagging allowance", () => {
  const PIXEL = "data:image/png;base64,iVBORw0KGgo=";
  const post = async () => {
    const { POST } = await import("@/app/api/tag/route");
    const res = await POST(new Request("http://x/api/tag", { method: "POST", headers: { origin: "http://x" }, body: JSON.stringify({ image: PIXEL }) }));
    return { status: res.status, json: (await res.json()) as Record<string, unknown> };
  };

  beforeEach(() => {
    ai.caller = { id: "11111111-1111-1111-1111-111111111111", email: "someone@example.com" };
    ai.count = 0;
    ai.uncounted = 0;
    ai.reserved = 0;
    process.env.ANTHROPIC_API_KEY = "test";
    process.env.OOTD_AI_TAGS_PER_MONTH = "2";
    process.env.OOTD_OWNER_EMAILS = "owner@example.com";
  });
  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OOTD_AI_TAGS_PER_MONTH;
    delete process.env.OOTD_OWNER_EMAILS;
  });

  it("needs a signed-in caller", async () => {
    ai.caller = null;
    expect((await post()).status).toBe(401);
  });

  it("stops at the monthly allowance and doesn't charge refused or failed calls", async () => {
    // Under the allowance, the call goes on to the overall cap (refused here), and is given back.
    expect((await post()).status).toBe(402);
    expect(ai.reserved).toBe(1);
    expect(ai.count).toBe(0);
    ai.count = 2;
    const over = await post();
    expect(over.status).toBe(402);
    expect(String(over.json.error)).toMatch(/2 AI tags/);
    expect(ai.reserved).toBe(1);
    expect(ai.count).toBe(2);
  });

  it("gives owners no per-person limit", async () => {
    ai.caller = { id: "22222222-2222-2222-2222-222222222222", email: "Owner@Example.com" };
    ai.count = 50;
    await post();
    expect(ai.reserved).toBe(1);
    expect(ai.count).toBe(50);
  });

  it("reports what's left to the signed-in caller", async () => {
    const { GET } = await import("@/app/api/tag/route");
    ai.count = 1;
    const res = await GET(new Request("http://x/api/tag"));
    expect(await res.json()).toEqual({ configured: true, limit: 2, used: 1 });
  });
});

describe("account helpers", () => {
  it("reads save errors from the wardrobe API", () => {
    expect(saveFailure({ code: "OD409", details: "12" })).toEqual({ kind: "conflict", remotePieces: 12 });
    expect(saveFailure({ code: "OD410", details: "40" })).toEqual({ kind: "shrink", remotePieces: 40 });
    expect(saveFailure({ code: "28000" }).kind).toBe("signed-out");
    expect(saveFailure({ code: "OD413", message: "too big" })).toEqual({ kind: "rejected", message: "too big" });
    expect(saveFailure({ code: "XX000" }).kind).toBe("retry");
    expect(saveFailure(null).kind).toBe("retry");
  });

  it("sets the AI allowance from the environment", () => {
    expect(allowanceFor("a@b.co", {})).toBe(20);
    expect(allowanceFor("a@b.co", { OOTD_AI_TAGS_PER_MONTH: "5" })).toBe(5);
    expect(allowanceFor("a@b.co", { OOTD_AI_TAGS_PER_MONTH: "-1" })).toBe(20);
    expect(allowanceFor("Me@X.com", { OOTD_OWNER_EMAILS: "other@x.com, me@x.com" })).toBeNull();
    expect(allowanceFor(null, { OOTD_OWNER_EMAILS: "me@x.com" })).toBe(20);
    expect(userTagKey("u1", new Date("2026-11-05T10:00:00Z"))).toBe("ootd:ai:tags:u1:2026-11");
    expect(validEmail("alex@example.com")).toBe(true);
    expect(validEmail("alex@example")).toBe(false);
  });
});

describe("sign-in", () => {
  const SECRET = "s".repeat(48);
  const NOW = 1_800_000_000_000;

  it("accepts the right code or link once, within 15 minutes", () => {
    const { code, token, challenge } = newChallenge(SECRET, "Alex@Example.com ", null, NOW);
    expect(code).toMatch(/^\d{6}$/);
    // Stored only as keyed hashes.
    expect(JSON.stringify(challenge)).not.toContain(code);
    expect(JSON.stringify(challenge)).not.toContain(token);
    const byCode = checkChallenge(SECRET, "alex@example.com", challenge, { code }, NOW + 60_000);
    expect(byCode.ok).toBe(true);
    // Used up: neither proof works again.
    expect(checkChallenge(SECRET, "alex@example.com", byCode.challenge!, { code }, NOW + 61_000).ok).toBe(false);
    expect(checkChallenge(SECRET, "alex@example.com", byCode.challenge!, { token }, NOW + 61_000).ok).toBe(false);
    expect(checkChallenge(SECRET, "alex@example.com", challenge, { token }, NOW + 60_000).ok).toBe(true);
    expect(checkChallenge(SECRET, "alex@example.com", challenge, { code }, NOW + 16 * 60_000).ok).toBe(false);
  });

  it("locks a challenge after five wrong codes and rejects another key", () => {
    const { code, challenge } = newChallenge(SECRET, "a@b.co", null, NOW);
    let c = challenge;
    for (let i = 0; i < 5; i++) {
      const r = checkChallenge(SECRET, "a@b.co", c, { code: code === "000000" ? "111111" : "000000" }, NOW);
      expect(r.ok).toBe(false);
      c = r.challenge!;
    }
    expect(checkChallenge(SECRET, "a@b.co", c, { code }, NOW).ok).toBe(false);
    expect(checkChallenge("x".repeat(48), "a@b.co", challenge, { code }, NOW).ok).toBe(false);
    expect(checkChallenge(SECRET, "someone@else.co", challenge, { code }, NOW).ok).toBe(false);
  });

  it("limits sign-in emails per address", () => {
    expect(canSend(null, NOW).ok).toBe(true);
    const once = newChallenge(SECRET, "a@b.co", null, NOW).challenge;
    expect(canSend(once, NOW + 10_000).ok).toBe(false);
    expect(canSend(once, NOW + 60_000).ok).toBe(true);
    const busy = { ...once, sent: [0, 1, 2, 3, 4].map((i) => NOW - i * 120_000) };
    expect(canSend(busy, NOW + 60_000).ok).toBe(false);
    expect(canSend(busy, NOW + 3_700_000).ok).toBe(true);
  });

  it("signs sessions that can't be forged or outlive their date", () => {
    const token = encodeSession({ id: "11111111-1111-1111-1111-111111111111", email: "a@b.co" }, SECRET, NOW);
    expect(decodeSession(token, SECRET, NOW + 1000)?.email).toBe("a@b.co");
    expect(decodeSession(token, "y".repeat(48), NOW)).toBeNull();
    expect(decodeSession(token, SECRET, NOW + 181 * 86_400_000)).toBeNull();
    const [payload, mac] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ id: "x", email: "evil@x.co", exp: NOW * 2 })).toString("base64url");
    expect(decodeSession(`${forged}.${mac}`, SECRET, NOW)).toBeNull();
    expect(decodeSession(`${payload}.`, SECRET, NOW)).toBeNull();
  });

  it("only accepts state changes from OOTD's own pages", () => {
    expect(sameOrigin(new Request("https://ootd.test/api/x", { method: "POST", headers: { origin: "https://ootd.test" } }))).toBe(true);
    expect(sameOrigin(new Request("https://ootd.test/api/x", { method: "POST", headers: { origin: "https://evil.test" } }))).toBe(false);
    expect(sameOrigin(new Request("https://ootd.test/api/x", { method: "POST" }))).toBe(false);
  });

  it("escapes the sign-in email", () => {
    const { html, subject } = signInEmail('https://ootd.test/x?a=1&b="2"', "123456");
    expect(subject).toBe("123456 is your OOTD sign-in code");
    expect(html).toContain("a=1&amp;b=&quot;2&quot;");
  });
});

describe("saving a wardrobe", () => {
  const stored = (pieces: number): { value: StoredWardrobe; etag: string } => ({
    value: { savedAt: "2026-11-06T10:15:00.000Z", pieces, snapshots: 0, state: { items: [] } },
    etag: "e1",
  });

  it("needs the version it replaces, and won't empty or halve a wardrobe unless forced", () => {
    expect(judgeSave(null, 3, null, false).ok).toBe(true);
    expect(judgeSave(stored(10), 11, "e1", false).ok).toBe(true);
    expect(judgeSave(stored(10), 11, "e0", false)).toEqual({ ok: false, code: "OD409" });
    expect(judgeSave(stored(10), 11, null, false)).toEqual({ ok: false, code: "OD409" });
    expect(judgeSave(stored(10), 0, "e1", false)).toEqual({ ok: false, code: "OD410" });
    expect(judgeSave(stored(10), 4, "e1", false)).toEqual({ ok: false, code: "OD410" });
    expect(judgeSave(stored(10), 5, "e1", false).ok).toBe(true);
    expect(judgeSave(stored(10), 0, null, true).ok).toBe(true);
  });

  it("keeps a history copy before each hour's first change and every forced save", () => {
    expect(keepsHistory("2026-11-06T10:15:00.000Z", new Date("2026-11-06T10:50:00.000Z"), false)).toBe(false);
    expect(keepsHistory("2026-11-06T10:15:00.000Z", new Date("2026-11-06T11:01:00.000Z"), false)).toBe(true);
    expect(keepsHistory("2026-11-06T10:15:00.000Z", new Date("2026-11-06T10:20:00.000Z"), true)).toBe(true);
  });
});
