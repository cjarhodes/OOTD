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
  } else if (needs.warmest >= 20 && dry) {
    if (p.mid?.kind === "gilet") score -= 1.5;
    if (p.base.kind === "turtleneck") score -= 1.2;
  }
  // A technical shell on a dry, calm day reads as a mistake.
  if (p.outer?.kind === "rain-shell" && dry && !needs.windy) score -= 2.5;
  // A camp collar is a summer shirt: fine on a warm day, lost in midwinter.
  const camp = p.base.kind === "camp-shirt" || p.mid?.kind === "camp-shirt";
  if (camp && needs.coldest <= 8) score -= 4;
  else if (camp && needs.coldest < 14) score -= 1.5;
  if (needs.coldest <= 4 && p.shoes.kind === "loafers") score -= 0.4;
  return score + fabricScore(p, needs) + pairingScore(p) + proportionScore(p);
}

const FLEECE_MIDS = new Set(["hoodie", "sweatshirt", "fleece"]);
const COLLARED_BASES = new Set(["oxford", "polo", "rugby", "flannel", "camp-shirt"]);

/** Pairings that are allowed but rarely look right: what goes under what. */
export function pairingScore(p: Pieces): number {
  let score = 0;
  const { base, mid, outer } = p;
  if (mid && FLEECE_MIDS.has(mid.kind)) {
    // A shirt buried under a sweatshirt adds bulk and shows nothing; a tee belongs there. Worse for a dress shirt.
    if (COLLARED_BASES.has(base.kind)) score -= base.formality >= 4 ? 5 : 4;
    // Boxy fleece breaks a blazer's line. Under a long coat a hoodie can work; a sweatshirt rarely does.
    if (outer?.kind === "blazer") score -= 3;
    else if (outer?.kind === "overcoat" && mid.kind !== "hoodie") score -= 3;
    // Fleece under a boxy jacket over roomy trousers is all bulk and no shape.
    if (outer && VOLUME[fitOf(outer)] >= 2.5 && VOLUME[fitOf(p.bottom)] >= 2) score -= 2;
  }
  // Sweatpants are for a tee, a sweatshirt and trainers: not a shirt (buttoned or open), a coat or a leather jacket.
  if (p.bottom.kind === "sweatpants") {
    const shirt = COLLARED_BASES.has(base.kind) || (mid && COLLARED_BASES.has(mid.kind));
    const smartOuter = outer && (["overcoat", "blazer", "chore-coat", "waxed-jacket"].includes(outer.kind) || outer.material === "leather" || outer.material === "suede");
    if (shirt || smartOuter) score -= 4;
  }
  // A rugby shirt's stripes are the point; a jumper hides them.
  if (base.kind === "rugby" && mid && mid.front === "closed") score -= 1.5;
  // Workwear trousers under a tailored coat look like two outfits.
  if (outer && outer.formality >= 4 && p.bottom.formality <= 1 && (p.bottom.kind === "cargos" || VOLUME[fitOf(p.bottom)] >= 3)) score -= 1.5;
  // Linen is for showing, not for layering under a jumper.
  if (base.material === "linen" && mid && mid.front === "closed") score -= 1.5;
  // An overshirt is a jacket: under a coat, blazer or chore coat it is one jacket too many.
  if (mid?.kind === "overshirt" && outer && ["overcoat", "blazer", "chore-coat"].includes(outer.kind)) score -= 5;
  // A roll or mock neck fills the neckline on its own; an open shirt over it is fussy.
  if (isOpenShirtLayer(p) && (base.neckline === "turtle" || base.neckline === "mock")) score -= 4;
  // A polo's soft collar under a closed knit crumples; an oxford collar holds its shape.
  if (base.kind === "polo" && mid && mid.front === "closed" && (mid.neckline === "crew" || mid.neckline === "v")) score -= 1.2;
  // Denim on denim only works when the washes clearly differ. A shirt or jacket in the same
  // blue as the jeans reads the same way, whatever it's woven from.
  const legDenim = p.bottom.material === "denim" || p.bottom.color === "Denim" || p.bottom.color === "Indigo";
  if (legDenim) {
    const shirtLike = (i?: Item) => i && (i.material === "denim" || i.kind === "denim-jacket" || ((i.kind === "oxford" || i.kind === "flannel") && PALETTE[i.color].family === "blue"));
    const top = [base, mid, outer].find(shirtLike);
    if (top) score -= Math.abs(PALETTE[top.color].lightness - PALETTE[p.bottom.color].lightness) < 0.15 ? 3 : 0.5;
  }
  return score;
}

/** Shoes that rain ruins. */
const RAIN_FRAGILE = new Set(["suede", "canvas", "knit"]);
export const rainRuins = (shoes: Item) => RAIN_FRAGILE.has(shoes.material);
const SMART: Occasion[] = ["office", "client", "dinner"];
const isBoatShoe = (i: Item) => i.kind === "loafers" && i.formality <= 2;

/**
 * Cloth has a season. Corduroy and heavy coats are for the cold, linen for
 * the heat, and shoes have to survive the day's weather.
 */
export function fabricScore(p: Pieces, needs: DayNeeds): number {
  let score = 0;
  for (const i of [...upperLayers(p), p.bottom]) {
    const weight = i.slot === "bottom" ? 1 : 0.6;
    if (i.material === "corduroy") {
      if (needs.warmest >= 24) score -= 6 * weight;
      else if (needs.warmest >= 20) score -= 4 * weight;
      else if (needs.warmest <= 15) score += 0.4;
    }
    if (i.material === "linen") {
      if (needs.warmest < 20) score -= 5 * weight;
      else if (needs.coldest < 12) score -= 4 * weight;
      else if (needs.warmest >= 24) score += 0.5;
      if (needs.wet) score -= 3 * weight;
    }
    // Denim on the top half is heavy in real heat.
    if (i.slot !== "bottom" && (i.material === "denim" || i.kind === "denim-jacket") && needs.warmest >= 27) score -= 2;
  }
  // Jeans are heavy in real heat.
  if (p.bottom.kind === "jeans" && needs.warmest >= 27) score -= 1.5;
  // Heavy cloth on the top half in warm weather: a wool shirt jacket, a tweed jacket, a thick cardigan.
  for (const i of [p.mid, p.outer]) {
    if (i && (i.material === "wool" || i.material === "fleece") && i.warmth >= 3 && needs.warmest >= 20) score -= needs.warmest >= 24 ? 6 : 4;
  }
  // Suede is for dry days, jackets as much as shoes.
  if (needs.wet && p.outer?.material === "suede") score -= 6;
  // A winter coat on a mild day, or a puffer when it isn't properly cold.
  if (p.outer && p.outer.warmth >= 5) score -= needs.warmest >= 17 ? 3 : needs.warmest >= 13.5 ? 1.5 : 0;
  // And in real cold the coat is what keeps him warm: a bomber or chore coat won't, and no coat at all is a mistake.
  if (needs.coldest <= 5 && p.outer && p.outer.warmth < 5) score -= 3;
  if (needs.coldest <= 12 && needs.warmest < 17 && !p.outer) score -= 3;
  // A blazer is no coat in a cold wind.
  if (p.outer?.kind === "blazer" && needs.windy && needs.coldest < 10) score -= 2;
  if (p.outer && p.outer.warmth >= 7 && needs.coldest >= 9) score -= 6;
  // Pale trousers show every splash.
  if (needs.wet && PALETTE[p.bottom.color].lightness >= 0.7) score -= 2;

  const s = p.shoes;
  if (needs.wet) {
    if (RAIN_FRAGILE.has(s.material)) score -= 6;
    else if (PALETTE[s.color].lightness >= 0.85 && s.kind !== "trail") score -= 2.5;
  }
  // Open or thin shoes in the cold.
  if (needs.coldest < 8) {
    if (s.kind === "clogs" || isBoatShoe(s)) score -= 6;
    else if (s.kind === "canvas" || s.kind === "high-tops") score -= needs.coldest < 3 ? 4 : 2;
    else if (s.kind === "loafers" && needs.coldest < 5) score -= 1.5;
  }
  // Below about 5° it's boots: trainers, knit and canvas are thin, and suede trainers suffer.
  if (needs.coldest <= 5 && s.kind !== "boots") {
    if (s.kind === "sneakers") score -= s.material === "knit" || s.material === "suede" ? 4 : 2.5;
    else if (s.kind === "runners" || s.kind === "trail") score -= 1;
  }
  // Boots belong with trousers that have some weight: not linen, never shorts.
  if (s.kind === "boots" && p.bottom.kind === "shorts") score -= 4;
  else if (s.kind === "boots" && p.bottom.material === "linen") score -= 2;
  // A dark column from collar to hem is heavy in real heat.
  if (needs.warmest >= 27 && PALETTE[p.bottom.color].lightness < 0.35 && PALETTE[(p.mid ?? p.base).color].lightness < 0.35) score -= 1.5;
  // Boat shoes are for warm days and bare ankles.
  if (isBoatShoe(s) && needs.warmest < 20) score -= 2;
  // Boots in the heat.
  if (s.kind === "boots" && !needs.wet) {
    if (needs.warmest >= 24) score -= 1.5;
    else if (needs.warmest >= 20) score -= 0.6;
  }
  return score;
}

/**
 * Dressed for where you're going. Sporty shoes, fleece and technical jackets
 * are fine at the weekend and wrong for a customer.
 */
export function occasionScore(p: Pieces, occasion: Occasion, needs?: DayNeeds): number {
  let score = 0;
  const s = p.shoes.kind;
  const sporty = s === "trail" || s === "runners" || s === "sandals";
  const casualCanvas = s === "canvas" || s === "high-tops";
  // Trail shoes go with jeans, cargos, sweatpants and shorts, never proper trousers.
  if (s === "trail" && !["jeans", "cargos", "sweatpants", "shorts"].includes(p.bottom.kind)) score -= 2;
  if (occasion === "client") {
    if (sporty || s === "clogs" || casualCanvas) score -= 5;
    else if (s === "sneakers") score -= PALETTE[p.shoes.color].neutral ? 1 : 2.5;
  } else if (occasion === "office") {
    if (sporty || s === "clogs") score -= 4;
    else if (casualCanvas) score -= 2;
  } else if (occasion === "dinner") {
    if (sporty) score -= 4;
    else if (s === "clogs") score -= 3;
    else if (casualCanvas) score -= 1.5;
  }
  if (SMART.includes(occasion)) {
    const weight = occasion === "client" ? 1 : occasion === "dinner" ? 0.6 : 0.4;
    if (p.mid && FLEECE_MIDS.has(p.mid.kind)) score -= 5 * weight;
    if (p.outer) {
      // A technical or sporty jacket, unless it's there for the rain.
      if (p.outer.formality <= 1) score -= 3 * weight;
      // A customer gets a blazer or a proper coat; a chore coat is workwear. Dinner is looser.
      else if (p.outer.formality <= 2) score -= occasion === "client" ? 3 : occasion === "dinner" ? 1 : 0;
      // A bright jacket is a weekend piece.
      if (!PALETTE[p.outer.color].neutral) score -= 2.5 * weight;
    }
    if (p.base.formality <= 1) score -= 2.5 * weight;
    if (occasion === "client") {
      // A shirt for a customer; a polo wants a blazer over it.
      if (p.base.formality >= 4) score += 0.5;
      else if (p.base.kind === "polo" && p.outer?.kind !== "blazer") score -= 1;
    }
    // Jeans are fine at the office and at dinner; cargos aren't, and a customer gets proper trousers.
    if (p.bottom.kind === "cargos") score -= 3 * weight;
    else if (p.bottom.formality <= 1 && occasion === "client") score -= 2;
    if (p.bottom.kind === "shorts") score -= occasion === "dinner" ? 2 : 6;
    // Shoes clearly paler than the trousers pull the eye down; white trainers are the exception.
    if (p.shoes.kind !== "sneakers" && PALETTE[p.shoes.color].lightness - PALETTE[p.bottom.color].lightness > 0.15) score -= 0.6;
  } else if (needs && needs.warmest >= 27) {
    // Real heat, and nowhere smart to be: shorts and sandals.
    if (p.bottom.kind === "shorts") score += 1.2;
    if (s === "sandals") score += 0.6;
  }
  return score;
}

/**
 * What reads as current, in small weights so it tips a choice without
 * overruling the rules: room in the leg, brown before black, loafers and
 * suede, a knit polo on a warm day.
 */
export function trendScore(p: Pieces, occasion: Occasion, needs?: DayNeeds): number {
  let score = 0;
  const leg = VOLUME[fitOf(p.bottom)];
  if (p.bottom.kind !== "shorts") score += leg >= 2 ? 0.3 : leg <= 0 ? -0.3 : 0;
  const s = p.shoes;
  const dry = !needs?.wet;
  if (s.kind === "loafers" && s.formality >= 3 && occasion !== "travel" && dry) score += 0.4;
  if (s.material === "suede" && dry) score += 0.2;
  // Brown is the dark neutral of the moment; black is for the smartest days.
  const dark = [p.outer, p.shoes].filter((i): i is Item => Boolean(i));
  for (const i of dark) {
    if (PALETTE[i.color].family === "brown" && PALETTE[i.color].lightness < 0.6) score += 0.2;
  }
  if (p.base.kind === "polo" && p.base.material === "knit" && (needs?.warmest ?? 20) >= 18) score += 0.4;
  if (p.outer?.kind === "blazer" && (p.base.kind === "polo" || p.base.kind === "tee") && !p.mid && occasion !== "client") score += 0.3;
  return score;
}

/** One colour family from the visible inner layer down through the trousers. */
export function columnOf(p: Pieces): Item | null {
  const inner = p.mid ?? p.base;
  const a = PALETTE[inner.color];
  const b = PALETTE[p.bottom.color];
  // One colour, or as near as makes no difference: white over ecru is a near miss, not a column.
  if (a.family !== b.family || (inner.color !== p.bottom.color && Math.abs(a.lightness - b.lightness) > 0.06)) return null;
  // With a jacket on, the column needs the jacket to frame it.
  if (p.outer && (Math.abs(PALETTE[p.outer.color].lightness - a.lightness) < 0.2 || !PALETTE[p.outer.color].neutral)) return null;
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
  if (dark && PALETTE[s.color].lightness >= 0.85 && ["sneakers", "canvas", "high-tops"].includes(s.kind)) return "lift";
  // Tailoring is wool trousers, a blazer or an overcoat; cords and linen aren't, and boat shoes don't finish it.
  const tailored =
    (p.bottom.kind === "trousers" && p.bottom.material !== "corduroy" && p.bottom.material !== "linen") || p.outer?.kind === "blazer" || p.outer?.kind === "overcoat";
  if (s.kind === "loafers" && s.formality >= 3 && tailored && occasion !== "weekend") return "tailored";
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
  // Sweatpants are sporty: trainers only, never boots, loafers, clogs or sandals. And they're an
  // occasional weekend choice, not the default bottom.
  if (p.bottom.kind === "sweatpants") {
    score -= ["sneakers", "runners", "canvas"].includes(s.kind) ? 0.3 : 4;
    if (s.kind === "runners" || s.kind === "canvas") score += 0.3;
  }
  // Black shoes under brown trousers, or brown under black, look like two outfits.
  const shoeFam = PALETTE[s.color].family;
  const legFam = PALETTE[p.bottom.color].family;
  // Black shoes go with black, grey, navy and dark denim; brown, olive and khaki want brown.
  if (shoeFam === "black" && (legFam === "brown" || legFam === "green" || p.bottom.color === "Stone")) score -= 0.9;
  if (shoeFam === "brown" && legFam === "black") score -= SMART.includes(occasion) ? 1.5 : 0.6;
  if (shoeFam === "brown" && p.outer && PALETTE[p.outer.color].family === "black" && p.outer.formality >= 3) score -= 0.8;
  // Sandals under layers or with tailoring look like a mistake.
  if (s.kind === "sandals" && (p.outer || p.bottom.kind === "trousers")) score -= 1.5;
  return score;
}

/** One deliberate colour against neutrals: a styling idea for fresh and bold looks, and too much for an easy one. */
export function accentScore(p: Pieces, tier: Tier): number {
  if (tier === "easy") {
    // Easy is the quiet look: it reaches for the navy knit, not the mustard one, and never a bright jacket.
    const coloured = [...upperLayers(p), p.bottom, p.shoes].some((i) => !PALETTE[i.color].neutral);
    return (coloured ? -0.8 : 0) + (p.outer && !PALETTE[p.outer.color].neutral ? -1.5 : 0);
  }
  const accent = accentPiece(p);
  // Coloured shoes are fine, but they aren't the idea of a look.
  if (!accent || accent.slot === "shoes") return 0;
  return tier === "fresh" ? 0.35 : 0.4;
}

export const CREATIVE_RECIPES = new Set<RecipeId>(["open-shirt", "high-low", "roll-neck"]);

/** How much a look's styling idea is worth, per tier: bold looks must have one. */
export function creativityScore(p: Pieces, recipe: RecipeId, tonal: boolean, tier: Tier): number {
  // Proportion shapes every tier (seasonScore); it isn't a styling idea on its own.
  const idea = CREATIVE_RECIPES.has(recipe) || tonal || columnOf(p) !== null;
  let score = 0;
  if (tier === "bold") score += idea ? 3 : -1.2;
  else if (tier === "fresh" && idea) score += 0.6;
  if (isMuddy(p)) score -= 8;
  return score;
}
