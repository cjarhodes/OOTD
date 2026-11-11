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
  // Smart leather shoes have no type of their own; loafers dress the same way.
  { re: /\bbrogues?\b|\bderb(?:y|ies)\b|\bdress shoes?\b|\bmonk[- ]?straps?\b/, kind: "loafers", material: "leather" },
  { re: /\bchelsea\b|\bchukkas?\b|\bboots?\b|\b(?:dr\.?|doc) ?martens\b|\btimberlands?\b|\bblundstones?\b|\bred wings?\b|\bwallabees?\b/, kind: "boots" },
  // Retro sneakers by model, before the runner brands that also make them.
  { re: /\bpumas?\b|\bgazelles?\b|\bspezials?\b|\bcampus\b|\bsuede sneakers?\b/, kind: "sneakers", material: "suede" },
  { re: /\bsambas?\b|\bmexico 66s?\b|\bonitsuka\b|\bcortez\b|\bair force 1s?\b|\baf1s?\b|\b550s?\b|\bkillshots?\b/, kind: "sneakers", material: "leather" },
  { re: /\bnew balance\b|\brunners?\b|\brunning shoes?\b|\basics\b|\bair max\b|\bpegasus\b|\bultra ?boosts?\b/, kind: "runners" },
  { re: /\bvejas?\b/, kind: "sneakers", material: "leather", color: "White" },
  { re: /\bc ?85s?\b|\bclub c\b|\breeboks?\b|\bstan smiths?\b|\bcommon projects\b|\bcourt\b/, kind: "sneakers", material: "leather", color: "White" },
  { re: /\bsneakers?\b|\btrainers?\b/, kind: "sneakers" },
  // Garments, in words people use.
  { re: /\bdenim jackets?\b|\btrucker\b/, kind: "denim-jacket" },
  { re: /\bbarbour\b|\bwax(?:ed)? jackets?\b/, kind: "waxed-jacket", color: "Olive" },
  // No type for these either; a bomber is the nearest short jacket.
  { re: /\bleather jackets?\b|\bbiker jackets?\b|\bharringtons?\b|\bcoach jackets?\b/, kind: "bomber" },
  { re: /\bparkas?\b|\bdown jackets?\b|\bpuffa\b/, kind: "puffer" },
  { re: /\brain ?(?:coat|jacket)s?\b|\bwaterproofs?\b|\banoraks?\b|\bwindbreakers?\b|\bcagoules?\b|\bgore-?tex\b/, kind: "rain-shell" },
  { re: /\bsuit jackets?\b|\bsport coats?\b/, kind: "blazer" },
  { re: /\bpea ?coats?\b|\btrench\b|\btop ?coats?\b/, kind: "overcoat" },
  { re: /\b(?:polo|roll)[- ]?necks?\b/, kind: "turtleneck" },
  { re: /\bcrew[- ]?necks?\b/, kind: "crewneck" },
  { re: /\b(?:quarter|half|1\/4)[- ]?zips?\b/, kind: "quarter-zip" },
  { re: /\bbreton\b/, kind: "long-sleeve" },
  { re: /\b(?:checked|check|plaid|tartan)\b.*\bshirts?\b|\bshirts?\b.*\b(?:checked|check|plaid|tartan)\b/, kind: "flannel" },
  { re: /\blevi'?s\b|\b50[15]s?\b|\b511s?\b|\bwranglers?\b/, kind: "jeans" },
  { re: /\bjoggers?\b|\bsweatpants\b|\bsweats\b|\btrack ?pants\b/, kind: "sweatpants" },
  { re: /\bbody ?warmers?\b/, kind: "gilet" },
];

/** Looser words, tried only when no garment is named outright: "linen shirt", "trench coat". */
const FALLBACKS: Hint[] = [
  { re: /\bt-?shirts?\b/, kind: "tee" },
  { re: /\bjumpers?\b|\bsweaters?\b|\bpullovers?\b/, kind: "crewneck" },
  { re: /\bfleeces?\b/, kind: "fleece" },
  { re: /\bflannels?\b/, kind: "flannel" },
  { re: /\bshirts?\b/, kind: "oxford" },
  { re: /\bpants\b|\bslacks\b|\bcords\b|\bcorduroys\b/, kind: "trousers" },
  { re: /\bcoats?\b/, kind: "overcoat" },
  { re: /\bnikes?\b|\badidas\b|\bshoes\b/, kind: "sneakers" },
];

/** Materials named in the text, or implied by the maker. */
const MATERIAL_HINTS: [RegExp, Material][] = [
  [/\brothy'?s?\b/, "knit"],
  [/\bsuedes?\b/, "suede"],
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
  // "light blue", "baby blue", "light/baby blue", "powder blue".
  [/\b(?:light|pale|baby|powder|ice)(?:[\s/-]+(?:light|pale|baby|powder|ice))?[\s/-]+blue\b/, "Sky"],
  [/\bdark blue\b|\bmidnight\b/, "Navy"],
  [/\b(?:light|stone|mid|bleach(?:ed)?)[- ]?wash(?:ed)?\b|\bstonewash(?:ed)?\b/, "Denim"],
  [/\b(?:dark|raw)[- ]?wash\b|\braw denim\b|\bselvedge\b/, "Indigo"],
  [/\b(?:dark|bottle|racing|hunter) green\b/, "Forest"],
  [/\bsand\b/, "Oatmeal"],
  [/\borange\b/, "Rust"],
  [/\byellow\b/, "Mustard"],
  [/\bsilver\b/, "Grey"],
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
  // Accent colours aren't the piece's colour: "(with grey accents)", "brown accented", "with gum soles".
  const plain = text
    .replace(/\([^)]*\b(?:accents?|accented|trim|details?|soles?|laces|stripes?|logos?)\b[^)]*\)/g, " ")
    .replace(/\b[\w/-]+[\s-]+(?:accented|accents?|trimmed)\b/g, " ")
    .replace(/\bwith [\w\s/-]+? (?:accents?|trim|details?|soles?|laces|stripes?|logos?)\b/g, " ");
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
  const kind = hint?.kind ?? KIND_WORDS.find(([re]) => re.test(text))?.[1] ?? FALLBACKS.find((h) => h.re.test(text))?.kind ?? null;
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

/**
 * One piece per line, or per comma (commas inside brackets don't split). A
 * fragment that is only a colour belongs to the piece before it:
 * "Patagonia fleece, cream" is one cream fleece.
 */
export function parseList(text: string): TypedPiece[] {
  const pieces: TypedPiece[] = [];
  for (const line of text.split("\n")) {
    let last: TypedPiece | null = null;
    for (const part of line.split(/,(?![^(]*\))|;/)) {
      const p = parsePiece(part);
      if (!p) continue;
      if (last && !p.kind && !p.colorGuessed && last.colorGuessed && p.name.split(" ").length <= 2) {
        last.name = `${last.name}, ${p.name.toLowerCase()}`.slice(0, 80);
        last.color = p.color;
        last.colorGuessed = false;
        continue;
      }
      pieces.push(p);
      last = p;
    }
  }
  return pieces;
}

/** The piece a typed line becomes, once it has a kind. */
export function typedItem(p: TypedPiece & { kind: Kind }, id: string): Item {
  return makeItem({ id, name: p.name, kind: p.kind, color: p.color, ...(p.material ? { material: p.material } : {}) });
}
