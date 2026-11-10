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
  // Retro sneakers by model, before the runner brands that also make them.
  { re: /\bpumas?\b|\bgazelles?\b|\bspezials?\b|\bcampus\b|\bsuede sneakers?\b/, kind: "sneakers", material: "suede" },
  { re: /\bsambas?\b|\bmexico 66s?\b|\bonitsuka\b|\bcortez\b|\bair force 1s?\b|\baf1s?\b|\b550s?\b|\bkillshots?\b/, kind: "sneakers", material: "leather" },
  { re: /\bnew balance\b|\brunners?\b|\brunning shoes?\b|\basics\b/, kind: "runners" },
  { re: /\bvejas?\b/, kind: "sneakers", material: "leather", color: "White" },
  { re: /\bc ?85s?\b|\bclub c\b|\breeboks?\b|\bstan smiths?\b|\bcommon projects\b|\bcourt\b/, kind: "sneakers", material: "leather", color: "White" },
  { re: /\bsneakers?\b|\btrainers?\b/, kind: "sneakers" },
  // Shoes by their everyday names.
  { re: /\boxfords(?!\s+shirts?)\b|\boxford shoes?\b|\bderbys?\b|\bderbies\b|\bbrogues?\b|\bdress shoes?\b|\bsmart shoes?\b|\bmonk[- ]?straps?\b/, kind: "loafers", material: "leather" },
  { re: /\bslip[- ]?ons?\b|\bdeck shoes?\b|\bboat shoes?\b|\bespadrilles?\b/, kind: "canvas" },
  { re: /\bsliders?\b/, kind: "sandals", material: "leather" },
  // Garments, in words people use. Longer phrases come before the words inside them.
  { re: /\bdenim jackets?\b|\btrucker\b/, kind: "denim-jacket" },
  { re: /\bsweat ?pants\b|\bjoggers?\b|\bsweats\b|\btrack ?pants\b|\btracksuit bottoms?\b|\bjogging bottoms?\b/, kind: "sweatpants" },
  { re: /\bcargo(?:s| pants| trousers)\b/, kind: "cargos" },
  { re: /\bkhakis\b/, kind: "chinos", color: "Khaki" },
  { re: /\bcords\b|\bcorduroys\b/, kind: "chinos", material: "corduroy" },
  { re: /\bdress (?:pants|trousers)\b|\bsuit trousers\b|\bslacks\b/, kind: "trousers" },
  { re: /\bsuit jackets?\b|\bsport coats?\b|\bsports jackets?\b/, kind: "blazer" },
  // Layers over a shirt, most specific first.
  { re: /\bshackets?\b|\bshirt jackets?\b|\bfield jackets?\b/, kind: "overshirt" },
  { re: /\bwork(?:er)? jackets?\b|\bchore jackets?\b/, kind: "chore-coat" },
  { re: /\brain ?jackets?\b|\brain ?coats?\b|\bwindbreakers?\b|\banoraks?\b|\bcagoules?\b|\bwaterproofs?\b|\bhard ?shells?\b/, kind: "rain-shell" },
  { re: /\bvests?\b|\bbody ?warmers?\b/, kind: "gilet" },
  { re: /\bparkas?\b|\bdown jackets?\b|\bpuffas?\b|\bquilted jackets?\b/, kind: "puffer" },
  { re: /\bpea ?coats?\b|\btrench(?: coats?)?\b|\btop ?coats?\b|\bmacs?\b|\bduff[el]e coats?\b/, kind: "overcoat" },
  { re: /\bleather jackets?\b|\bharringtons?\b|\bvarsity jackets?\b|\bcoach(?:es)? jackets?\b|\bflight jackets?\b/, kind: "bomber" },
  // Tops. Neck and sleeve words come before "tee" and "sweater" so they win.
  { re: /\bchambray\b/, kind: "oxford", color: "Sky" },
  { re: /\bflannels?\b|\b(?:plaid|check|checked|lumberjack) shirts?\b/, kind: "flannel" },
  { re: /\b(?:hawaiian|cuban|resort|bowling|camp) shirts?\b/, kind: "camp-shirt" },
  { re: /\broll[- ]?necks?\b|\bpolo[- ]?necks?\b/, kind: "turtleneck" },
  { re: /\bhalf[- ]?zips?\b|\b1\/4[- ]?zips?\b|\bquarter[- ]?zips?\b/, kind: "quarter-zip" },
  { re: /\bzip[- ]?up\b|\bzip hoodies?\b/, kind: "hoodie" },
  { re: /\blong[- ]?sleeve(?:d)?\b(?!\s+(?:oxford|polo|shirt|flannel|henley))/, kind: "long-sleeve" },
  { re: /\bt[- ]?shirts?\b|\btees?\b/, kind: "tee" },
  { re: /\bv[- ]?necks?\b/, kind: "v-neck" },
  { re: /\bsweatshirts?\b|\bsweat\b(?! ?pants)/, kind: "sweatshirt" },
  { re: /\bcrew[- ]?necks?\b/, kind: "crewneck" },
  { re: /\bdress shirts?\b|\bbutton[- ]?(?:down|up)s?\b|\bocbd\b/, kind: "oxford" },
];

/**
 * Generic words, tried only after the garment's own name (KIND_WORDS) has
 * failed, so "quarter-zip sweater" is a quarter-zip and "polo shirt" a polo.
 */
const WEAK_HINTS: Hint[] = [
  { re: /\bjumpers?\b|\bsweaters?\b|\bpullovers?\b/, kind: "crewneck" },
  { re: /\bcoats?\b/, kind: "overcoat" },
  { re: /\boxfords?\b|\bshirts?\b/, kind: "oxford" },
  { re: /\bpants\b/, kind: "trousers" },
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
  const strong = HINTS.find((h) => h.re.test(text));
  const named = strong ? undefined : KIND_WORDS.find(([re]) => re.test(text))?.[1];
  const hint = strong ?? (named ? undefined : WEAK_HINTS.find((h) => h.re.test(text)));
  const kind = hint?.kind ?? named ?? null;
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
