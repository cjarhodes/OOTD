import { describe, expect, it } from "vitest";
import { budgetConfig, costOf, monthKey, reserve, settle } from "@/server/budget";
import { createSession, ownerConfigured, passphraseMatches, verifySession } from "@/server/owner";
import { parseBackup } from "./backup";
import { parseArchive, parseForecast } from "./forecast";
import { makeItem } from "./kinds";
import { nearestColor } from "./palette";
import { alphaInfo, dominantColor, isCutout } from "./pixels";
import { applyTags, validateTags } from "./tagging";

function image(width: number, height: number, fill: (x: number, y: number) => [number, number, number, number]) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) data.set(fill(x, y), (y * width + x) * 4);
  return { data, width, height };
}

describe("cut-out pixels", () => {
  const navySquare = image(40, 40, (x, y) => (x >= 10 && x < 30 && y >= 5 && y < 35 ? [31, 42, 58, 255] : [0, 0, 0, 0]));

  it("finds the subject's bounds and the transparent share", () => {
    const info = alphaInfo(navySquare);
    expect(info.bounds).toEqual({ x: 10, y: 5, width: 20, height: 30 });
    expect(info.transparent).toBeCloseTo(1 - 600 / 1600);
    expect(isCutout(info)).toBe(true);
  });

  it("treats an opaque photo as not a cut-out", () => {
    expect(isCutout(alphaInfo(image(10, 10, () => [200, 200, 200, 255])))).toBe(false);
  });

  it("names the garment colour and ignores transparent background", () => {
    expect(dominantColor(navySquare, true).name).toBe("Navy");
  });

  it("samples the centre of an opaque photo", () => {
    const shirtOnWhite = image(40, 40, (x, y) => (x >= 8 && x < 32 && y >= 6 && y < 34 ? [169, 188, 208, 255] : [250, 250, 250, 255]));
    expect(dominantColor(shirtOnWhite, false).name).toBe("Sky");
  });

  it("maps hex values to the nearest palette colour", () => {
    expect(nearestColor("#2f3b2e")).toBe("Loden");
    expect(nearestColor("#f5f3ee")).toBe("White");
  });
});

describe("live forecast parsing", () => {
  it("picks 8am, 1pm and 6pm and skips incomplete days", () => {
    const time = ["2026-11-05T08:00", "2026-11-05T13:00", "2026-11-05T18:00", "2026-11-06T08:00"];
    const days = parseForecast({
      hourly: { time, apparent_temperature: [6.4, 11.6, 8.2, 5], precipitation_probability: [10, 70, 40, 0], wind_speed_10m: [12, 18, 9, 4] },
    });
    expect(Object.keys(days)).toEqual(["2026-11-05"]);
    expect(days["2026-11-05"]).toEqual({
      date: "2026-11-05",
      source: "live",
      morning: { feels: 6, rain: 10, wind: 12 },
      midday: { feels: 12, rain: 70, wind: 18 },
      evening: { feels: 8, rain: 40, wind: 9 },
    });
  });

  it("returns nothing for an empty response", () => {
    expect(parseForecast({})).toEqual({});
  });
});

describe("tag validation", () => {
  it("accepts good tags and fills gaps from the garment type", () => {
    expect(validateTags({ name: " Navy  crewneck ", kind: "crewneck", color: "Navy", formality: 9 })).toEqual({
      name: "Navy crewneck",
      kind: "crewneck",
      color: "Navy",
      material: "knit",
      pattern: "solid",
      formality: 5,
      boldness: 0,
    });
  });

  it("rejects unknown kinds and colours", () => {
    expect(validateTags({ kind: "cape", color: "Navy" })).toBeNull();
    expect(validateTags({ kind: "tee", color: "Chartreuse" })).toBeNull();
    expect(validateTags("nope")).toBeNull();
  });

  it("resets layering defaults when the kind changes", () => {
    const item = makeItem({ id: "x", name: "Mystery", kind: "tee", color: "Grey" });
    const tagged = applyTags(item, { name: "Loden waxed jacket", kind: "waxed-jacket", color: "Loden", material: "waxed", pattern: "solid", formality: 2, boldness: 0 });
    expect(tagged.slot).toBe("outer");
    expect(tagged.thickness).toBe(4);
    expect(tagged.waterproof).toBe(true);
  });
});

describe("owner session", () => {
  const env = { OOTD_OWNER_PASSPHRASE: "correct horse battery staple", OOTD_SESSION_SECRET: "x".repeat(40) } as unknown as NodeJS.ProcessEnv;

  it("checks the passphrase", () => {
    expect(passphraseMatches("correct horse battery staple", env)).toBe(true);
    expect(passphraseMatches("wrong", env)).toBe(false);
    expect(passphraseMatches("anything", {} as NodeJS.ProcessEnv)).toBe(false);
  });

  it("signs sessions that expire and can't be forged", () => {
    const now = 1_800_000_000_000;
    const token = createSession(now, env);
    expect(verifySession(token, now + 1000, env)).toBe(true);
    expect(verifySession(token, now + 91 * 86_400_000, env)).toBe(false);
    const [exp] = token.split(".");
    expect(verifySession(`${Number(exp) + 1}.${token.split(".")[1]}`, now, env)).toBe(false);
    expect(verifySession(token, now, { ...env, OOTD_SESSION_SECRET: "y".repeat(40) })).toBe(false);
  });

  it("derives the signing key from the passphrase when no secret is set", () => {
    const only = { OOTD_OWNER_PASSPHRASE: "correct horse battery staple" } as unknown as NodeJS.ProcessEnv;
    const token = createSession(1_800_000_000_000, only);
    expect(verifySession(token, 1_800_000_000_100, only)).toBe(true);
    // A new passphrase invalidates old sessions.
    expect(verifySession(token, 1_800_000_000_100, { OOTD_OWNER_PASSPHRASE: "a different long passphrase" } as unknown as NodeJS.ProcessEnv)).toBe(false);
    // Too-short passphrases don't enable owner access at all.
    expect(ownerConfigured({ OOTD_OWNER_PASSPHRASE: "short" } as unknown as NodeJS.ProcessEnv)).toBe(false);
  });
});

describe("spending cap", () => {
  const env = { KV_REST_API_URL: "https://kv.example", KV_REST_API_TOKEN: "t", OOTD_AI_MONTHLY_CAP_USD: "1" } as unknown as NodeJS.ProcessEnv;

  function fakeRedis() {
    const store = new Map<string, number>();
    const fetcher = (async (_url: string, init: RequestInit) => {
      const [cmd, key, arg] = JSON.parse(String(init.body)) as [string, string, string];
      let result: unknown = "OK";
      if (cmd === "INCRBYFLOAT") {
        store.set(key, (store.get(key) ?? 0) + Number(arg));
        result = String(store.get(key));
      } else if (cmd === "GET") result = store.has(key) ? String(store.get(key)) : null;
      return new Response(JSON.stringify({ result }));
    }) as typeof fetch;
    return { store, fetcher };
  }

  it("is off without a store and prices usage conservatively", () => {
    expect(budgetConfig({} as NodeJS.ProcessEnv)).toBeNull();
    const cfg = budgetConfig(env)!;
    expect(cfg.capUsd).toBe(1);
    expect(costOf({ input_tokens: 1_000_000, output_tokens: 0 }, cfg)).toBe(5);
    expect(costOf({ input_tokens: 0, output_tokens: 1_000_000 }, cfg)).toBe(25);
  });

  it("reserves, refuses past the cap, and settles to the real cost", async () => {
    const cfg = budgetConfig(env)!;
    const { store, fetcher } = fakeRedis();
    const first = await reserve(cfg, 0.6, fetcher);
    expect(first).not.toBeNull();
    expect(await reserve(cfg, 0.6, fetcher)).toBeNull();
    expect(store.get(monthKey())).toBeCloseTo(0.6);
    await settle(cfg, first!, 0.01, fetcher);
    expect(store.get(monthKey())).toBeCloseTo(0.01);
  });
});

describe("backup restore validation", () => {
  const item = makeItem({ id: "a", name: "Navy crewneck", kind: "crewneck", color: "Navy" });
  const good = {
    app: "ootd",
    version: 1,
    exportedAt: "2026-11-05T10:00:00Z",
    state: {
      version: 1,
      items: [item],
      wears: [{ date: "2026-11-01", itemIds: ["a", "ghost"] }, { date: "bad", itemIds: ["a"] }],
      plans: { "2026-11-06": { date: "2026-11-06", itemIds: ["a"], occasion: "client", tier: "bold" }, "2026-11-07": { itemIds: ["ghost"] } },
      feedback: { a: "love", b: "meh" },
      comfort: "runs-cold",
    },
    images: { a: "data:image/png;base64,iVBORw0KGgo=", ghost: "data:image/png;base64,AAAA" },
  };

  it("keeps valid data and drops references to missing pieces", () => {
    const r = parseBackup(good);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.backup.state.items).toHaveLength(1);
    expect(r.backup.state.wears).toEqual([{ date: "2026-11-01", itemIds: ["a"], occasion: undefined }]);
    expect(Object.keys(r.backup.state.plans)).toEqual(["2026-11-06"]);
    expect(r.backup.state.feedback).toEqual({ a: "love" });
    expect(Object.keys(r.backup.images)).toEqual(["a"]);
  });

  it("rejects other files, damaged pieces and unsafe image URLs", () => {
    expect(parseBackup({ app: "form" }).ok).toBe(false);
    expect(parseBackup({ ...good, state: { ...good.state, items: [{ ...item, kind: "cape" }] } }).ok).toBe(false);
    expect(parseBackup({ ...good, state: { ...good.state, items: [item, item] } }).ok).toBe(false);
    expect(parseBackup({ ...good, images: { a: "javascript:alert(1)" } }).ok).toBe(false);
  });
});

describe("trip weather from last year", () => {
  it("shifts observed weather forward a year and infers rain from precipitation", () => {
    const days = parseArchive({
      hourly: {
        time: ["2025-12-02T08:00", "2025-12-02T13:00", "2025-12-02T18:00"],
        apparent_temperature: [1.2, 5.6, 3.1],
        precipitation: [0, 1.4, 0.1],
        wind_speed_10m: [10, 20, 12],
      },
    });
    expect(days["2026-12-02"]).toEqual({
      date: "2026-12-02",
      source: "history",
      morning: { feels: 1, rain: 10, wind: 10 },
      midday: { feels: 6, rain: 70, wind: 20 },
      evening: { feels: 3, rain: 10, wind: 12 },
    });
  });
});
