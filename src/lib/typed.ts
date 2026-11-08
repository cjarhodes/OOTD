import { KINDS, makeItem } from "./kinds";
import { COLOR_NAMES, type ColorName } from "./palette";
import type { Item, Kind, Material } from "./types";

/**
 * Pieces typed in by name ("White Converse high tops, brown Birkenstock
 * Arizonas"), so a wardrobe can be listed without photos. Each line is matched
 * to a kind, colour and material from the words in it, including the shoe
 * models men tend to own. Anything unmatched is left for the person to pick.
 */
export interface TypedPiece {
  name: string;
  kind: Kind | null;
  color: ColorName;
  material?: Material;
  /** The colour wasn't in the text: it's the model's usual colour, or white. */
  colorGuessed: boolean;
}

interface Hint {
  re: RegExp;
  kind?: Kind;
  material?: Material;
  /** The colour a model usually comes in, when the text doesn't say. */
  color?: ColorName;
}

/** First match wins, so specific models come before the words they contain. */
const HINTS: Hint[] = [
  { re: /\bbostons?\b|\bclogs?\b/, kind: "clogs", material: "suede" },
  { re: /\barizonas?\b|\bsandals?\b|\bslides?\b|\bflip[- ]?flops?\b|\bbirkenstocks?\b/, kind: "sandals", material: "leather" },
  { re: /\bhigh[- ]?tops?\b|\bhi[- ]?tops?\b/, kind: "high-tops", material: "canvas" },
  { re: /\bsalewa\b|\bwildfires?\b|\btrail\b|\bhik(?:e|er|ers|ing)\b|\bapproach\b|\bsalomons?\b|\bmerrells?\b|\bhokas?\b/, kind: "trail", material: "technical" },
  { re: /\bconverse\b|\bchucks?\b|\bvans\b|\bplimsolls?\b/, kind: "canvas", material: "canvas" },
  { re: /\bloafers?\b/, kind: "loafers" },
  { re: /\bchelsea\b|\bchukkas?\b|\bboots?\b/, kind: "boots" },
  { re: /\bnew balance\b|\brunners?\b|\brunning shoes?\b|\basics\b/, kind: "runners" },
  { re: /\bvejas?\b/, kind: "sneakers", material: "leather", color: "White" },
  { re: /\bc ?85s?\b|\bclub c\b|\breeboks?\b|\bstan smiths?\b|\bcommon projects\b|\bcourt\b/, kind: "sneakers", material: "leather", color: "White" },
  { re: /\bsneakers?\b|\btrainers?\b/, kind: "sneakers" },
  // Garments, in words people use.
  { re: /\bdenim jackets?\b|\btrucker\b/, kind: "denim-jacket" },
  { re: /\bt-?shirts?\b|\btees?\b/, kind: "tee" },
  { re: /\bjumpers?\b|\bsweaters?\b/, kind: "crewneck" },
  { re: /\bjoggers?\b|\bsweatpants\b|\bsweats\b|\btrack ?pants\b/, kind: "sweatpants" },
  { re: /\bpants\b|\bslacks\b/, kind: "trousers" },
  { re: /\bsuit jackets?\b|\bsport coats?\b/, kind: "blazer" },
  { re: /\bcoats?\b/, kind: "overcoat" },
];

/** Materials named in the text, or implied by the maker. */
const MATERIAL_HINTS: [RegExp, Material][] = [
  [/\brothy'?s?\b/, "knit"],
  [/\bsuede\b/, "suede"],
  [/\bleather\b/, "leather"],
  [/\bcanvas\b/, "canvas"],
  [/\bknit\b|\bmerino\b|\bcashmere\b|\blambswool\b/, "knit"],
  [/\blinen\b/, "linen"],
  [/\bcord(?:uroy)?s?\b/, "corduroy"],
  [/\bfleece\b/, "fleece"],
  [/\bwool\b|\btweed\b/, "wool"],
  [/\bdenim\b/, "denim"],
];

/** Everyday colour words, mapped to the nearest swatch. */
const COLOUR_WORDS: [RegExp, ColorName][] = [
  [/\boff[- ]?white\b|\bcream\b|\bivory\b|\bnatural\b/, "Ecru"],
  [/\blight blue\b|\bpale blue\b/, "Sky"],
  [/\bdark blue\b|\bmidnight\b/, "Navy"],
  [/\bgr[ae]y\b|\bheather\b/, "Grey"],
  [/\btaupe\b|\bbeige\b/, "Stone"],
  [/\btan\b/, "Camel"],
  [/\bgreen\b|\bkhaki green\b/, "Olive"],
  [/\bblue\b/, "Denim"],
  [/\bmaroon\b|\bwine\b|\boxblood\b/, "Burgundy"],
  [/\bcharcoal\b/, "Charcoal"],
  [/\bbrown\b|\bcognac\b/, "Brown"],
  [/\bdark brown\b|\bespresso\b/, "Chocolate"],
];

/** Garment kinds by their own names, longest first ("denim jacket" before "jacket"). */
const KIND_WORDS: [RegExp, Kind][] = (Object.keys(KINDS) as Kind[])
  .map((k): [string, Kind] => [KINDS[k].label, k])
  .sort((a, b) => b[0].length - a[0].length)
  .map(([label, k]) => [new RegExp(`\\b${label.replace(/[-\s]/g, "[- ]?")}s?\\b`), k]);

/** The first colour in the text, ignoring asides like "(with grey accents)". */
function colourIn(text: string): ColorName | null {
  const plain = text.replace(/\([^)]*\b(?:accents?|trim|details?|sole|laces|stripes?|logo)\b[^)]*\)/g, " ");
  let best: { at: number; color: ColorName } | null = null;
  const consider = (re: RegExp, color: ColorName) => {
    const m = re.exec(plain);
    if (m && (!best || m.index < best.at)) best = { at: m.index, color };
  };
  for (const c of COLOR_NAMES) consider(new RegExp(`\\b${c.toLowerCase()}\\b`), c);
  for (const [re, c] of COLOUR_WORDS) consider(re, c);
  return (best as { at: number; color: ColorName } | null)?.color ?? null;
}

export function parsePiece(line: string): TypedPiece | null {
  const name = line
    .replace(/^\s*(?:[-*•·]|\d+[.)])\s*/, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  if (!name) return null;
  const text = name.toLowerCase();
  const hint = HINTS.find((h) => h.re.test(text));
  const kind = hint?.kind ?? KIND_WORDS.find(([re]) => re.test(text))?.[1] ?? null;
  const material = MATERIAL_HINTS.find(([re]) => re.test(text))?.[1] ?? hint?.material;
  const said = colourIn(text);
  return {
    name: name.charAt(0).toUpperCase() + name.slice(1),
    kind,
    color: said ?? hint?.color ?? "White",
    ...(material ? { material } : {}),
    colorGuessed: !said,
  };
}

/** One piece per line, or per comma (commas inside brackets don't split). */
export function parseList(text: string): TypedPiece[] {
  return text
    .split(/\n|,(?![^(]*\))|;/)
    .map(parsePiece)
    .filter((p): p is TypedPiece => p !== null);
}

/** The piece a typed line becomes, once it has a kind. */
export function typedItem(p: TypedPiece & { kind: Kind }, id: string): Item {
  return makeItem({ id, name: p.name, kind: p.kind, color: p.color, ...(p.material ? { material: p.material } : {}) });
}
