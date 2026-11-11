import { fitOf } from "../kinds";
import { PALETTE } from "../palette";
import type { Fit, Item, Occasion, Pieces, RecipeId, Tier } from "../types";
import { upperLayers } from "./rules";
import type { DayNeeds } from "./weather";

/**
 * Taste, on top of the structural rules: what suits the season, which
 * layering moves read as modern and considered, and what reads as muddy.
 * Tuned against the style audit (style-audit.test.ts).
 */

/** Shirts that can also be worn open over a tee, as a light layer. */
export const OPEN_SHIRT_KINDS = new Set(["oxford", "camp-shirt", "flannel"]);
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

const KNIT_MIDS = new Set(["crewneck", "v-neck", "cardigan", "quarter-zip", "hoodie", "sweatshirt", "fleece"]);
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
  return score + pairingScore(p) + proportionScore(p);
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

/** How much room a cut takes up, for proportion. */
export const VOLUME: Record<Fit, number> = { slim: 0, regular: 1, relaxed: 2, boxy: 2.5, wide: 3 };

/** A cropped piece: a boxy cut that stops at the waist. */
export function isCropped(i: Item): boolean {
  return fitOf(i) === "boxy" && i.length <= 2;
}

export type ProportionIdea = "easy-line" | "a-line" | "cropped-over-long";

/** The silhouette idea a look carries, if any. */
export function proportionIdea(p: Pieces): ProportionIdea | null {
  const layers = [p.base, p.mid, p.outer].filter((i): i is Item => Boolean(i));
  const top = layers[layers.length - 1]!;
  const inner = layers.length > 1 ? layers[layers.length - 2]! : null;
  const topV = VOLUME[fitOf(top)];
  const bottomV = VOLUME[fitOf(p.bottom)];
  if (inner && isCropped(top) && inner.thickness <= 1 && inner.length - top.length >= 2) return "cropped-over-long";
  // Fitted through the body, wide below. A coat that isn't boxy keeps the line.
  const body = p.mid ?? p.base;
  if (VOLUME[fitOf(body)] <= 0 && bottomV >= 3 && (!p.outer || VOLUME[fitOf(p.outer)] <= 2)) return "a-line";
  if (topV >= 2 && bottomV >= 2) return "easy-line";
  return null;
}

/** Proportion: modern silhouettes up, dated or impossible ones down. */
export function proportionScore(p: Pieces): number {
  const layers = [p.base, p.mid, p.outer].filter((i): i is Item => Boolean(i));
  let score = 0;
  // A layer can't sit over something roomier than itself.
  for (let i = 1; i < layers.length; i++) {
    if (VOLUME[fitOf(layers[i]!)] < VOLUME[fitOf(layers[i - 1]!)] - 1.5) score -= 1.5;
  }
  const top = layers[layers.length - 1]!;
  const topV = VOLUME[fitOf(top)];
  const bottomV = VOLUME[fitOf(p.bottom)];
  // Skinny on skinny reads dated.
  if (topV <= 0 && bottomV <= 0) score -= 0.8;
  const idea = proportionIdea(p);
  if (idea === "a-line") score += 0.5;
  else if (idea === "easy-line") score += 0.3;
  else if (idea === "cropped-over-long") score += 0.6;
  return score;
}

/** The one coloured piece in an otherwise neutral look, if that's what the look is. */
export function accentPiece(p: Pieces): Item | null {
  const coloured = [...upperLayers(p), p.bottom, p.shoes].filter((i) => !PALETTE[i.color].neutral);
  return coloured.length === 1 ? coloured[0]! : null;
}

/** Outer layers and trousers with enough weight to carry a boot. */
const HEAVY_OUTER = new Set(["waxed", "wool", "leather", "corduroy", "canvas"]);
const HEAVY_BOTTOM = new Set(["corduroy", "canvas"]);

/** Relaxed shoes that suit a roomy weekend line. */
const EASY_SHOES = new Set(["runners", "canvas", "high-tops", "clogs", "trail"]);
/** Too casual for a client meeting. */
const CASUAL_SHOES = new Set(["runners", "canvas", "high-tops", "trail", "sandals", "clogs"]);

/** How the shoes finish the look: echo it, lift it, or suit its weight and occasion. */
export type ShoeIdea = "tone" | "lift" | "tailored" | "weight" | "easy";

export function shoeIdea(p: Pieces, occasion: Occasion, needs?: DayNeeds): ShoeIdea | null {
  const s = p.shoes;
  const fam = PALETTE[s.color].family;
  const body = [...upperLayers(p), p.bottom];
  const dark = body.filter((i) => PALETTE[i.color].lightness < 0.4).length >= Math.ceil(body.length * 0.6);
  if (dark && PALETTE[s.color].lightness >= 0.85) return "lift";
  const tailored = p.bottom.kind === "trousers" || p.outer?.kind === "blazer" || p.outer?.kind === "overcoat";
  if (s.kind === "loafers" && tailored && occasion !== "weekend") return "tailored";
  if (s.kind === "boots" && (needs?.wet || (needs && needs.coldest <= 3) || (p.outer && HEAVY_OUTER.has(p.outer.material)) || HEAVY_BOTTOM.has(p.bottom.material))) return "weight";
  // Trail shoes carry a wet or cold day the way boots do, and suit technical layers.
  if (s.kind === "trail" && (needs?.wet || (needs && needs.coldest <= 6) || p.outer?.material === "technical" || p.bottom.kind === "cargos")) return "weight";
  if (EASY_SHOES.has(s.kind) && (occasion === "weekend" || occasion === "travel") && VOLUME[fitOf(p.bottom)] >= 2) return "easy";
  // Sandals belong with shorts or a loose, light trouser.
  if (s.kind === "sandals" && (p.bottom.kind === "shorts" || VOLUME[fitOf(p.bottom)] >= 2)) return "easy";
  if (fam === PALETTE[p.bottom.color].family || (p.outer && fam === PALETTE[p.outer.color].family)) return "tone";
  return null;
}

/** Shoes that finish the look score up; shoes that fight it score down. */
export function shoeScore(p: Pieces, occasion: Occasion, needs?: DayNeeds): number {
  const s = p.shoes;
  let score = 0;
  const idea = shoeIdea(p, occasion, needs);
  if (idea === "lift") score += 0.5;
  else if (idea === "tailored") score += 0.4;
  else if (idea === "weight" || idea === "easy" || idea === "tone") score += 0.3;
  // Boots weigh down a light, dry look with nothing heavy in it.
  if (s.kind === "boots" && idea !== "weight") score -= 0.4;
  // Sweatpants are sporty: trainers only, never boots or loafers. And they're an
  // occasional weekend choice, not the default bottom.
  if (p.bottom.kind === "sweatpants") {
    score -= s.kind === "boots" || s.kind === "loafers" ? 4 : 0.3;
    if (s.kind === "runners" || s.kind === "canvas") score += 0.3;
  }
  // Runners read too casual for a client.
  if (CASUAL_SHOES.has(s.kind) && occasion === "client") score -= 0.4;
  // Sandals under layers or with tailoring look like a mistake.
  if (s.kind === "sandals" && (p.outer || p.bottom.kind === "trousers")) score -= 1.5;
  return score;
}

/** One deliberate colour against neutrals: a styling idea for fresh and bold looks. */
export function accentScore(p: Pieces, tier: Tier): number {
  if (!accentPiece(p)) return 0;
  // Easy is the quiet look: given the choice, it reaches for the navy knit, not the mustard one.
  return tier === "fresh" ? 0.35 : tier === "bold" ? 0.4 : -0.8;
}

export const CREATIVE_RECIPES = new Set<RecipeId>(["open-shirt", "high-low", "roll-neck"]);

/** How much a look's styling idea is worth, per tier: bold looks must have one. */
export function creativityScore(p: Pieces, recipe: RecipeId, tonal: boolean, tier: Tier): number {
  // Proportion shapes every tier (seasonScore); it isn't a styling idea on its own.
  const idea = CREATIVE_RECIPES.has(recipe) || tonal || columnOf(p) !== null;
  let score = 0;
  if (tier === "bold") score += idea ? 2.4 : -1;
  else if (tier === "fresh" && idea) score += 0.6;
  if (isMuddy(p)) score -= 2.6;
  return score;
}
