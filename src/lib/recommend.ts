import { generateLooks, type GenerateInput } from "./engine/generate";
import { isOwned, KINDS } from "./kinds";
import { alreadyHas, STARTER_DECK, starterItem } from "./starter";
import type { DayWeather, Item, Occasion, Slot } from "./types";

/**
 * Best next buys: which piece would do the most for this wardrobe. Measured,
 * not guessed: each candidate is added to the wardrobe and the outfit engine
 * is run across a spread of days and occasions. A piece scores for the looks
 * it appears in, and more for looks that weren't possible without it.
 */
export interface NextBuy {
  item: Item;
  /** Looks (out of `of`) that would use it. */
  uses: number;
  /** Looks that become possible only with it. */
  unlocks: number;
  of: number;
  wanted: boolean;
  reason: string;
}

const w = (m: number, d: number, e: number, rain = 0): Omit<DayWeather, "date" | "source"> => ({
  morning: { feels: m, rain, wind: 12 },
  midday: { feels: d, rain, wind: 12 },
  evening: { feels: e, rain, wind: 12 },
});

/** A spread of days: warm, mild, cold and wet, at work and at the weekend. */
const SCENARIOS: { weather: Omit<DayWeather, "date" | "source">; occasion: Occasion; day: string }[] = [
  { day: "warm", weather: w(18, 24, 20), occasion: "weekend" },
  { day: "warm", weather: w(18, 24, 20), occasion: "office" },
  { day: "mild", weather: w(10, 16, 12), occasion: "office" },
  { day: "mild", weather: w(10, 16, 12), occasion: "dinner" },
  { day: "cold", weather: w(1, 5, 2), occasion: "office" },
  { day: "cold", weather: w(1, 5, 2), occasion: "weekend" },
  { day: "wet", weather: w(8, 11, 9, 85), occasion: "office" },
  { day: "wet", weather: w(8, 11, 9, 85), occasion: "weekend" },
];

const DATE = "2026-11-02";

function looksFor(items: Item[]) {
  return SCENARIOS.map((s, i) => {
    const input: GenerateInput = { items, weather: { ...s.weather, date: DATE, source: "sample" }, occasion: s.occasion, date: `2026-11-0${(i % 7) + 2}` };
    const looks = generateLooks(input);
    // Only looks that suit the weather count; the engine's "closest look" fallback carries a warning.
    return [looks.easy, looks.fresh, looks.bold].map((l) => (l && !l.warning ? l : null));
  });
}

/** Candidates worth testing: everything wanted, then starter pieces for the thinnest slots. */
export function candidates(items: Item[], limit = 14): { item: Item; wanted: boolean }[] {
  const owned = items.filter(isOwned);
  const wanted = items.filter((i) => i.status === "wanted").map((i) => ({ item: { ...i, status: "available" as const }, wanted: true }));
  const perSlot = new Map<Slot, number>();
  for (const i of owned) perSlot.set(i.slot, (perSlot.get(i.slot) ?? 0) + 1);
  const fromDeck = STARTER_DECK.filter((c) => !alreadyHas(c, items))
    .map((c) => ({ item: starterItem(c), wanted: false, thin: perSlot.get(KINDS[c.kind].slot) ?? 0 }))
    .sort((a, b) => a.thin - b.thin)
    .map(({ item, wanted }) => ({ item, wanted }));
  return [...wanted, ...fromDeck].slice(0, Math.max(limit, wanted.length));
}

export function nextBuys(items: Item[], count = 3): NextBuy[] {
  const owned = items.filter(isOwned).map((i) => ({ ...i, status: i.status === "laundry" ? ("available" as const) : i.status }));
  const before = looksFor(owned);
  const total = before.length * 3;
  const results: NextBuy[] = [];
  for (const { item, wanted } of candidates(items)) {
    const after = looksFor([...owned, item]);
    let uses = 0;
    let unlocks = 0;
    const days = new Set<string>();
    after.forEach((tiers, s) =>
      tiers.forEach((look, t) => {
        if (!look) return;
        const ids = [look.pieces.base, look.pieces.mid, look.pieces.outer, look.pieces.bottom, look.pieces.shoes].map((p) => p?.id);
        if (!ids.includes(item.id)) return;
        uses++;
        days.add(SCENARIOS[s]!.day);
        if (!before[s]![t]) unlocks++;
      }),
    );
    if (uses === 0) continue;
    results.push({ item, uses, unlocks, of: total, wanted, reason: reasonFor(uses, unlocks, total, days) });
  }
  // Pieces that make new looks possible first, then the most useful; wanted pieces win ties.
  results.sort((a, b) => b.unlocks - a.unlocks || b.uses - a.uses || Number(b.wanted) - Number(a.wanted));
  // One per category, so the advice isn't three pairs of shoes; fill up if a category runs short.
  const picked: NextBuy[] = [];
  for (const r of results) if (picked.length < count && !picked.some((p) => p.item.slot === r.item.slot)) picked.push(r);
  for (const r of results) if (picked.length < count && !picked.includes(r)) picked.push(r);
  return picked;
}

const DAY_ORDER = ["warm", "mild", "cold", "wet"] as const;

function describeDays(days: Set<string>): string {
  const list = DAY_ORDER.filter((d) => days.has(d));
  if (list.length >= 3) return "most kinds of day";
  return `${list.join(" and ")} days`;
}

function reasonFor(uses: number, unlocks: number, total: number, days: Set<string>): string {
  const use = `Goes into ${uses} of ${total} looks across ${describeDays(days)}`;
  if (unlocks > 0) return `${use}, including ${unlocks} new ${unlocks === 1 ? "look" : "looks"} you can’t make today.`;
  return `${use}.`;
}
