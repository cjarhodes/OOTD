import { describe, expect, it } from "vitest";
import { KINDS } from "./kinds";
import { COLOR_NAMES, type ColorName } from "./palette";
import { usualColour } from "./starter";
import { parseList, parsePiece, typedItem } from "./typed";
import type { Kind } from "./types";

/** One row per word in Appendix B of docs/LOOP.md: the line, and the type it must become. */
function expectKinds(rows: [string, Kind][]) {
  for (const [text, kind] of rows) expect(parsePiece(text), text).toMatchObject({ kind });
}

describe("everyday garment words (table 1)", () => {
  it("shirts", () => {
    expectKinds([
      ["shirt", "oxford"],
      ["dress shirt", "oxford"],
      ["button-down", "oxford"],
      ["button down", "oxford"],
      ["button-up", "oxford"],
      ["OCBD", "oxford"],
      ["linen shirt", "oxford"],
      ["denim shirt", "oxford"],
      ["chambray shirt", "oxford"],
      ["plaid shirt", "flannel"],
      ["check shirt", "flannel"],
      ["lumberjack shirt", "flannel"],
      ["flannel", "flannel"],
      ["hawaiian shirt", "camp-shirt"],
      ["cuban shirt", "camp-shirt"],
      ["resort shirt", "camp-shirt"],
      ["bowling shirt", "camp-shirt"],
    ]);
    expect(parsePiece("linen shirt")).toMatchObject({ material: "linen" });
    expect(parsePiece("denim shirt")).toMatchObject({ material: "denim" });
    expect(parsePiece("chambray shirt")).toMatchObject({ kind: "oxford" });
    // A shirt that names its own type keeps it.
    expectKinds([
      ["navy polo shirt", "polo"],
      ["navy rugby shirt", "rugby"],
      ["oxford shirt", "oxford"],
      ["camp-collar shirt", "camp-shirt"],
    ]);
  });

  it("tops and knits", () => {
    expectKinds([
      ["long sleeve", "long-sleeve"],
      ["longsleeve", "long-sleeve"],
      ["long-sleeve tee", "long-sleeve"],
      ["roll neck", "turtleneck"],
      ["rollneck", "turtleneck"],
      ["polo neck", "turtleneck"],
      ["jumper", "crewneck"],
      ["sweater", "crewneck"],
      ["pullover", "crewneck"],
      ["crew neck", "crewneck"],
      ["zip-up", "hoodie"],
      ["zip up hoodie", "hoodie"],
      ["zip hoodie", "hoodie"],
      ["half-zip", "quarter-zip"],
      ["half zip", "quarter-zip"],
      ["1/4 zip", "quarter-zip"],
      ["quarter zip", "quarter-zip"],
      ["crewneck sweatshirt", "sweatshirt"],
      ["sweat", "sweatshirt"],
    ]);
    // Neither the generic "sweater" nor "pants" may hide a more specific word.
    expectKinds([
      ["navy quarter zip sweater", "quarter-zip"],
      ["sweat pants", "sweatpants"],
      ["black v neck sweater", "v-neck"],
      ["white t shirt", "tee"],
    ]);
  });

  it("layers and coats", () => {
    expectKinds([
      ["vest", "gilet"],
      ["puffer vest", "gilet"],
      ["down vest", "gilet"],
      ["bodywarmer", "gilet"],
      ["body warmer", "gilet"],
      ["shacket", "overshirt"],
      ["shirt jacket", "overshirt"],
      ["field jacket", "overshirt"],
      ["work jacket", "chore-coat"],
      ["chore jacket", "chore-coat"],
      ["worker jacket", "chore-coat"],
      ["chore coat", "chore-coat"],
      ["rain jacket", "rain-shell"],
      ["raincoat", "rain-shell"],
      ["rain coat", "rain-shell"],
      ["windbreaker", "rain-shell"],
      ["anorak", "rain-shell"],
      ["cagoule", "rain-shell"],
      ["waterproof", "rain-shell"],
      ["hardshell", "rain-shell"],
      ["parka", "puffer"],
      ["down jacket", "puffer"],
      ["puffa", "puffer"],
      ["quilted jacket", "puffer"],
      ["peacoat", "overcoat"],
      ["pea coat", "overcoat"],
      ["trench", "overcoat"],
      ["trench coat", "overcoat"],
      ["topcoat", "overcoat"],
      ["mac", "overcoat"],
      ["duffle coat", "overcoat"],
      ["wool coat", "overcoat"],
      ["leather jacket", "bomber"],
      ["harrington", "bomber"],
      ["varsity jacket", "bomber"],
      ["coach jacket", "bomber"],
      ["flight jacket", "bomber"],
      ["suit jacket", "blazer"],
      ["sport coat", "blazer"],
      ["sports jacket", "blazer"],
    ]);
    expect(parsePiece("leather jacket")).toMatchObject({ material: "leather" });
  });

  it("trousers", () => {
    expectKinds([
      ["khakis", "chinos"],
      ["cords", "chinos"],
      ["corduroys", "chinos"],
      ["cargo pants", "cargos"],
      ["cargo trousers", "cargos"],
      ["cargos", "cargos"],
      ["dress pants", "trousers"],
      ["dress trousers", "trousers"],
      ["suit trousers", "trousers"],
      ["slacks", "trousers"],
      ["pants", "trousers"],
      ["joggers", "sweatpants"],
      ["track pants", "sweatpants"],
      ["tracksuit bottoms", "sweatpants"],
      ["sweats", "sweatpants"],
    ]);
    expect(parsePiece("cords")).toMatchObject({ material: "corduroy" });
    expect(parsePiece("khakis")).toMatchObject({ color: "Khaki", colorGuessed: true });
    // The specific kind beats "pants".
    expectKinds([
      ["olive cargo pants", "cargos"],
    ]);
  });

  it("shoes", () => {
    expectKinds([
      ["oxfords", "loafers"],
      ["derbies", "loafers"],
      ["brogues", "loafers"],
      ["dress shoes", "loafers"],
      ["smart shoes", "loafers"],
      ["monk straps", "loafers"],
      ["desert boots", "boots"],
      ["work boots", "boots"],
      ["hiking boots", "trail"],
      ["chelsea boots", "boots"],
      ["chukkas", "boots"],
      ["slip-ons", "canvas"],
      ["plimsolls", "canvas"],
      ["deck shoes", "canvas"],
      ["boat shoes", "canvas"],
      ["espadrilles", "canvas"],
      ["slides", "sandals"],
      ["flip-flops", "sandals"],
      ["sliders", "sandals"],
    ]);
    expect(parsePiece("brown oxfords")).toMatchObject({ kind: "loafers", material: "leather" });
    // "Oxford shirt" is a shirt, not a shoe.
    expectKinds([["white oxford shirts", "oxford"]]);
  });
});

describe("brands and models (table 2)", () => {
  it("jeans, trousers and jackets", () => {
    expectKinds([
      ["Levi's", "jeans"],
      ["Levis", "jeans"],
      ["501", "jeans"],
      ["511", "jeans"],
      ["505", "jeans"],
      ["514", "jeans"],
      ["Lululemon ABC", "chinos"],
      ["ABC pants", "chinos"],
      ["Bonobos", "chinos"],
      ["Barbour", "waxed-jacket"],
      ["Bedale", "waxed-jacket"],
      ["Beaufort", "waxed-jacket"],
      ["Ashby", "waxed-jacket"],
      ["Better Sweater", "fleece"],
      ["Synchilla", "fleece"],
      ["Retro-X", "fleece"],
      ["Snap-T", "fleece"],
      ["Nano Puff", "puffer"],
      ["Micro Puff", "puffer"],
      ["Down Sweater", "puffer"],
      ["Canada Goose", "puffer"],
      ["Moncler", "puffer"],
      ["Arc'teryx", "rain-shell"],
      ["Arcteryx", "rain-shell"],
      ["Beta", "rain-shell"],
      ["Torrentshell", "rain-shell"],
      ["Gore-Tex jacket", "rain-shell"],
      ["Carhartt jacket", "chore-coat"],
      ["Detroit jacket", "chore-coat"],
      ["Carhartt double knee", "chinos"],
      ["Dickies 874", "chinos"],
    ]);
    expect(parsePiece("Levi's 501")).toMatchObject({ color: "Indigo", colorGuessed: true });
    expect(parsePiece("Barbour Bedale")).toMatchObject({ color: "Olive", colorGuessed: true });
    expect(parsePiece("Dickies 874")).toMatchObject({ material: "canvas" });
    // "Down Sweater" and "Better Sweater" are not sweaters.
    expect(parsePiece("Patagonia better sweater")).toMatchObject({ kind: "fleece" });
  });

  it("shoes", () => {
    expectKinds([
      ["Dunks", "sneakers"],
      ["Air Max", "sneakers"],
      ["Nike Blazers", "sneakers"],
      ["Jordan lows", "sneakers"],
      ["Jordan 1s", "high-tops"],
      ["Jordans", "high-tops"],
      ["Chuck 70 high", "high-tops"],
      ["Ultraboost", "runners"],
      ["Pegasus", "runners"],
      ["On Cloud", "runners"],
      ["Cloudmonster", "runners"],
      ["Allbirds", "runners"],
      ["Brooks", "runners"],
      ["Saucony", "runners"],
      ["990", "runners"],
      ["2002R", "runners"],
      ["1906", "runners"],
      ["Doc Martens", "boots"],
      ["Docs", "boots"],
      ["Dr Martens", "boots"],
      ["1460", "boots"],
      ["Timberlands", "boots"],
      ["Timbs", "boots"],
      ["Blundstones", "boots"],
      ["Blunnies", "boots"],
      ["Red Wings", "boots"],
      ["Iron Rangers", "boots"],
      ["Wallabees", "boots"],
      ["Clarks", "boots"],
      ["Uggs", "boots"],
      ["Sperrys", "canvas"],
      ["Top-Siders", "canvas"],
    ]);
    expect(parsePiece("Jordans")).toMatchObject({ material: "leather" });
    expect(parsePiece("Nike Dunks")).toMatchObject({ material: "leather" });
    expect(parsePiece("Doc Martens")).toMatchObject({ color: "Black", material: "leather", colorGuessed: true });
    expect(parsePiece("Timberlands")).toMatchObject({ color: "Camel" });
    expect(parsePiece("Blundstones")).toMatchObject({ color: "Brown" });
    expect(parsePiece("Uggs")).toMatchObject({ color: "Camel", material: "suede" });
    expect(parsePiece("Sperrys")).toMatchObject({ color: "Brown", material: "leather" });
  });

  it("lets a garment word beat the brand", () => {
    expectKinds([
      ["Patagonia rain jacket", "rain-shell"],
      ["Levi's denim jacket", "denim-jacket"],
      ["Barbour waxed jacket", "waxed-jacket"],
      ["Moncler sweater", "crewneck"],
      ["Nike hoodie", "hoodie"],
      ["Canada Goose parka", "puffer"],
      ["Brooks Brothers shirt", "oxford"],
      ["Carhartt hoodie", "hoodie"],
    ]);
  });
});

describe("never guess white (table 3)", () => {
  it("gives every type a usual colour", () => {
    for (const kind of Object.keys(KINDS) as Kind[]) expect(COLOR_NAMES, kind).toContain(usualColour(kind));
    expect(usualColour("v-neck")).toBe("Navy");
    expect(usualColour("cargos")).toBe("Olive");
    expect(usualColour("tee")).toBe("White");
  });

  it("uses the usual colour when none is typed, and says it guessed", () => {
    expect(parsePiece("dark wash jeans")).toMatchObject({ kind: "jeans", color: "Indigo", colorGuessed: false });
    expect(parsePiece("khakis")).toMatchObject({ kind: "chinos", color: "Khaki", colorGuessed: true });
    expect(parsePiece("trench coat")).toMatchObject({ kind: "overcoat", color: "Camel", colorGuessed: true });
    expect(parsePiece("rain jacket")).toMatchObject({ color: "Black", colorGuessed: true });
    expect(parsePiece("cashmere sweater")).toMatchObject({ color: "Navy", colorGuessed: true });
    expect(parsePiece("navy v neck")).toMatchObject({ color: "Navy", colorGuessed: false });
    expect(parsePiece("v neck jumper")).toMatchObject({ kind: "v-neck", color: "Navy", colorGuessed: true });
    // Nothing known at all is a quiet grey, never white.
    expect(parsePiece("mystery thing")).toMatchObject({ kind: null, color: "Grey", colorGuessed: true });
  });

  it("reads the colour words", () => {
    const rows: [string, ColorName][] = [
      ["orange tee", "Rust"],
      ["burnt orange tee", "Rust"],
      ["terracotta tee", "Rust"],
      ["brick tee", "Rust"],
      ["yellow tee", "Mustard"],
      ["gold tee", "Mustard"],
      ["ochre tee", "Mustard"],
      ["sand tee", "Stone"],
      ["bone tee", "Stone"],
      ["putty tee", "Stone"],
      ["greige tee", "Stone"],
      ["tan tee", "Camel"],
      ["caramel tee", "Camel"],
      ["tobacco tee", "Camel"],
      ["whisky tee", "Camel"],
      ["dark green tee", "Forest"],
      ["bottle green tee", "Forest"],
      ["hunter tee", "Forest"],
      ["emerald tee", "Forest"],
      ["teal tee", "Forest"],
      ["army tee", "Olive"],
      ["military green tee", "Olive"],
      ["moss tee", "Olive"],
      ["mint tee", "Sage"],
      ["light green tee", "Sage"],
      ["pistachio tee", "Sage"],
      ["royal blue tee", "Cobalt"],
      ["electric blue tee", "Cobalt"],
      ["bright blue tee", "Cobalt"],
      ["dark grey tee", "Charcoal"],
      ["slate tee", "Charcoal"],
      ["graphite tee", "Charcoal"],
      ["anthracite tee", "Charcoal"],
      ["light grey tee", "Grey"],
      ["silver tee", "Grey"],
      ["marl tee", "Grey"],
      ["salmon tee", "Pink"],
      ["rose tee", "Pink"],
      ["blush tee", "Pink"],
      ["coral tee", "Pink"],
      ["dark wash jeans", "Indigo"],
      ["raw jeans", "Indigo"],
      ["rinse jeans", "Indigo"],
      ["selvedge jeans", "Indigo"],
      ["light wash jeans", "Denim"],
      ["mid wash jeans", "Denim"],
      ["stonewash jeans", "Denim"],
      ["faded jeans", "Denim"],
      ["bleached jeans", "Denim"],
      ["washed black jeans", "Charcoal"],
      ["faded black jeans", "Charcoal"],
    ];
    for (const [text, color] of rows) expect(parsePiece(text), text).toMatchObject({ color, colorGuessed: false });
  });

  it("flags colours that have no swatch", () => {
    for (const word of ["purple", "lilac", "lavender", "violet"]) {
      expect(parsePiece(`${word} hoodie`), word).toMatchObject({ kind: "hoodie", colorMissing: true, colorGuessed: true, color: "Grey" });
    }
    expect(parsePiece("navy hoodie")).toMatchObject({ colorMissing: false });
    expect(parsePiece("hoodie")).toMatchObject({ colorMissing: false });
    // A purple accent isn't the piece's colour.
    expect(parsePiece("grey hoodie (purple trim)")).toMatchObject({ color: "Grey", colorMissing: false });
    // "multi" is ignored, not a missing colour.
    expect(parsePiece("multicolour tee")).toMatchObject({ colorMissing: false, colorGuessed: true });
  });
});

describe("pattern and cut (T5)", () => {
  it("reads pattern words", () => {
    for (const w of ["striped", "stripe", "stripes"]) expect(parsePiece(`navy ${w} tee`), w).toMatchObject({ pattern: "stripe" });
    for (const w of ["check", "checked", "plaid", "gingham", "tartan", "houndstooth"]) expect(parsePiece(`${w} shirt`), w).toMatchObject({ pattern: "check" });
    for (const w of ["print", "printed", "floral", "graphic", "camo", "paisley"]) expect(parsePiece(`${w} tee`), w).toMatchObject({ pattern: "print" });
    expect(parsePiece("navy tee")?.pattern).toBeUndefined();
    expect(parsePiece("striped navy tee")).toMatchObject({ kind: "tee", color: "Navy", pattern: "stripe" });
  });

  it("makes a breton a striped tee", () => {
    expect(parsePiece("breton top")).toMatchObject({ kind: "tee", pattern: "stripe" });
    expect(parsePiece("navy breton")).toMatchObject({ kind: "tee", color: "Navy", pattern: "stripe" });
  });

  it("treats a flannel as a check unless it says otherwise", () => {
    expect(parsePiece("green flannel shirt")).toMatchObject({ kind: "flannel", pattern: "check" });
    expect(parsePiece("plaid flannel")).toMatchObject({ kind: "flannel", pattern: "check" });
    expect(parsePiece("striped flannel")).toMatchObject({ kind: "flannel", pattern: "stripe" });
  });

  it("ignores stripes mentioned in an aside, in either direction", () => {
    expect(parsePiece("navy tee (with white stripes)")?.pattern).toBeUndefined();
    expect(parsePiece("navy tee with white stripes")?.pattern).toBeUndefined();
    expect(parsePiece("white sambas with black stripes")?.pattern).toBeUndefined();
    expect(parsePiece("adidas three stripes joggers")?.pattern).toBeUndefined();
    // A real stripe next to an aside still counts.
    expect(parsePiece("striped tee (with grey accents)")).toMatchObject({ pattern: "stripe" });
  });

  it("reads cut words, only where the type has that cut", () => {
    for (const w of ["slim", "skinny", "tapered"]) expect(parsePiece(`${w} jeans`), w).toMatchObject({ fit: "slim" });
    for (const w of ["relaxed", "loose", "baggy"]) expect(parsePiece(`${w} chinos`), w).toMatchObject({ fit: "relaxed" });
    for (const w of ["wide", "wide-leg", "wide leg"]) expect(parsePiece(`${w} trousers`), w).toMatchObject({ fit: "wide" });
    for (const w of ["boxy", "oversized", "cropped"]) expect(parsePiece(`${w} hoodie`), w).toMatchObject({ fit: "boxy" });
    expect(parsePiece("black slim jeans")).toMatchObject({ kind: "jeans", color: "Black", fit: "slim" });
    // Wide is for trousers only; boxy is for tops only; shoes have no cut.
    expect(parsePiece("wide hoodie")?.fit).toBeUndefined();
    expect(parsePiece("boxy jeans")?.fit).toBeUndefined();
    expect(parsePiece("slim sneakers")?.fit).toBeUndefined();
    expect(parsePiece("slim mystery")?.fit).toBeUndefined();
    expect(parsePiece("navy tee")?.fit).toBeUndefined();
  });

  it("makes Carhartt double knees and Dickies 874 relaxed canvas chinos", () => {
    expect(parsePiece("Carhartt double knees")).toMatchObject({ kind: "chinos", material: "canvas", fit: "relaxed" });
    expect(parsePiece("Dickies 874")).toMatchObject({ kind: "chinos", material: "canvas", fit: "relaxed" });
    // The text can still say a different cut.
    expect(parsePiece("slim Dickies 874")).toMatchObject({ fit: "slim" });
  });

  it("matches singular chino pants as chinos", () => {
    expect(parsePiece("navy chino pants")).toMatchObject({ kind: "chinos", color: "Navy" });
    expect(parsePiece("chino trousers")).toMatchObject({ kind: "chinos" });
    expect(parsePiece("navy chino shorts")).toMatchObject({ kind: "shorts" });
  });

  it("passes pattern and cut through to the piece", () => {
    const item = typedItem({ ...parsePiece("striped slim jeans")!, kind: "jeans" }, "t1");
    expect(item).toMatchObject({ pattern: "stripe", fit: "slim" });
    expect(typedItem({ ...parsePiece("navy tee")!, kind: "tee" }, "t2")).toMatchObject({ pattern: "solid", fit: KINDS.tee.fit });
  });

  it("keeps pattern and cut on pieces made from a list", () => {
    expect(parseList("white, black and grey striped tees").map((p) => p.pattern)).toEqual(["stripe", "stripe", "stripe"]);
  });
});
