import { MATERIAL_LABEL } from "../kinds";
import { PALETTE, type ColorFamily } from "../palette";
import type { Item, Occasion, Pieces, RecipeId } from "../types";
import { upperLayers } from "./rules";
import { columnOf, isOpenShirtLayer, proportionIdea, shoeIdea } from "./style";

export const OCCASION_LABEL: Record<Occasion, string> = {
  office: "Office",
  client: "Customer meeting",
  weekend: "Weekend",
  dinner: "Dinner out",
  travel: "Travel",
};

const OCCASION_PHRASE: Record<Occasion, string> = {
  office: "office day",
  client: "client day",
  weekend: "weekend",
  dinner: "dinner out",
  travel: "travel day",
};

const RECIPE_LABEL: Record<RecipeId, string> = {
  single: "Clean and simple",
  layered: "Easy layers",
  "collar-out": "Collar out",
  "open-overshirt": "Open overshirt",
  gilet: "Gilet layer",
  "smart-soft": "Smart soft",
  "two-layer": "Jacket on",
  "three-layer": "Three layers",
  "high-low": "High-low",
  "open-shirt": "Open shirt",
  "roll-neck": "Roll neck, tailored",
};

/** Extra boldness a recipe brings on top of the pieces themselves. */
export const RECIPE_BOLDNESS: Record<RecipeId, number> = {
  single: 0,
  layered: 0,
  "collar-out": 0,
  "open-overshirt": 0,
  gilet: 1,
  "smart-soft": 0,
  "two-layer": 0,
  "three-layer": 1,
  "high-low": 2,
  "open-shirt": 1,
  "roll-neck": 1,
};

// A hood under these is streetwear, not high-low.
const SPORTY_OUTERS = new Set(["bomber", "puffer", "rain-shell", "denim-jacket"]);

export function recipeOf(p: Pieces): RecipeId {
  const { base, mid, outer } = p;
  if (!mid && !outer) return "single";
  if (isOpenShirtLayer(p)) return "open-shirt";
  // High-low is sporty under smart. A hood under a bomber, puffer or shell is just streetwear.
  // High-low is sporty under smart. A hood under a bomber, puffer or shell is just streetwear,
  // and a sweatshirt needs real tailoring (a blazer or an overcoat) to play against.
  if (mid?.kind === "hoodie" && outer && !SPORTY_OUTERS.has(outer.kind) && outer.kind !== "chore-coat") return "high-low";
  if (mid?.kind === "sweatshirt" && (outer?.kind === "blazer" || outer?.kind === "overcoat")) return "high-low";
  if ((base.neckline === "turtle" || base.neckline === "mock") && (outer?.kind === "blazer" || outer?.kind === "overcoat") && (!mid || mid.front === "open")) {
    return "roll-neck";
  }
  if (outer?.kind === "blazer" && !mid) return "smart-soft";
  if (base.neckline === "collar" && mid && (mid.neckline === "crew" || mid.neckline === "v") && mid.front === "closed") {
    return "collar-out";
  }
  if (mid?.kind === "overshirt" && !outer) return "open-overshirt";
  if (mid?.kind === "gilet") return "gilet";
  if (mid && outer) return "three-layer";
  if (outer) return "two-layer";
  return "layered";
}

const FAMILY_WORD: Record<ColorFamily, string> = {
  white: "cream",
  brown: "brown",
  green: "olive",
  blue: "blue",
  grey: "grey",
  black: "black",
  red: "red",
  yellow: "ochre",
  pink: "pink",
};

/** Every upper layer in one colour family, at different depths. */
export function tonalFamily(p: Pieces): ColorFamily | null {
  const layers = upperLayers(p);
  if (layers.length < 2) return null;
  const families = new Set(layers.map((i) => PALETTE[i.color].family));
  if (families.size !== 1) return null;
  const family = PALETTE[layers[0]!.color].family;
  if (family === "black") return null;
  // Tonal means one family at different depths: every neighbouring pair must differ.
  for (let i = 1; i < layers.length; i++) {
    if (Math.abs(PALETTE[layers[i - 1]!.color].lightness - PALETTE[layers[i]!.color].lightness) < 0.08) return null;
  }
  return family;
}

export function lookName(p: Pieces, occasion: Occasion): string {
  const tonal = tonalFamily(p);
  const column = columnOf(p);
  const recipe = recipeOf(p);
  const label = tonal
    ? `Tonal ${FAMILY_WORD[tonal]}`
    : column && (recipe === "single" || recipe === "layered" || recipe === "two-layer")
      ? `${FAMILY_WORD[PALETTE[column.color].family].replace(/^./, (c) => c.toUpperCase())} column`
      : RECIPE_LABEL[recipe];
  return `${label}, ${OCCASION_PHRASE[occasion]}`;
}

export function lower(item: Item): string {
  return item.name.charAt(0).toLowerCase() + item.name.slice(1);
}

/** "a" or "an" before a piece's name, by how it sounds. */
export function aOrAn(item: Item): string {
  const name = lower(item);
  // "u" sounds like "you" before a single consonant and a vowel (utility, uniform).
  const an = /^[aeio]/i.test(name) || (/^u/i.test(name) && !/^u[b-df-hj-np-tv-z][aeiou]/i.test(name));
  return an ? `an ${name}` : `a ${name}`;
}

/** A piece's name with a leading capital article, for the start of a sentence. */
function AOrAn(item: Item): string {
  const s = aOrAn(item);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const TEXTURED = new Set(["knit", "wool", "suede", "waxed", "corduroy", "denim", "fleece", "canvas"]);

export function textureContrast(p: Pieces): [Item, Item] | null {
  const pieces = [...upperLayers(p).reverse(), p.bottom];
  for (let i = 0; i < pieces.length; i++) {
    for (let j = i + 1; j < pieces.length; j++) {
      const a = pieces[i]!;
      const b = pieces[j]!;
      if (a.material !== b.material && TEXTURED.has(a.material) && TEXTURED.has(b.material)) return [a, b];
    }
  }
  return null;
}

/** Plain-language reasons the look works, most specific first. */
export function lookNotes(p: Pieces, shed?: { layer: Item; backOn: boolean }, wet = false, occasion?: Occasion): string[] {
  const notes: string[] = [];
  const { base, mid, outer } = p;
  switch (recipeOf(p)) {
    case "collar-out":
      notes.push(`Wear the ${lower(base)} collar out over the ${lower(mid!)}.`);
      break;
    case "open-overshirt":
      notes.push(`Leave the ${lower(mid!)} open so the ${lower(base)} shows.`);
      break;
    case "three-layer":
      notes.push(
        outer!.thickness >= mid!.thickness
          ? `Three layers, thickest on the outside: ${lower(base)}, ${lower(mid!)}, ${lower(outer!)}.`
          : `Three layers: ${lower(base)}, ${lower(mid!)}, and the ${lower(outer!)} over the top.`,
      );
      break;
    case "high-low":
      notes.push(
        outer!.kind === "blazer" || outer!.kind === "overcoat"
          ? `${AOrAn(mid!)} under ${aOrAn(outer!)} keeps the tailoring relaxed.`
          : `${AOrAn(mid!)} under ${aOrAn(outer!)}: sporty under smart, on purpose.`,
      );
      break;
    case "open-shirt":
      notes.push(
        outer
          ? `Wear the ${lower(mid!)} unbuttoned over the ${lower(base)}, like a light jacket under the ${lower(outer)}.`
          : `Wear the ${lower(mid!)} unbuttoned over the ${lower(base)}, sleeves rolled.`,
      );
      break;
    case "roll-neck":
      notes.push(`${AOrAn(base)} under the ${lower(outer!)} is as smart as a shirt, and simpler.`);
      break;
    case "smart-soft":
      notes.push(`${AOrAn(base)} under ${aOrAn(outer!)} looks sharp without a tie.`);
      break;
    case "gilet":
      notes.push(`The ${lower(mid!)} adds warmth without hiding the ${lower(base)}.`);
      break;
    case "two-layer":
      notes.push(`Keep the ${lower(outer!)} open over the ${lower(base)}.`);
      break;
    case "layered":
      notes.push(
        base.length > (mid?.length ?? 0)
          ? `Let the ${lower(base)} hem show just below the ${lower(mid!)}.`
          : `A simple two-layer stack: ${lower(base)} under ${lower(mid!)}.`,
      );
      break;
    case "single":
      notes.push(`One good ${lower(base)} carries it. Keep everything else quiet.`);
      break;
  }

  const tonal = tonalFamily(p);
  const column = columnOf(p);
  const accents = [...upperLayers(p), p.bottom, p.shoes].filter((i) => !PALETTE[i.color].neutral);
  const accent = accents.length === 1 ? accents[0]! : null;
  if (tonal) notes.push(`The layers are all ${FAMILY_WORD[tonal]} tones, a different depth on each.`);
  else if (column) notes.push(`The ${lower(column)} and ${lower(p.bottom)} make one long line${outer ? `, framed by the ${lower(outer)}` : ""}.`);
  else if (accent?.slot === "shoes") notes.push(`The ${lower(accent)} are the one bit of colour; everything else stays quiet.`);
  else if (accent && outer && accent !== outer) notes.push(`The ${lower(accent)} is the one colour, showing under the ${lower(outer)}.`);
  else if (accent) notes.push(`One colour does the talking: the ${lower(accent)}.`);
  else if (accents.length === 0) notes.push(textureContrast(p) ? "Neutrals throughout, so the texture carries it." : "Neutrals throughout: quiet and easy.");

  const idea = proportionIdea(p);
  if (idea && notes.length < 3) {
    const top = outer ?? mid ?? base;
    if (idea === "a-line") notes.push(`Slim on top, wide below: the ${lower(base)} keeps the ${lower(p.bottom)} looking deliberate.`);
    else if (idea === "easy-line") notes.push(`Roomy through the top and the ${lower(p.bottom)}: one easy, generous line.`);
    else notes.push(`The cropped ${lower(top)} stops at the waist, so let the layer underneath show below it.`);
  }

  const shoe = occasion ? shoeIdea(p, occasion) : null;
  if (shoe && notes.length < 3) {
    const s = lower(p.shoes);
    if (shoe === "lift") notes.push(`The ${s} lift all that dark; they keep it from feeling heavy.`);
    else if (shoe === "tailored") notes.push(`The ${s} finish the tailoring where trainers would undercut it.`);
    else if (shoe === "weight" && p.shoes.kind === "trail") {
      if (wet) notes.push(`The ${s} have the grip for a wet day.`);
    } else if (shoe === "weight") notes.push(`The ${s} have the weight to carry the heavier pieces.`);
    else if (shoe === "easy") notes.push(`The ${s} keep the relaxed line easy.`);
    else notes.push(`The ${s} pick up the ${lower(p.outer && PALETTE[p.shoes.color].family === PALETTE[p.outer.color].family ? p.outer : p.bottom)}, so the look holds together.`);
  }

  const contrast = textureContrast(p);
  if (contrast && notes.length < 3) {
    notes.push(`${MATERIAL_LABEL[contrast[0].material]} against ${MATERIAL_LABEL[contrast[1].material].toLowerCase()} adds texture.`);
  }

  // Nobody takes a rain jacket off at midday in the rain.
  if (shed && !(wet && shed.layer.waterproof) && occasion !== "dinner") {
    notes.unshift(
      shed.backOn
        ? `Take the ${lower(shed.layer)} off around midday and put it back on after 5.`
        : `Take the ${lower(shed.layer)} off around midday.`,
    );
  } else if (wet && outer?.waterproof) {
    notes.unshift(outer.kind === "puffer" ? `Rain is likely. The ${lower(outer)} will shed a shower.` : `Rain is likely. The ${lower(outer)} has it covered.`);
  }
  return notes.slice(0, 3);
}
