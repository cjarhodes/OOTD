import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SAMPLE_ITEMS } from "../sample";
import type { DayWeather, Look, Occasion, Tier } from "../types";
import { generateLooks, idsOf, lookFromIds } from "./generate";
import { fitOf } from "../kinds";
import { CREATIVE_RECIPES, isMuddy, proportionIdea, VOLUME } from "./style";

/**
 * The style audit: a fixed set of days and occasions run against the sample
 * wardrobe. Set STYLE_AUDIT_OUT to write every look to a file for review;
 * the assertions below keep the rules that review produced.
 */
const w = (morning: number, midday: number, evening: number, rain = 0, wind = 12) => ({
  morning: { feels: morning, rain, wind },
  midday: { feels: midday, rain, wind },
  evening: { feels: evening, rain, wind },
});

export const AUDIT_DAYS: { id: string; weather: Omit<DayWeather, "date" | "source"> }[] = [
  { id: "hot", weather: w(24, 30, 26) },
  { id: "warm", weather: w(17, 23, 19) },
  { id: "mild", weather: w(12, 18, 14) },
  { id: "swingy", weather: w(7, 19, 11) },
  { id: "cool", weather: w(8, 12, 9) },
  { id: "cold", weather: w(2, 6, 3) },
  { id: "freezing", weather: w(-4, 0, -3) },
  { id: "wet-mild", weather: w(11, 14, 12, 80) },
  { id: "wet-cold", weather: w(4, 7, 5, 85) },
  { id: "windy", weather: w(6, 10, 7, 10, 45) },
];

const OCCASIONS: Occasion[] = ["office", "client", "weekend", "dinner", "travel"];
const TIERS: Tier[] = ["easy", "fresh", "bold"];

export interface AuditRow {
  day: string;
  occasion: Occasion;
  tier: Tier;
  look: Look | null;
}

export function runAudit(items = SAMPLE_ITEMS): AuditRow[] {
  const rows: AuditRow[] = [];
  AUDIT_DAYS.forEach((d, i) => {
    const date = `2026-11-${String(i + 2).padStart(2, "0")}`;
    for (const occasion of OCCASIONS) {
      const looks = generateLooks({ items, weather: { ...d.weather, date, source: "sample" }, occasion, date });
      for (const tier of TIERS) rows.push({ day: d.id, occasion, tier, look: looks[tier] });
    }
  });
  return rows;
}

function line(r: AuditRow): string {
  if (!r.look) return `${r.day.padEnd(9)} ${r.occasion.padEnd(8)} ${r.tier.padEnd(5)} — no look`;
  const p = r.look.pieces;
  const top = [p.base, p.mid, p.outer].filter(Boolean).map((i) => i!.name).join(" / ");
  return `${r.day.padEnd(9)} ${r.occasion.padEnd(8)} ${r.tier.padEnd(5)} ${r.look.name} | ${top} | ${p.bottom.name} | ${p.shoes.name}`;
}

describe("style audit", () => {
  const rows = runAudit();
  const looks = rows.filter((r): r is AuditRow & { look: Look } => r.look !== null);
  const on = (days: string[]) => looks.filter((r) => days.includes(r.day));
  const named = (r: AuditRow & { look: Look }) => `${r.day} ${r.occasion} ${r.tier}: ${r.look.name}`;

  it("dresses every day and occasion", () => {
    if (process.env.STYLE_AUDIT_OUT) writeFileSync(process.env.STYLE_AUDIT_OUT, rows.map(line).join("\n") + "\n");
    expect(rows.filter((r) => !r.look)).toEqual([]);
  });

  it("dresses for heat: no jacket, gilet, knit or boots on a hot dry day", () => {
    const wrong = on(["hot"]).filter(({ look: { pieces: p } }) => {
      const knitMid = p.mid && ["crewneck", "v-neck", "cardigan", "quarter-zip", "hoodie", "sweatshirt", "gilet"].includes(p.mid.kind);
      return p.outer || knitMid || ["turtleneck", "mock-neck"].includes(p.base.kind) || p.shoes.kind === "boots";
    });
    expect(wrong.map(named)).toEqual([]);
  });

  it("keeps the rain shell for rain or wind", () => {
    const wrong = on(["hot", "warm", "mild", "swingy", "cool", "cold", "freezing"]).filter((r) => r.look.pieces.outer?.kind === "rain-shell");
    expect(wrong.map(named)).toEqual([]);
  });

  it("gives every tier its own top half", () => {
    for (const day of new Set(rows.map((r) => r.day))) {
      for (const occasion of new Set(rows.map((r) => r.occasion))) {
        const tops = looks
          .filter((r) => r.day === day && r.occasion === occasion)
          .map(({ look: { pieces: p } }) => [p.base, p.mid, p.outer].map((i) => i?.id ?? "").join(">"));
        expect(new Set(tops).size, `${day} ${occasion}`).toBe(tops.length);
      }
    }
  });

  it("makes bold looks creative, varied and never muddy", () => {
    const bold = looks.filter((r) => r.tier === "bold");
    const creative = bold.filter((r) => CREATIVE_RECIPES.has(r.look.recipe) || r.look.tonal || /column/.test(r.look.name));
    expect(creative.length / bold.length).toBeGreaterThanOrEqual(0.85);
    expect(new Set(bold.map((r) => r.look.signature)).size / bold.length).toBeGreaterThanOrEqual(0.7);
    // No one upper piece carries the bold tier.
    const counts = new Map<string, number>();
    for (const r of bold) for (const i of [r.look.pieces.base, r.look.pieces.mid, r.look.pieces.outer]) if (i) counts.set(i.id, (counts.get(i.id) ?? 0) + 1);
    expect(Math.max(...counts.values()) / bold.length).toBeLessThanOrEqual(0.4);
    expect(looks.filter((r) => isMuddy(r.look.pieces)).map(named)).toEqual([]);
  });

  it("keeps proportion believable and modern", () => {
    const v = (i: Parameters<typeof fitOf>[0]) => VOLUME[fitOf(i)];
    // No layer squeezed over a much roomier one.
    const squeezed = looks.filter(({ look: { pieces: p } }) => {
      const layers = [p.base, p.mid, p.outer].filter((i) => i !== null && i !== undefined);
      return layers.some((l, i) => i > 0 && v(l) < v(layers[i - 1]!) - 1.5);
    });
    expect(squeezed.map(named)).toEqual([]);
    // Skinny top over skinny trousers reads dated: never in fresh or bold.
    const styled = looks.filter((r) => r.tier !== "easy");
    const skinny = styled.filter(({ look: { pieces: p } }) => v(p.outer ?? p.mid ?? p.base) <= 0 && v(p.bottom) <= 0);
    expect(skinny.map(named)).toEqual([]);
    // Most styled looks carry a silhouette idea...
    expect(styled.filter((r) => proportionIdea(r.look.pieces) !== null).length / styled.length).toBeGreaterThanOrEqual(0.5);
    // ...without one pair of trousers doing all the work.
    const bottoms = new Map<string, number>();
    for (const r of looks) bottoms.set(r.look.pieces.bottom.id, (bottoms.get(r.look.pieces.bottom.id) ?? 0) + 1);
    expect(Math.max(...bottoms.values()) / looks.length).toBeLessThanOrEqual(1 / 3);
  });

  it("round-trips a shirt worn open through a saved plan", () => {
    const open = looks.find((r) => r.look.recipe === "open-shirt")!;
    const rebuilt = lookFromIds(idsOf(open.look.pieces), SAMPLE_ITEMS, {
      weather: { ...AUDIT_DAYS[0]!.weather, date: "2026-11-02", source: "sample" },
      occasion: open.occasion,
      date: "2026-11-02",
    });
    expect(rebuilt?.recipe).toBe("open-shirt");
    expect(rebuilt?.pieces.mid?.front).toBe("open");
  });
});
