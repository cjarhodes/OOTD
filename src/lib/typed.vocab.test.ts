import { describe, expect, it } from "vitest";
import { parsePiece } from "./typed";
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
