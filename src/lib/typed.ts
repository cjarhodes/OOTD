import { fitsFor, KINDS, makeItem } from "./kinds";
import { COLOR_NAMES, type ColorName } from "./palette";
import { usualColour } from "./starter";
import type { Fit, Item, Kind, Material, Pattern } from "./types";

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
  /** Stripe, check or print, when the text says so. Left out for plain pieces. */
  pattern?: Pattern;
  /** Cut, when the text says so and the type has that cut ("wide" is for trousers only). */
  fit?: Fit;
  /** The colour wasn't in the text: it's the model's usual colour for the type. */
  colorGuessed: boolean;
  /** A colour was typed that has no swatch (purple, lilac): the person must pick one. */
  colorMissing: boolean;
}

interface Hint {
  re: RegExp;
  kind?: Kind;
  material?: Material;
  /** The colour a model usually comes in, when the text doesn't say. */
  color?: ColorName;
  /** The cut a model usually has, when the text doesn't say. */
  fit?: Fit;
}

/**
 * Specific models whose names contain a garment word ("Better Sweater" is a
 * fleece, "Chuck 70 high" a high-top, "Nike Blazers" a sneaker). Tried before
 * everything else; every other brand waits until the garment words have failed.
 */
const MODEL_HINTS: Hint[] = [
  { re: /\bbetter sweater\b|\bsynchilla\b|\bretro[- ]?x\b|\bsnap[- ]?t\b/, kind: "fleece" },
  { re: /\bdown sweater\b/, kind: "puffer" },
  { re: /\babc pants\b|\blululemon abc\b/, kind: "chinos" },
  { re: /\bcarhartt double[- ]?knees?\b|\bdouble[- ]?knees?\b|\bdickies 874\b/, kind: "chinos", material: "canvas", fit: "relaxed" },
  { re: /\bnike blazers?\b/, kind: "sneakers", material: "leather" },
  { re: /\bchuck 70 high\b/, kind: "high-tops", material: "canvas" },
];

/** Brands and models with no garment word in them, tried after the garment words. */
const BRAND_HINTS: Hint[] = [
  { re: /\blevi'?s\b|\b(?:501|511|505|514)s?\b/, kind: "jeans", color: "Indigo" },
  { re: /\bbonobos\b/, kind: "chinos" },
  { re: /\bbarbour\b|\bbedale\b|\bbeaufort\b|\bashby\b/, kind: "waxed-jacket", color: "Olive" },
  { re: /\bnano puff\b|\bmicro puff\b|\bcanada goose\b|\bmoncler\b/, kind: "puffer" },
  { re: /\barc'?teryx\b|\bbeta\b|\btorrentshell\b|\bgore[- ]?tex jackets?\b/, kind: "rain-shell" },
  { re: /\bcarhartt (?:detroit )?jackets?\b|\bdetroit jackets?\b/, kind: "chore-coat" },
  { re: /\bjordan lows?\b|\bdunks?\b|\bair ?max\b/, kind: "sneakers", material: "leather" },
  { re: /\bjordans?\b|\bjordan 1s?\b/, kind: "high-tops", material: "leather" },
  { re: /\bultra ?boosts?\b|\bpegasus\b|\bon clouds?\b|\bcloudmonsters?\b|\ballbirds\b|\bbrooks\b(?! brothers)|\bsaucony\b|\b990(?:v\d)?s?\b|\b2002rs?\b|\b1906s?\b/, kind: "runners" },
  { re: /\bdoc martens\b|\bdocs\b|\bdr\.? martens\b|\b1460s?\b/, kind: "boots", material: "leather", color: "Black" },
  { re: /\btimberlands?\b|\btimbs\b/, kind: "boots", color: "Camel" },
  { re: /\bblundstones?\b|\bblunnies\b|\bred wings?\b|\biron rangers?\b|\bwallabees\b|\bclarks\b/, kind: "boots", color: "Brown" },
  { re: /\buggs?\b/, kind: "boots", material: "suede", color: "Camel" },
  { re: /\bsperrys?\b|\btop[- ]?siders?\b/, kind: "canvas", material: "leather", color: "Brown" },
];

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
  { re: /\bchino (?:pants|trousers)\b/, kind: "chinos" },
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
  { re: /\bbretons?\b/, kind: "tee" },
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

/** Everyday colour words, mapped to the nearest swatch. `null` is a colour OOTD has no swatch for. */
const COLOUR_WORDS: [RegExp, ColorName | null][] = [
  [/\boff[- ]?white\b|\bcream\b|\bivory\b|\bnatural\b/, "Ecru"],
  // "light blue", "baby blue", "light/baby blue", "powder blue".
  [/\b(?:light|pale|baby|powder|ice)(?:[\s/-]+(?:light|pale|baby|powder|ice))?[\s/-]+blue\b/, "Sky"],
  [/\bdark blue\b|\bmidnight\b/, "Navy"],
  [/\broyal blue\b|\belectric blue\b|\bbright blue\b/, "Cobalt"],
  // Denim washes. "washed black" and "faded black" come before "faded".
  [/\bdark wash\b|\braw\b|\brinse\b|\bselvedge\b/, "Indigo"],
  [/\bwashed black\b|\bfaded black\b/, "Charcoal"],
  [/\blight wash\b|\bmid wash\b|\bstone ?wash(?:ed)?\b|\bfaded\b|\bbleached\b/, "Denim"],
  [/\bdark gr[ae]y\b|\bslate\b|\bgraphite\b|\banthracite\b/, "Charcoal"],
  [/\blight gr[ae]y\b|\bsilver\b|\bmarl\b/, "Grey"],
  [/\bgr[ae]y\b|\bheather\b/, "Grey"],
  [/\bburnt orange\b|\borange\b|\bterracotta\b|\bbrick\b/, "Rust"],
  [/\byellow\b|\bgold\b|\bochre\b/, "Mustard"],
  [/\btaupe\b|\bbeige\b|\bsand\b|\bbone\b|\bputty\b|\bgreige\b/, "Stone"],
  [/\btan\b|\bcaramel\b|\btobacco\b|\bwhisky\b/, "Camel"],
  [/\bdark green\b|\bbottle green\b|\bhunter\b|\bemerald\b|\bteal\b/, "Forest"],
  [/\bmint\b|\blight green\b|\bpistachio\b/, "Sage"],
  [/\barmy\b|\bmilitary green\b|\bmoss\b/, "Olive"],
  [/\bgreen\b|\bkhaki green\b/, "Olive"],
  [/\bblue\b/, "Denim"],
  [/\bmaroon\b|\bwine\b|\boxblood\b/, "Burgundy"],
  [/\bsalmon\b|\brose\b|\bblush\b|\bcoral\b/, "Pink"],
  [/\bcharcoal\b/, "Charcoal"],
  [/\bdark brown\b|\bespresso\b/, "Chocolate"],
  [/\bbrown\b|\bcognac\b/, "Brown"],
  // No swatch for these: the person is asked to pick one.
  [/\bpurple\b|\blilac\b|\blavender\b|\bviolet\b/, null],
];

/** Garment kinds by their own names, longest first ("denim jacket" before "jacket"). */
const KIND_WORDS: [RegExp, Kind][] = (Object.keys(KINDS) as Kind[])
  .map((k): [string, Kind] => [KINDS[k].label, k])
  .sort((a, b) => b[0].length - a[0].length)
  .map(([label, k]) => [new RegExp(`\\b${label.replace(/[-\s]/g, "[- ]?")}s?\\b`), k]);

/**
 * The first colour in the text, ignoring asides like "(with grey accents)".
 * `{ color: null }` means a colour was typed that has no swatch.
 */
function colourIn(text: string): { color: ColorName | null } | null {
  const plain = withoutAsides(text);
  let best: { at: number; color: ColorName | null } | null = null;
  const consider = (re: RegExp, color: ColorName | null) => {
    const m = re.exec(plain);
    if (m && (!best || m.index < best.at)) best = { at: m.index, color };
  };
  for (const c of COLOR_NAMES) consider(new RegExp(`\\b${c.toLowerCase()}\\b`), c);
  for (const [re, c] of COLOUR_WORDS) consider(re, c);
  const found = best as { at: number; color: ColorName | null } | null;
  return found ? { color: found.color } : null;
}

/** The text without asides about trim: "(with grey accents)", "brown accented", "with white stripes". */
function withoutAsides(text: string): string {
  return text
    .replace(/\([^)]*\b(?:accents?|accented|trim|details?|soles?|laces|stripes?|logos?)\b[^)]*\)/g, " ")
    .replace(/\b[\w/-]+[\s-]+(?:accented|accents?|trimmed)\b/g, " ")
    .replace(/\bwith [\w\s/-]+? (?:accents?|trim|details?|soles?|laces|stripes?|logos?)\b/g, " ");
}

/** The text of a line without its bullet or number, tidied. */
function cleanLine(line: string): string {
  return line
    .replace(/^\s*(?:[-*•·]|\d+[.)])\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Patterns by the words people use. "3 stripes" is a logo, not a pattern. */
const PATTERN_WORDS: [RegExp, Pattern][] = [
  [/\b(?:striped?|stripes|breton)\b/, "stripe"],
  [/\b(?:check|checked|checks|plaid|gingham|tartan|houndstooth)\b/, "check"],
  [/\b(?:print|printed|floral|graphic|camo|paisley)\b/, "print"],
];

function patternIn(text: string, kind: Kind | null): Pattern | undefined {
  const plain = withoutAsides(text).replace(/\b(?:3|three)[- ]stripes?\b/g, " ");
  const said = PATTERN_WORDS.find(([re]) => re.test(plain))?.[1];
  // A flannel is a check unless it says otherwise.
  return said ?? (kind === "flannel" ? "check" : undefined);
}

/** Cuts by the words people use. Only cuts the type has are used: "wide" is for trousers, "boxy" for tops. */
const FIT_WORDS: [RegExp, Fit][] = [
  [/\b(?:slim|skinny|tapered)\b/, "slim"],
  [/\b(?:relaxed|loose|baggy)\b/, "relaxed"],
  [/\bwide(?:[- ]?leg(?:ged)?)?\b/, "wide"],
  [/\b(?:boxy|oversized|cropped)\b/, "boxy"],
];

function fitIn(text: string, kind: Kind | null, fallback: Fit | undefined): Fit | undefined {
  if (!kind) return undefined;
  const allowed = fitsFor(KINDS[kind].slot);
  const plain = withoutAsides(text);
  let best: { at: number; fit: Fit } | null = null;
  for (const [re, fit] of FIT_WORDS) {
    const m = allowed.includes(fit) ? re.exec(plain) : null;
    if (m && (!best || m.index < best.at)) best = { at: m.index, fit };
  }
  const found = best as { at: number; fit: Fit } | null;
  if (found) return found.fit;
  return fallback && allowed.includes(fallback) ? fallback : undefined;
}

function parsePieceText(line: string): TypedPiece | null {
  const name = cleanLine(line).slice(0, 80);
  if (!name) return null;
  const text = name.toLowerCase();
  // Garment words first, brands second, except for the models that contain a garment word.
  const model = MODEL_HINTS.find((h) => h.re.test(text));
  const strong = model ?? HINTS.find((h) => h.re.test(text));
  const named = strong ? undefined : KIND_WORDS.find(([re]) => re.test(text))?.[1];
  const hint =
    strong ??
    (named ? undefined : (WEAK_HINTS.find((h) => h.re.test(text)) ?? BRAND_HINTS.find((h) => h.re.test(text))));
  const kind = hint?.kind ?? named ?? null;
  const material = MATERIAL_HINTS.find(([re]) => re.test(text))?.[1] ?? hint?.material;
  const typed = colourIn(text);
  const said = typed?.color ?? null;
  // Never white by default: the model's usual colour, then the type's, then a quiet grey.
  const color = said ?? hint?.color ?? (kind ? usualColour(kind) : "Grey");
  const pattern = patternIn(text, kind);
  const fit = fitIn(text, kind, hint?.fit);
  return {
    name: name.charAt(0).toUpperCase() + name.slice(1),
    kind,
    color,
    ...(material ? { material } : {}),
    ...(pattern ? { pattern } : {}),
    ...(fit ? { fit } : {}),
    colorGuessed: !said,
    colorMissing: typed !== null && typed.color === null,
  };
}

export function parsePiece(line: string): TypedPiece | null {
  return parsePieceText(line);
}

// ---------------------------------------------------------------------------
// Counts and colour lists: "3 white tees", "white, black and grey tees",
// "Quarter zip, navy". One line can become several pieces.
// ---------------------------------------------------------------------------

/** Never more pieces than this from one segment. */
const MAX_COUNT = 10;

const NUMBER_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };

/** A leading number ("3 ", "2x ", "two ", "4 pairs of ") or a trailing "x2" / "(x2)", taken off the text. */
function takeCount(text: string): { count: number; text: string } {
  const lead = /^(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten)(?:\s*[x×]\s+|\s+(?:pairs?\s+of\s+)?)(?=\S)/i.exec(text);
  const trail = lead ? null : /\s+\(?[x×]\s*(\d{1,2})\)?$/i.exec(text);
  if (!lead && !trail) return { count: 1, text };
  const digits = (lead ?? trail)?.[1] ?? "1";
  const n = NUMBER_WORDS[digits.toLowerCase()] ?? Number(digits);
  const rest = lead ? text.slice(lead[0].length) : text.slice(0, trail?.index);
  return { count: Math.min(MAX_COUNT, Math.max(1, n)), text: rest.trim() || text };
}

/** Every colour the parser knows, as sticky matchers, to read a run of colours off the front of a segment. */
const COLOUR_MATCHERS: RegExp[] = [
  ...COLOR_NAMES.map((c) => new RegExp(`\\b${c.toLowerCase()}\\b`, "y")),
  ...COLOUR_WORDS.map(([re]) => new RegExp(re.source, "y")),
];

/** Where the longest colour word that starts at `pos` ends, or -1. */
function colourEnd(s: string, pos: number): number {
  let end = -1;
  for (const re of COLOUR_MATCHERS) {
    re.lastIndex = pos;
    const m = re.exec(s);
    if (m && m[0].length > 0 && pos + m[0].length > end) end = pos + m[0].length;
  }
  return end;
}

const JOINER = /^(?:\s*[/&,]\s*|\s+and\s+)/;
/** What follows a colour list when it is describing the piece's trim, not listing pieces. */
const TRIM_WORD = /^(?:accent|accents|accented|trim|trimmed|trimming|details?|stripes?|soles?|laces?|logos?)\b/;

/**
 * Colours at the start of a segment, joined by "/", "&", "and" or commas:
 * "white/black/grey tees" gives three groups and the rest "tees". Adjacent
 * colour words ("navy blue", "grey marl") are one group. `null` when the text
 * doesn't start with a colour, or the colours run into punctuation
 * ("Green/taupe? Bostons") or a trim word ("white/cream accented sambas").
 */
function readRun(s: string): { groups: string[]; rest: string } | null {
  const groups: string[] = [];
  let pos = 0;
  let end = 0;
  for (;;) {
    let gEnd = colourEnd(s, pos);
    if (gEnd < 0) break;
    for (;;) {
      const gap = /^[\s-]+/.exec(s.slice(gEnd));
      if (!gap) break;
      const e = colourEnd(s, gEnd + gap[0].length);
      if (e < 0) break;
      gEnd = e;
    }
    groups.push(s.slice(pos, gEnd));
    end = gEnd;
    const join = JOINER.exec(s.slice(gEnd));
    if (!join) break;
    pos = gEnd + join[0].length;
  }
  if (groups.length === 0) return null;
  const rest = s.slice(end);
  if (rest !== "" && !/^\s/.test(rest)) return null;
  const trimmed = rest.trim();
  if (TRIM_WORD.test(trimmed)) return null;
  return { groups, rest: trimmed };
}

interface Seg {
  /** The segment without bullet or count. */
  text: string;
  count: number;
  /** Colours the segment starts with, as typed. */
  groups: string[];
  /** The text after those colours (all of it when there are none). */
  rest: string;
  /** Nothing but colours: "grey", "black and white". */
  only: boolean;
  /** Colours that belong to this segment from colour-only neighbours. */
  before: string[];
  after: string[];
}

function analyse(raw: string): Seg | null {
  const cleaned = cleanLine(raw);
  if (!cleaned) return null;
  const { count, text } = takeCount(cleaned);
  const run = readRun(text);
  return {
    text,
    count,
    groups: run?.groups ?? [],
    rest: run ? run.rest : text,
    only: run !== null && run.rest === "",
    before: [],
    after: [],
  };
}

/** The segment names a garment OOTD has a type for. */
function isThing(seg: Seg): boolean {
  const p = parsePieceText(seg.text);
  return p !== null && p.kind !== null;
}

function hasColour(seg: Seg): boolean {
  return seg.only || seg.groups.length > 0 || seg.before.length > 0 || seg.after.length > 0 || colourIn(seg.text.toLowerCase()) !== null;
}

/** Plural-only garments keep their s: "black jeans" is not "black jean". */
const PLURAL_ONLY = /^(?:jeans|chinos|trousers|pants|shorts|joggers|sweats|sweatpants|cords|corduroys|khakis|cargos|slacks|bottoms|leggings)$/i;

/** "White tees" to "White tee", for pieces made from a list or a count. Shoes are pairs and keep their s. */
function singular(p: TypedPiece): TypedPiece {
  if (!p.kind || KINDS[p.kind].slot === "shoes") return p;
  const words = p.name.split(" ");
  const last = words.pop() ?? "";
  if (!/[^sS]s$/.test(last) || PLURAL_ONLY.test(last)) return p;
  words.push(last.slice(0, -1));
  return { ...p, name: words.join(" ") };
}

function pluralNonShoe(rest: string): boolean {
  const p = parsePieceText(rest);
  if (!p || !p.kind || KINDS[p.kind].slot === "shoes") return false;
  const last = rest.split(" ").pop() ?? "";
  return /[^sS]s$/.test(last);
}

/** The pieces one segment becomes, once colour-only neighbours have been attached to it. */
function expand(seg: Seg): TypedPiece[] {
  const attached = seg.before.length > 0 || seg.after.length > 0;
  let colours: string[] = [];
  let body = seg.text;
  if (attached) {
    colours = [...seg.before, ...seg.groups, ...seg.after];
    if (seg.groups.length > 0) body = seg.rest;
  } else if (seg.groups.length >= 3 || (seg.groups.length === 2 && pluralNonShoe(seg.rest))) {
    // A list of colours in front of a type: "white/black/grey tees", "navy and grey crewnecks".
    // Two colours with a singular type ("black and white tee", "red and black check shirt") are one piece.
    colours = seg.groups;
    body = seg.rest;
  }
  const make = (colour: string | null) => parsePieceText(colour ? `${colour} ${body}` : body);
  const first = make(colours[0] ?? null);
  if (!first) return [];
  // A thing OOTD can't type (or won't plan) is one row, whatever the count or the colours.
  if (first.kind === null) return [first];
  const many = colours.length > 1 || seg.count > 1;
  const out: TypedPiece[] = [];
  for (const c of colours.length > 0 ? colours : [null]) {
    const p = make(c);
    if (!p) continue;
    for (let i = 0; i < seg.count && out.length < MAX_COUNT; i++) out.push(many ? singular(p) : p);
  }
  return out;
}

/**
 * "tees in white, black and grey" says the same as "white, black and grey
 * tees", so turn it round and let the one rule handle both.
 */
function turnRound(line: string): string {
  const m = /^(.+?)\s+in\s+(.+)$/i.exec(line);
  const head = m?.[1]?.trim();
  const colours = m?.[2]?.trim();
  if (!head || !colours || head.includes(",")) return line;
  const run = readRun(colours);
  if (!run || run.rest !== "" || run.groups.length < 2) return line;
  return parsePieceText(head)?.kind ? `${colours} ${head}` : line;
}

/**
 * Colour-only segments ("grey", "black and white") belong to a garment next to them.
 * Forward, to the next segment that names a garment, when the segment before
 * already has a colour or there isn't one ("navy crewneck, grey, black jeans":
 * grey jeans and black jeans). Otherwise backward, to the segment before when
 * it names a garment and has no colour yet ("Quarter zip, navy"). A colour that
 * fits neither stays as a row of its own, for the person to place.
 */
function attach(segs: Seg[]): Set<Seg> {
  const orphans = new Set<Seg>();
  segs.forEach((s, i) => {
    if (!s.only) return;
    const prev = segs[i - 1];
    const next = segs.slice(i + 1).find((x) => !x.only);
    const prevColoured = prev ? hasColour(prev) : false;
    if (next && isThing(next) && (!prev || prevColoured)) {
      next.before.push(...s.groups);
    } else if (prev && !prev.only && isThing(prev) && !prevColoured) {
      prev.after.push(...s.groups);
    } else {
      orphans.add(s);
    }
  });
  return orphans;
}

function parseLine(line: string): TypedPiece[] {
  const segs = turnRound(cleanLine(line))
    .split(/,(?![^(]*\))/)
    .map(analyse)
    .filter((s): s is Seg => s !== null);
  const orphans = attach(segs);
  return segs.flatMap((s) => {
    if (s.only) return orphans.has(s) ? [parsePieceText(s.text)].filter((p): p is TypedPiece => p !== null) : [];
    return expand(s);
  });
}

/**
 * One piece per line or comma, but a count ("3 white tees") or a list of
 * colours ("white, black and grey tees") makes several, and a colour after a
 * comma ("Quarter zip, navy") belongs to the piece before it.
 */
export function parseList(text: string): TypedPiece[] {
  return text.split(/\n|;/).flatMap(parseLine);
}

/** The piece a typed line becomes, once it has a kind. */
export function typedItem(p: TypedPiece & { kind: Kind }, id: string): Item {
  return makeItem({
    id,
    name: p.name,
    kind: p.kind,
    color: p.color,
    ...(p.material ? { material: p.material } : {}),
    ...(p.pattern ? { pattern: p.pattern } : {}),
    ...(p.fit ? { fit: p.fit } : {}),
  });
}
