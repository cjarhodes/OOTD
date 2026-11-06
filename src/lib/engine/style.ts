import { PALETTE } from "../palette";
import type { Item, Pieces, RecipeId, Tier } from "../types";
import type { DayNeeds } from "./weather";

/**
 * Taste, on top of the structural rules: what suits the season, which
 * layering moves read as modern and considered, and what reads as muddy.
 * Tuned against the style audit (style-audit.test.ts).
 */

/** Shirts that can also be worn open over a tee, as a light layer. */
export const OPEN_SHIRT_KINDS = new Set(["oxford", "camp-shirt"]);
const CREW_BASES = new Set(["crew", "turtle", "mock"]);

const openShirts = new WeakMap<Item, Item>();

/** The same shirt, worn unbuttoned as the mid layer. Same id, so wear history still counts it. */
export function asOpenShirt(shirt: Item): Item {
  let open = openShirts.get(shirt);
  if (!open) {
    open = { ...shirt, front: "open" };
    openShirts.set(shirt, open);
  }
  return open;
}

/** A shirt worn open over a tee, henley or roll neck. */
export function isOpenShirtLayer(p: Pieces): boolean {
  return Boolean(p.mid && p.mid.slot === "base" && OPEN_SHIRT_KINDS.has(p.mid.kind) && CREW_BASES.has(p.base.neckline));
}

/** Can this shirt go open over this base? Not over another collar, and not over itself. */
export function openShirtFits(base: Item, shirt: Item): boolean {
  return base.id !== shirt.id && CREW_BASES.has(base.neckline);
}

const KNIT_MIDS = new Set(["crewneck", "v-neck", "cardigan", "quarter-zip", "hoodie", "sweatshirt"]);
const KNIT_BASES = new Set(["turtleneck", "mock-neck"]);

/** What suits the season. Penalties, not bans, so a thin wardrobe still gets dressed. */
export function seasonScore(p: Pieces, needs: DayNeeds): number {
  let score = 0;
  const dry = !needs.wet;
  const coolStart = needs.coldest <= 15;
  if (needs.warmest >= 24 && dry) {
    if (p.outer && !coolStart) score -= 3;
    if (p.mid?.kind === "gilet") score -= 3;
    else if (p.mid && KNIT_MIDS.has(p.mid.kind) && !coolStart) score -= 2.5;
    if (KNIT_BASES.has(p.base.kind)) score -= 2.5;
    if (p.shoes.kind === "boots") score -= 1.5;
  } else if (needs.warmest >= 20 && dry) {
    if (p.mid?.kind === "gilet") score -= 1.5;
    if (p.base.kind === "turtleneck") score -= 1.2;
    if (p.shoes.kind === "boots") score -= 0.6;
  }
  // A technical shell on a dry, calm day reads as a mistake.
  if (p.outer?.kind === "rain-shell" && dry && !needs.windy) score -= 2.5;
  // A camp collar is a summer shirt: fine on a warm day, lost in midwinter.
  const camp = p.base.kind === "camp-shirt" || p.mid?.kind === "camp-shirt";
  if (camp && needs.coldest <= 8) score -= 1.8;
  else if (camp && needs.coldest < 14) score -= 0.9;
  if (needs.coldest <= 4 && p.shoes.kind === "loafers") score -= 0.4;
  return score + pairingScore(p);
}

/** Pairings that are allowed but rarely look right. */
export function pairingScore(p: Pieces): number {
  let score = 0;
  // A knit polo's soft collar crumples under a hood; an oxford collar holds its shape.
  if (p.base.kind === "polo" && (p.mid?.kind === "hoodie" || p.mid?.kind === "sweatshirt")) score -= 1.5;
  return score;
}

/** One colour family from the visible inner layer down through the trousers. */
export function columnOf(p: Pieces): Item | null {
  const inner = p.mid ?? p.base;
  const a = PALETTE[inner.color];
  const b = PALETTE[p.bottom.color];
  if (a.family !== b.family || Math.abs(a.lightness - b.lightness) > 0.12) return null;
  // With a jacket on, the column needs the jacket to frame it.
  if (p.outer && Math.abs(PALETTE[p.outer.color].lightness - a.lightness) < 0.2) return null;
  return inner;
}

/** Several dark pieces in one family with nothing to lift them. */
export function isMuddy(p: Pieces): boolean {
  const pieces = [p.base, p.mid, p.outer, p.bottom].filter((i): i is Item => Boolean(i));
  const dark = pieces.filter((i) => PALETTE[i.color].lightness < 0.45);
  const byFamily = new Map<string, number>();
  for (const i of dark) byFamily.set(PALETTE[i.color].family, (byFamily.get(PALETTE[i.color].family) ?? 0) + 1);
  return [...byFamily.values()].some((n) => n >= 3);
}

export const CREATIVE_RECIPES = new Set<RecipeId>(["open-shirt", "high-low", "roll-neck"]);

/** How much a look's styling idea is worth, per tier: bold looks must have one. */
export function creativityScore(p: Pieces, recipe: RecipeId, tonal: boolean, tier: Tier): number {
  const idea = CREATIVE_RECIPES.has(recipe) || tonal || columnOf(p) !== null;
  let score = 0;
  if (tier === "bold") score += idea ? 2.4 : -1;
  else if (tier === "fresh" && idea) score += 0.6;
  if (isMuddy(p)) score -= 2.6;
  return score;
}
