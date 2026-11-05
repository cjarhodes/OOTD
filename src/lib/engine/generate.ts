import type {
  Comfort,
  DayWeather,
  FeedbackValue,
  Item,
  Look,
  Occasion,
  Pieces,
  Slot,
  Tier,
  Wear,
} from "../types";
import { lookName, lookNotes, recipeOf, tonalFamily } from "./describe";
import { stackIsValid, upperLayers, weatherFit } from "./rules";
import {
  buildHistory,
  colourScore,
  formalityScore,
  historyScore,
  lookBoldness,
  OCCASION_FORMALITY,
  signatureOf,
  textureScore,
  tierScore,
} from "./score";
import { dayNeeds, hash } from "./weather";

export const TIERS: Tier[] = ["easy", "fresh", "bold"];

export interface GenerateInput {
  items: Item[];
  weather: DayWeather;
  occasion: Occasion;
  date: string;
  wears?: Wear[];
  feedback?: Record<string, FeedbackValue>;
  comfort?: Comfort;
  /** An item that must appear in every look. */
  pin?: string;
  /** Bump to get a different set of looks for the same day. */
  shuffle?: number;
  /** Items that must stay in the search pool (e.g. pieces already packed for a trip). */
  prefer?: Set<string>;
}

export type Looks = Record<Tier, Look | null>;

/** Per-slot pool size. Keeps the search fast for large wardrobes. */
const POOL = 9;

export interface Candidate {
  pieces: Pieces;
  base: number;
  boldness: number;
  shed?: Item;
  backOn: boolean;
}

function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pools(input: GenerateInput, random: () => number): Record<Slot, Item[]> {
  const target = OCCASION_FORMALITY[input.occasion];
  const available = input.items.filter((i) => i.status === "available");
  const bySlot: Record<Slot, Item[]> = { base: [], mid: [], outer: [], bottom: [], shoes: [] };
  for (const i of available) bySlot[i.slot].push(i);
  for (const slot of Object.keys(bySlot) as Slot[]) {
    const ranked = bySlot[slot]
      .map((i) => ({ i, r: -Math.abs(i.formality - target) + random() * 1.5 }))
      .sort((a, b) => b.r - a.r)
      .map((x) => x.i);
    const keep = (i: Item) => i.id === input.pin || Boolean(input.prefer?.has(i.id));
    const kept = ranked.filter(keep);
    bySlot[slot] = [...kept, ...ranked.filter((i) => !keep(i)).slice(0, Math.max(0, POOL - kept.length))];
  }
  return bySlot;
}

function candidates(input: GenerateInput, requireRainLayer: boolean, ignoreWeather = false): Candidate[] {
  const seed = hash(`${input.date}|${input.occasion}|${input.shuffle ?? 0}`);
  const random = rng(seed);
  const pool = pools(input, random);
  const needs = dayNeeds(input.weather, input.comfort);
  const rainLayerAvailable = requireRainLayer && pool.outer.some((i) => i.waterproof);
  const history = buildHistory(input.wears ?? [], input.date);
  const feedback = input.feedback ?? {};
  const out: Candidate[] = [];

  for (const base of pool.base) {
    for (const mid of [undefined, ...pool.mid]) {
      for (const outer of [undefined, ...pool.outer]) {
        for (const bottom of pool.bottom) {
          for (const shoes of pool.shoes) {
            const pieces: Pieces = { base, mid, outer, bottom, shoes };
            if (input.pin && ![base, mid, outer, bottom, shoes].some((i) => i?.id === input.pin)) continue;
            if (!stackIsValid(pieces)) continue;
            const fit = ignoreWeather ? { ok: true, shed: undefined, backOn: false } : weatherFit(pieces, needs, rainLayerAvailable);
            if (!fit.ok) continue;
            const boldness = lookBoldness(pieces);
            // Without a weather fit, prefer the warmest stacks so the closest look is the most useful one.
            const warmthBias = ignoreWeather ? upperLayers(pieces).reduce((s, i) => s + i.warmth, 0) * 0.8 : 0;
            const score =
              warmthBias +
              colourScore(pieces) +
              textureScore(pieces) +
              formalityScore(pieces, input.occasion) +
              historyScore(pieces, "fresh", history, feedback) * 0.5 +
              (random() - 0.5) * 1.0;
            out.push({ pieces, base: score, boldness, shed: fit.shed, backOn: fit.backOn });
          }
        }
      }
    }
  }
  return out;
}

/**
 * Every valid look for a day, scored, with the same fallbacks as generateLooks:
 * ignore the rain-shell rule if nothing else works, then ignore the weather and
 * say why. Used by trip capsules, which apply their own preferences on top.
 */
export function rankedCandidates(input: GenerateInput): { candidates: Candidate[]; warning?: string } {
  let pool = candidates(input, true);
  if (pool.length === 0) pool = candidates(input, false);
  if (pool.length > 0) return { candidates: pool };
  pool = candidates(input, false, true);
  return { candidates: pool, warning: pool.length ? weatherWarning(input) : undefined };
}

export function candidateToLook(c: Candidate, input: GenerateInput): Look {
  return toLook(c, c.base, input, dayNeeds(input.weather, input.comfort).wet);
}

function overlap(a: Pieces, b: Pieces): number {
  const ids = new Set([a.base, a.mid, a.outer, a.bottom, a.shoes].map((i) => i?.id).filter(Boolean));
  return [b.base, b.mid, b.outer, b.bottom, b.shoes].filter((i) => i && ids.has(i.id)).length;
}

function toLook(c: Candidate, score: number, input: GenerateInput, wet: boolean): Look {
  return {
    signature: signatureOf(c.pieces),
    pieces: c.pieces,
    score,
    boldness: c.boldness,
    recipe: recipeOf(c.pieces),
    tonal: tonalFamily(c.pieces) !== null,
    name: lookName(c.pieces, input.occasion),
    notes: lookNotes(c.pieces, c.shed ? { layer: c.shed, backOn: c.backOn } : undefined, wet),
    shed: c.shed ? { layer: c.shed, backOn: c.backOn } : undefined,
  };
}

/**
 * Three looks for a day: easy (familiar), fresh (new combinations of what you
 * wear), bold (more adventurous). Each differs from the others by at least
 * two pieces. A tier is null when the wardrobe cannot fill it.
 */
export function generateLooks(input: GenerateInput): Looks {
  let pool = candidates(input, true);
  // No rain layer can satisfy the warmth budget: fall back to ignoring the shell rule.
  if (pool.length === 0) pool = candidates(input, false);
  // Nothing suits the weather at all: show the closest looks, clearly flagged.
  let warning: string | undefined;
  if (pool.length === 0) {
    pool = candidates(input, false, true);
    if (pool.length > 0) warning = weatherWarning(input);
  }
  const history = buildHistory(input.wears ?? [], input.date);
  const feedback = input.feedback ?? {};
  const wet = dayNeeds(input.weather, input.comfort).wet;

  const result: Looks = { easy: null, fresh: null, bold: null };
  const chosen: Pieces[] = [];
  // In the fallback, only the warmest look is worth showing; it goes in the default tier.
  for (const tier of warning ? (["fresh"] as Tier[]) : TIERS) {
    let best: { c: Candidate; s: number } | null = null;
    for (const c of pool) {
      if (chosen.some((p) => overlap(p, c.pieces) > 3)) continue;
      const s = c.base + tierScore(c.boldness, tier) + historyScore(c.pieces, tier, history, feedback) * 0.5;
      if (!best || s > best.s) best = { c, s };
    }
    if (best) {
      const look = toLook(best.c, best.s, input, wet);
      result[tier] = warning ? { ...look, warning } : look;
      chosen.push(best.c.pieces);
    }
  }
  return result;
}

/** Explain, in plain words, why the wardrobe can't suit the day. */
export function weatherWarning(input: GenerateInput): string {
  const needs = dayNeeds(input.weather, input.comfort);
  const available = input.items.filter((i) => i.status === "available");
  const upper = available.filter((i) => i.slot === "base" || i.slot === "mid" || i.slot === "outer");
  const warmest = ["base", "mid", "outer"].reduce(
    (sum, slot) => sum + Math.max(0, ...upper.filter((i) => i.slot === slot).map((i) => i.warmth)),
    0,
  );
  if (warmest < needs.needCold - 1) {
    const outer = available.some((i) => i.slot === "outer");
    return `It feels like ${needs.coldest}°C at the coldest point, and nothing here is warm enough. ${
      outer ? "Add a warmer coat" : "Add a jacket or coat"
    } and OOTD can layer you properly.`;
  }
  if (needs.wet && available.every((i) => i.slot !== "outer" || !i.waterproof)) {
    return "Rain is likely and there’s no rain-ready layer in this wardrobe yet. Add a waterproof jacket.";
  }
  return `None of these pieces suit ${needs.coldest}°→${needs.warmest}°C well. This is the closest look.`;
}

/**
 * Replace one slot, keeping everything else. Returns the best valid alternative
 * that is not in `exclude` (signatures already shown), or null.
 */
export function swapPiece(
  look: Look,
  slot: Slot,
  input: GenerateInput,
  exclude: Set<string> = new Set(),
): Look | null {
  const needs = dayNeeds(input.weather, input.comfort);
  const available = input.items.filter((i) => i.status === "available");
  const rainLayerAvailable = available.some((i) => i.slot === "outer" && i.waterproof);
  const history = buildHistory(input.wears ?? [], input.date);
  const feedback = input.feedback ?? {};
  const options: (Item | undefined)[] = available.filter((i) => i.slot === slot && i.id !== look.pieces[slot]?.id);
  if (slot === "mid" || slot === "outer") options.push(undefined);

  let best: { pieces: Pieces; s: number; shed?: Item; backOn: boolean } | null = null;
  for (const option of options) {
    if (option === undefined && look.pieces[slot] === undefined) continue;
    const pieces = { ...look.pieces, [slot]: option } as Pieces;
    const sig = signatureOf(pieces);
    if (exclude.has(sig) || !stackIsValid(pieces)) continue;
    let fit = weatherFit(pieces, needs, rainLayerAvailable);
    if (!fit.ok && rainLayerAvailable) fit = weatherFit(pieces, needs, false);
    if (!fit.ok) continue;
    const s =
      colourScore(pieces) +
      textureScore(pieces) +
      formalityScore(pieces, input.occasion) +
      historyScore(pieces, "fresh", history, feedback) * 0.5;
    if (!best || s > best.s) best = { pieces, s, shed: fit.shed, backOn: fit.backOn };
  }
  if (!best) return null;
  return toLook(
    { pieces: best.pieces, base: best.s, boldness: lookBoldness(best.pieces), shed: best.shed, backOn: best.backOn },
    best.s,
    input,
    needs.wet,
  );
}

export interface WeekDay {
  date: string;
  occasion: Occasion;
  weather: DayWeather;
  /** Item ids already planned for this day, if any. */
  planned?: string[];
}

/**
 * Suggest a look for each day in order. Earlier days' looks count as recent
 * wears for later days, so the week doesn't repeat itself.
 */
export function planWeek(
  days: WeekDay[],
  base: Omit<GenerateInput, "weather" | "occasion" | "date">,
): (Look | null)[] {
  const wears = [...(base.wears ?? [])];
  return days.map((d) => {
    const input: GenerateInput = { ...base, wears, weather: d.weather, occasion: d.occasion, date: d.date };
    const look = d.planned ? lookFromIds(d.planned, base.items, input) : generateLooks(input).fresh;
    if (look) wears.push({ date: d.date, itemIds: idsOf(look.pieces), occasion: d.occasion });
    return look;
  });
}

export function idsOf(p: Pieces): string[] {
  return [p.base, p.mid, p.outer, p.bottom, p.shoes].filter((i): i is Item => Boolean(i)).map((i) => i.id);
}

/** Rebuild a saved plan into a Look so it can be displayed with notes. */
export function lookFromIds(ids: string[], items: Item[], input: Omit<GenerateInput, "items">): Look | null {
  const found = ids.map((id) => items.find((i) => i.id === id)).filter((i): i is Item => Boolean(i));
  const get = (slot: Slot) => found.find((i) => i.slot === slot);
  const base = get("base");
  const bottom = get("bottom");
  const shoes = get("shoes");
  if (!base || !bottom || !shoes) return null;
  const pieces: Pieces = { base, mid: get("mid"), outer: get("outer"), bottom, shoes };
  const needs = dayNeeds(input.weather, input.comfort);
  const fit = weatherFit(pieces, needs, false);
  return toLook(
    { pieces, base: 0, boldness: lookBoldness(pieces), shed: fit.shed, backOn: fit.backOn },
    0,
    { ...input, items },
    needs.wet,
  );
}
