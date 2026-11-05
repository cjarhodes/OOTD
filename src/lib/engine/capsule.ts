import { addDays, isWeekend } from "../dates";
import type {
  Comfort,
  DayWeather,
  FeedbackValue,
  Item,
  Occasion,
  TripDay,
  TripKind,
  Wear,
} from "../types";
import {
  candidateToLook,
  idsOf,
  rankedCandidates,
  type Candidate,
  type GenerateInput,
} from "./generate";
import { signatureOf } from "./score";
import { dayNeeds } from "./weather";

export interface CapsuleDayInput {
  date: string;
  occasion: Occasion;
  weather: DayWeather;
}

export interface CapsuleResult {
  days: TripDay[];
  capsule: string[];
  journey: string[];
  looksPossible: number;
  warnings: string[];
}

interface Base {
  items: Item[];
  wears?: Wear[];
  feedback?: Record<string, FeedbackValue>;
  comfort?: Comfort;
}

/** Default occasion for each day of a trip: travel days at either end. */
export function tripOccasions(
  start: string,
  end: string,
  kind: TripKind,
): { date: string; occasion: Occasion }[] {
  const out: { date: string; occasion: Occasion }[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) {
    let occasion: Occasion;
    if (d === start || d === end) occasion = "travel";
    else if (kind === "leisure") occasion = "weekend";
    else if (isWeekend(d)) occasion = kind === "work" ? "weekend" : "dinner";
    else occasion = kind === "work" ? "client" : "office";
    out.push({ date: d, occasion });
    if (out.length > 31) break;
  }
  return out;
}

/** Target capsule size: a few more pieces than days for short trips, levelling off for long ones. */
export function capsuleLimit(days: number): number {
  return Math.min(14, 5 + Math.ceil(days * 1.1));
}

const SHOE_BULK: Record<string, number> = {
  boots: 3,
  loafers: 2,
  sneakers: 2,
  runners: 1,
};

/**
 * How often one piece can be worn on a trip. Whatever sits next to the skin
 * gets a fresh piece most days; knits and trousers re-wear; jackets and shoes
 * can be worn every day.
 */
export function maxWears(slot: Item["slot"], tripDays: number): number {
  if (slot === "base") return tripDays <= 3 ? 1 : 2;
  if (slot === "mid" || slot === "bottom") return 3;
  return Number.POSITIVE_INFINITY;
}

function addDaysKey(date: string, n: number): string {
  return addDays(date, n);
}

/**
 * Pack a small capsule that dresses every day of a trip. Days are planned
 * hardest-weather first so the warm and waterproof layers are chosen early,
 * then each later day prefers pieces already packed. Identical looks on two
 * days are avoided, and the capsule is held near a size limit.
 */
export function buildCapsule(
  days: CapsuleDayInput[],
  base: Base,
  limit = capsuleLimit(days.length),
): CapsuleResult {
  const packed = new Set<string>();
  const used = new Set<string>();
  const assigned = new Map<string, string[]>();
  const warnings = new Set<string>();
  const wears: Wear[] = [...(base.wears ?? [])];

  const uses = new Map<string, number>();
  const baseOn = new Map<string, string>(); // date -> base item id
  const bySlot = new Map(base.items.map((i) => [i.id, i.slot] as const));

  // Respect re-wear limits; a base layer is never worn two days running.
  const allowed = (ids: string[], date: string) =>
    ids.every((id) => {
      const slot = bySlot.get(id)!;
      if ((uses.get(id) ?? 0) >= maxWears(slot, days.length)) return false;
      if (
        slot === "base" &&
        (baseOn.get(addDaysKey(date, -1)) === id ||
          baseOn.get(addDaysKey(date, 1)) === id)
      )
        return false;
      return true;
    });

  const order = [...days].sort((a, b) => {
    const na = dayNeeds(a.weather, base.comfort);
    const nb = dayNeeds(b.weather, base.comfort);
    return (
      Number(nb.wet) - Number(na.wet) ||
      nb.needCold - na.needCold ||
      a.date.localeCompare(b.date)
    );
  });

  for (const day of order) {
    const input: GenerateInput = {
      ...base,
      wears,
      weather: day.weather,
      occasion: day.occasion,
      date: day.date,
      prefer: packed,
    };
    const { candidates, warning } = rankedCandidates(input);
    if (warning) warnings.add(`${day.date}: ${warning}`);
    const pick = (strict: boolean): { c: Candidate; s: number } | null => {
      let top: { c: Candidate; s: number } | null = null;
      for (const c of candidates) {
        const ids = idsOf(c.pieces);
        if (strict && !allowed(ids, day.date)) continue;
        const fresh = ids.filter((id) => !packed.has(id));
        // Re-wearing a base layer earns nothing; it should feel fresh.
        const reused = ids.filter(
          (id) => packed.has(id) && bySlot.get(id) !== "base",
        ).length;
        const over = Math.max(0, packed.size + fresh.length - limit);
        const bulky = fresh.filter((id) => {
          const item = base.items.find((i) => i.id === id);
          return item?.slot === "outer" || item?.slot === "shoes";
        }).length;
        const s =
          c.base +
          reused * 1.4 -
          fresh.length * 1.8 -
          bulky * 0.6 -
          over * 3 -
          (used.has(signatureOf(c.pieces)) ? 4 : 0);
        if (!top || s > top.s) top = { c, s };
      }
      return top;
    };
    // Too few pieces to keep within the limits: relax them rather than leave the day empty.
    const best = pick(true) ?? pick(false);
    if (!best) {
      warnings.add(
        `${day.date}: this wardrobe can't make a complete look for that day.`,
      );
      continue;
    }
    const ids = idsOf(best.c.pieces);
    ids.forEach((id) => {
      packed.add(id);
      uses.set(id, (uses.get(id) ?? 0) + 1);
    });
    baseOn.set(day.date, best.c.pieces.base.id);
    used.add(signatureOf(best.c.pieces));
    assigned.set(day.date, ids);
    wears.push({ date: day.date, itemIds: ids, occasion: day.occasion });
  }

  const capsuleItems = base.items.filter((i) => packed.has(i.id));

  // How many different looks the capsule makes across the trip's conditions.
  const possible = new Set<string>();
  for (const day of days) {
    const { candidates, warning } = rankedCandidates({
      ...base,
      items: capsuleItems,
      weather: day.weather,
      occasion: day.occasion,
      date: day.date,
    });
    if (!warning)
      for (const c of candidates) possible.add(signatureOf(c.pieces));
  }

  // Wear the bulkiest outer layer and shoes on the journey rather than packing them.
  const journey: string[] = [];
  const outer = capsuleItems
    .filter((i) => i.slot === "outer")
    .sort((a, b) => b.thickness - a.thickness || b.warmth - a.warmth)[0];
  if (outer) journey.push(outer.id);
  const shoes = capsuleItems
    .filter((i) => i.slot === "shoes")
    .sort((a, b) => (SHOE_BULK[b.kind] ?? 0) - (SHOE_BULK[a.kind] ?? 0))[0];
  if (shoes && capsuleItems.filter((i) => i.slot === "shoes").length > 1)
    journey.push(shoes.id);

  return {
    days: days.map((d) => ({
      date: d.date,
      occasion: d.occasion,
      weather: d.weather,
      itemIds: assigned.get(d.date) ?? [],
    })),
    capsule: capsuleItems.map((i) => i.id),
    journey,
    looksPossible: possible.size,
    warnings: [...warnings],
  };
}

/** Another look for one trip day, using only capsule pieces, different from the current one. */
export function nextCapsuleLook(
  day: TripDay,
  capsuleItems: Item[],
  base: Omit<Base, "items">,
  exclude: Set<string>,
) {
  const input: GenerateInput = {
    ...base,
    items: capsuleItems,
    weather: day.weather,
    occasion: day.occasion,
    date: day.date,
  };
  const { candidates } = rankedCandidates(input);
  const ranked = [...candidates].sort((a, b) => b.base - a.base);
  const next = ranked.find((c) => !exclude.has(signatureOf(c.pieces)));
  return next ? candidateToLook(next, input) : null;
}

/** A one-line weather summary for a trip: "6°→14°, rain on 2 days". */
export function tripWeatherSummary(days: { weather: DayWeather }[]): string {
  if (days.length === 0) return "";
  const temps = days.flatMap((d) => [
    d.weather.morning.feels,
    d.weather.midday.feels,
    d.weather.evening.feels,
  ]);
  const wet = days.filter(
    (d) =>
      Math.max(
        d.weather.morning.rain,
        d.weather.midday.rain,
        d.weather.evening.rain,
      ) >= 50,
  ).length;
  return `${Math.min(...temps)}°→${Math.max(...temps)}°${wet ? `, rain likely on ${wet} ${wet === 1 ? "day" : "days"}` : ""}`;
}
