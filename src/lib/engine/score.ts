import { PALETTE } from "../palette";
import type { FeedbackValue, Item, Occasion, Pieces, Tier, Wear } from "../types";
import { RECIPE_BOLDNESS, recipeOf, textureContrast, tonalFamily } from "./describe";
import { upperLayers } from "./rules";

export const OCCASION_FORMALITY: Record<Occasion, number> = {
  office: 2.6,
  client: 3.4,
  weekend: 1.6,
  dinner: 3,
  travel: 2,
};

export function signatureOf(p: Pieces): string {
  return [p.base, p.mid, p.outer, p.bottom, p.shoes]
    .filter((i): i is Item => Boolean(i))
    .map((i) => i.id)
    .sort()
    .join("+");
}

export function lookBoldness(p: Pieces): number {
  const pieces = [...upperLayers(p), p.bottom, p.shoes];
  const accents = pieces.filter((i) => !PALETTE[i.color].neutral).length;
  const patterns = pieces.filter((i) => i.pattern !== "solid").length;
  return (
    pieces.reduce((s, i) => s + i.boldness, 0) +
    RECIPE_BOLDNESS[recipeOf(p)] +
    (tonalFamily(p) ? 1 : 0) +
    Math.max(0, accents - 1) +
    patterns
  );
}

/** Colour harmony: light-to-dark layering, at most one accent family, top/bottom contrast. */
export function colourScore(p: Pieces): number {
  const layers = upperLayers(p);
  const pieces = [...layers, p.bottom, p.shoes];
  let score = 0;

  const accentFamilies = new Set(pieces.filter((i) => !PALETTE[i.color].neutral).map((i) => PALETTE[i.color].family));
  if (accentFamilies.size === 0) score += 1;
  else if (accentFamilies.size === 1) score += 1.4;
  // Two colours that aren't neutrals fight (sage under red): only ever the last resort.
  else if (accentFamilies.size === 2) score -= 6;
  else score -= 8;

  // Tonal is a good idea, not a default: creativityScore also credits it.
  if (tonalFamily(p)) score += 0.6;

  // Neighbouring layers need visible separation, or the stack reads as one blob.
  for (let i = 1; i < layers.length; i++) {
    const a = layers[i - 1]!;
    const b = layers[i]!;
    if (a.color === b.color) score -= 1.4;
    else if (Math.abs(PALETTE[a.color].lightness - PALETTE[b.color].lightness) < 0.08) score -= 0.6;
  }

  // Lightest close to the body, darker going out, reads as considered.
  if (layers.length >= 2) {
    const light = layers.map((i) => PALETTE[i.color].lightness);
    const descending = light.every((l, i) => i === 0 || l <= light[i - 1]! + 0.02);
    if (descending) score += 0.6;
  }

  // A dark "sandwich": outer layer and shoes in the same family.
  const outermost = layers[layers.length - 1]!;
  if (layers.length >= 2 && PALETTE[outermost.color].family === PALETTE[p.shoes.color].family) score += 0.4;

  // The top half and bottoms need some separation.
  const topLightness = PALETTE[outermost.color].lightness;
  const bottomLightness = PALETTE[p.bottom.color].lightness;
  const gap = Math.abs(topLightness - bottomLightness);
  if (outermost.color === p.bottom.color && outermost.material === p.bottom.material) score -= 0.8;
  else if (gap >= 0.15) score += 0.4;

  return score;
}

export function textureScore(p: Pieces): number {
  const materials = new Set([...upperLayers(p), p.bottom].map((i) => i.material));
  let score = textureContrast(p) ? 0.8 : 0;
  if (materials.size >= 5) score -= 0.5;
  const patterned = [...upperLayers(p), p.bottom].filter((i) => i.pattern !== "solid").length;
  if (patterned === 2) score -= 1.5;
  return score;
}

export function formalityScore(p: Pieces, occasion: Occasion): number {
  const target = OCCASION_FORMALITY[occasion];
  const pieces = [...upperLayers(p), p.bottom, p.shoes];
  const avg = pieces.reduce((s, i) => s + i.formality, 0) / pieces.length;
  let score = -Math.abs(avg - target) * 0.9;
  for (const i of pieces) if (Math.abs(i.formality - target) > 2.2) score -= 1;
  return score;
}

export function tierScore(boldness: number, tier: Tier): number {
  if (tier === "easy") return -0.6 * Math.max(0, boldness - 1);
  if (tier === "fresh") return -0.4 * Math.abs(boldness - 2);
  // The styling idea (creativityScore) now carries bold looks; boldness alone counts for less.
  return boldness >= 3 ? 0.25 * Math.min(boldness, 6) : -1.2;
}

export interface History {
  wearCounts: Map<string, number>;
  medianWears: number;
  recentItems: Set<string>;
  recentSignatures: Set<string>;
  everWorn: Set<string>;
}

export function buildHistory(wears: Wear[], date: string): History {
  const wearCounts = new Map<string, number>();
  const recentItems = new Set<string>();
  const recentSignatures = new Set<string>();
  const everWorn = new Set<string>();
  const day = Date.parse(`${date}T12:00:00Z`);
  for (const w of wears) {
    if (w.date >= date) continue;
    const sig = [...w.itemIds].sort().join("+");
    everWorn.add(sig);
    for (const id of w.itemIds) wearCounts.set(id, (wearCounts.get(id) ?? 0) + 1);
    const ago = (day - Date.parse(`${w.date}T12:00:00Z`)) / 86_400_000;
    if (ago <= 2) for (const id of w.itemIds) recentItems.add(id);
    if (ago <= 14) recentSignatures.add(sig);
  }
  const counts = [...wearCounts.values()].sort((a, b) => a - b);
  const medianWears = counts.length ? counts[Math.floor(counts.length / 2)]! : 0;
  return { wearCounts, medianWears, recentItems, recentSignatures, everWorn };
}

export function historyScore(p: Pieces, tier: Tier, h: History, feedback: Record<string, FeedbackValue>): number {
  return historyScores(p, h, feedback)[tier];
}

/** History for all three tiers at once: the signature and wear counts are worked out once. */
export function historyScores(p: Pieces, h: History, feedback: Record<string, FeedbackValue>): Record<Tier, number> {
  // Nothing worn and nothing rated yet: only the bold tier's "never worn" nudge applies.
  if (h.wearCounts.size === 0 && h.everWorn.size === 0) {
    let none = true;
    for (const _ in feedback) {
      none = false;
      break;
    }
    if (none) return { easy: 0, fresh: 0, bold: 0.5 };
  }
  let easy = 0;
  let other = 0;
  for (const i of [p.base, p.mid, p.outer, p.bottom, p.shoes]) {
    if (!i) continue;
    const count = h.wearCounts.get(i.id) ?? 0;
    easy += Math.min(count, 10) * 0.08;
    if (count < h.medianWears) other += 0.3;
    if (h.recentItems.has(i.id)) {
      easy -= 0.6;
      other -= 0.6;
    }
  }
  const sig = signatureOf(p);
  let shared = 0;
  if (h.recentSignatures.has(sig)) shared -= 2;
  if (feedback[sig] === "love") shared += 1;
  if (feedback[sig] === "skip") shared -= 3;
  return {
    easy: easy + shared,
    fresh: other + shared,
    bold: other + shared + (h.everWorn.has(sig) ? 0 : 0.5),
  };
}
