import { describe, expect, it } from "vitest";
import { SAMPLE_ITEMS } from "../sample";
import type { DayWeather } from "../types";
import { buildCapsule, capsuleLimit, nextCapsuleLook, tripOccasions, tripWeatherSummary } from "./capsule";
import { stackIsValid } from "./rules";
import { signatureOf } from "./score";
import { lookFromIds } from "./generate";

const w = (date: string, m: number, d: number, e: number, rain = 10): DayWeather => ({
  date,
  source: "live",
  morning: { feels: m, rain, wind: 10 },
  midday: { feels: d, rain, wind: 10 },
  evening: { feels: e, rain, wind: 10 },
});

describe("trip occasions", () => {
  it("travels at both ends and works on weekdays for a work trip", () => {
    // Mon 9 – Fri 13 Nov 2026
    const days = tripOccasions("2026-11-09", "2026-11-13", "work");
    expect(days.map((d) => d.occasion)).toEqual(["travel", "client", "client", "client", "travel"]);
  });

  it("uses weekend dressing for a leisure trip", () => {
    expect(tripOccasions("2026-11-13", "2026-11-16", "leisure").map((d) => d.occasion)).toEqual(["travel", "weekend", "weekend", "travel"]);
  });
});

describe("buildCapsule", () => {
  const base = { items: SAMPLE_ITEMS };

  it("dresses every day from a small, reused set of pieces", () => {
    const plan = tripOccasions("2026-11-09", "2026-11-13", "work").map((d, i) => ({ ...d, weather: w(d.date, 6 + i, 12 + i, 9 + i) }));
    const result = buildCapsule(plan, base);
    expect(result.days.every((d) => d.itemIds.length >= 3)).toBe(true);
    expect(result.capsule.length).toBeLessThanOrEqual(capsuleLimit(5));
    // Far fewer pieces than one fresh outfit per day.
    expect(result.capsule.length).toBeLessThan(5 * 4);
    // Every day's look is a valid stack and only uses packed pieces.
    for (const d of result.days) {
      const look = lookFromIds(d.itemIds, SAMPLE_ITEMS, { weather: d.weather, occasion: d.occasion, date: d.date });
      expect(look && stackIsValid(look.pieces)).toBe(true);
      expect(d.itemIds.every((id) => result.capsule.includes(id))).toBe(true);
    }
    // No two days repeat the exact same look.
    expect(new Set(result.days.map((d) => [...d.itemIds].sort().join("+"))).size).toBe(5);
    expect(result.looksPossible).toBeGreaterThanOrEqual(5);
  });

  it("packs a warm layer for a cold trip and a rain-ready one for a wet day", () => {
    const plan = tripOccasions("2026-11-13", "2026-11-16", "leisure").map((d, i) => ({
      ...d,
      weather: w(d.date, 1, 5, 3, i === 1 ? 80 : 10),
    }));
    const result = buildCapsule(plan, base);
    const packed = SAMPLE_ITEMS.filter((i) => result.capsule.includes(i.id));
    expect(packed.some((i) => i.slot === "outer")).toBe(true);
    const wetDay = result.days[1]!;
    const outer = SAMPLE_ITEMS.find((i) => wetDay.itemIds.includes(i.id) && i.slot === "outer");
    expect(outer?.waterproof).toBe(true);
  });

  it("wears the bulkiest outer layer on the journey", () => {
    const plan = tripOccasions("2026-11-09", "2026-11-11", "work").map((d) => ({ ...d, weather: w(d.date, 3, 8, 5) }));
    const result = buildCapsule(plan, base);
    const outers = SAMPLE_ITEMS.filter((i) => result.capsule.includes(i.id) && i.slot === "outer");
    if (outers.length) {
      const bulkiest = [...outers].sort((a, b) => b.thickness - a.thickness)[0]!;
      expect(result.journey).toContain(bulkiest.id);
    }
  });

  it("is deterministic for the same trip", () => {
    const plan = tripOccasions("2026-11-09", "2026-11-12", "mixed").map((d) => ({ ...d, weather: w(d.date, 8, 15, 11) }));
    expect(buildCapsule(plan, base)).toEqual(buildCapsule(plan, base));
  });

  it("warns instead of inventing pieces when the wardrobe can't cope", () => {
    const tees = SAMPLE_ITEMS.filter((i) => i.kind === "tee" || i.slot === "bottom" || i.slot === "shoes");
    const plan = [{ date: "2026-12-01", occasion: "weekend" as const, weather: w("2026-12-01", -5, 0, -3) }];
    const result = buildCapsule(plan, { items: tees });
    expect(result.warnings.length).toBe(1);
    expect(result.days[0]!.itemIds.length).toBeGreaterThan(0);
  });

  it("offers a different look for a day from the capsule only", () => {
    const plan = tripOccasions("2026-11-09", "2026-11-12", "work").map((d) => ({ ...d, weather: w(d.date, 7, 13, 10) }));
    const result = buildCapsule(plan, base);
    const capsuleItems = SAMPLE_ITEMS.filter((i) => result.capsule.includes(i.id));
    const day = result.days[1]!;
    const current = [...day.itemIds].sort().join("+");
    const next = nextCapsuleLook(day, capsuleItems, {}, new Set([current]));
    if (next) {
      expect(next.signature).not.toBe(current);
      expect(signatureOf(next.pieces).split("+").every((id) => result.capsule.includes(id))).toBe(true);
    }
  });

  it("summarises the weather", () => {
    expect(tripWeatherSummary([{ weather: w("a", 4, 12, 8) }, { weather: w("b", 6, 10, 7, 70) }])).toBe("4°→12°, rain likely on 1 day");
  });
});
