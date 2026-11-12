import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SAMPLE_ITEMS } from "../sample";
import type { DayWeather, Occasion, Pieces } from "../types";
import { layersAreValid, layersFitWeather, lowerFitsWeather, patternsWork } from "./rules";
import { asOpenShirt } from "./style";
import { dayNeeds } from "./weather";

/**
 * Forty looks a stylist put together from the sample wardrobe, two for each
 * of four days and five occasions (docs/LOOP.md, round 5). The engine doesn't
 * have to pick them, but it must not forbid them: when its hard rules reject
 * what a stylist would choose, every look it makes comes out as one formula.
 */
interface StylistLook {
  day: string;
  occasion: Occasion;
  base: string;
  mid: string | null;
  outer: string | null;
  bottom: string;
  shoes: string;
}

const w = (a: number, b: number, c: number, rain = 0, wind = 12) => ({
  morning: { feels: a, rain, wind },
  midday: { feels: b, rain, wind },
  evening: { feels: c, rain, wind },
});
const DAYS: Record<string, ReturnType<typeof w>> = { cool: w(7, 13, 10, 0, 30), mild: w(12, 18, 14), warm: w(17, 23, 19), wetcold: w(4, 7, 5, 85) };

describe("stylist looks", () => {
  const looks = JSON.parse(readFileSync(new URL("./stylist-looks.json", import.meta.url), "utf8")) as StylistLook[];
  const byId = new Map(SAMPLE_ITEMS.map((i) => [i.id, i]));

  it("are allowed by the engine's hard rules", () => {
    const allowed = looks.filter((g) => {
      const mid = g.mid ? byId.get(g.mid)! : undefined;
      const p: Pieces = {
        base: byId.get(g.base)!,
        mid: mid && mid.slot === "base" ? asOpenShirt(mid) : mid,
        outer: g.outer ? byId.get(g.outer)! : undefined,
        bottom: byId.get(g.bottom)!,
        shoes: byId.get(g.shoes)!,
      };
      const needs = dayNeeds({ ...DAYS[g.day]!, date: "2026-11-12", source: "sample" } as DayWeather);
      return layersAreValid(p) && layersFitWeather(p, needs, false, true).ok && lowerFitsWeather(p, needs) && patternsWork(p);
    });
    expect(looks.length).toBe(40);
    // 20 of 40 before the warmth window was widened; the four still out are too thin for a wet 4° day.
    expect(allowed.length).toBeGreaterThanOrEqual(36);
  });
});
