import { describe, expect, it } from "vitest";
import { parseList, parsePiece, typedItem } from "./typed";

describe("typed pieces", () => {
  it("reads a list of shoes written the way people write them", () => {
    const list =
      "White Converse High Tops, White Reebok C85s, Black Salewa Wildfires, Converse white low top, Vejas (with grey accents), Rothy’s (white) sneakers, Rothy’s slip on sandals, brown Birkenstock arizonas, Birkenstock Green/taupe? Bostons";
    const got = parseList(list).map((p) => [p.name, p.kind, p.color, p.material ?? null]);
    expect(got).toEqual([
      ["White Converse High Tops", "high-tops", "White", "canvas"],
      ["White Reebok C85s", "sneakers", "White", "leather"],
      ["Black Salewa Wildfires", "trail", "Black", "technical"],
      ["Converse white low top", "canvas", "White", "canvas"],
      // The accent colour isn't the shoe's colour; Vejas are usually white.
      ["Vejas (with grey accents)", "sneakers", "White", "leather"],
      ["Rothy’s (white) sneakers", "sneakers", "White", "knit"],
      ["Rothy’s slip on sandals", "sandals", "White", "knit"],
      ["Brown Birkenstock arizonas", "sandals", "Brown", "leather"],
      ["Birkenstock Green/taupe? Bostons", "clogs", "Olive", "suede"],
    ]);
  });

  it("knows retro sneakers by model, plurals included", () => {
    expect(parsePiece("Burgundy puma suedes")).toMatchObject({ kind: "sneakers", color: "Burgundy", material: "suede" });
    expect(parsePiece("navy gazelles")).toMatchObject({ kind: "sneakers", color: "Navy", material: "suede" });
    expect(parsePiece("green adidas sambas")).toMatchObject({ kind: "sneakers", color: "Olive", material: "leather" });
    expect(parsePiece("white air force 1s")).toMatchObject({ kind: "sneakers", material: "leather" });
    expect(parsePiece("New Balance 550s")).toMatchObject({ kind: "sneakers" });
    expect(parsePiece("grey New Balance 990s")).toMatchObject({ kind: "runners", color: "Grey" });
    // Shades of light blue, and accent colours written outside brackets.
    const pair = parseList("Light/baby blue adidas gazelles, white/cream and brown accented adidas sambas (sporty and rich collab)");
    expect(pair.map((p) => [p.kind, p.color, p.material])).toEqual([
      ["sneakers", "Sky", "suede"],
      ["sneakers", "White", "leather"],
    ]);
    expect(parsePiece("brown accented sambas")).toMatchObject({ colorGuessed: true });
    expect(parsePiece("navy sambas with gum soles")).toMatchObject({ color: "Navy" });
    expect(parsePiece("Navy striped rugby shirt")).toMatchObject({ kind: "rugby", color: "Navy" });
  });

  it("splits lines, bullets and numbering, and keeps commas inside brackets", () => {
    const got = parseList("- Navy merino crewneck\n2. Grey hoodie (cotton, heavy)\n\n• black jeans").map((p) => [p.name, p.kind, p.color]);
    expect(got).toEqual([
      ["Navy merino crewneck", "crewneck", "Navy"],
      ["Grey hoodie (cotton, heavy)", "hoodie", "Grey"],
      ["Black jeans", "jeans", "Black"],
    ]);
  });

  it("knows garments by everyday names and flags what it guessed", () => {
    expect(parsePiece("cream t-shirt")).toMatchObject({ kind: "tee", color: "Ecru", colorGuessed: false });
    // "Denim" is a colour too, which is right for a denim jacket.
    expect(parsePiece("denim jacket")).toMatchObject({ kind: "denim-jacket", color: "Denim" });
    expect(parsePiece("hoodie")).toMatchObject({ kind: "hoodie", color: "White", colorGuessed: true });
    expect(parsePiece("dark brown suede chelsea boots")).toMatchObject({ kind: "boots", color: "Chocolate", material: "suede" });
    expect(parsePiece("something mysterious")).toMatchObject({ kind: null });
    expect(parsePiece("   ")).toBeNull();
  });

  it("makes a complete piece, with the typed name and material", () => {
    const item = typedItem({ ...parsePiece("Rothy’s slip on sandals")!, kind: "sandals" }, "t1");
    expect(item).toMatchObject({ id: "t1", name: "Rothy’s slip on sandals", slot: "shoes", material: "knit", status: "available" });
  });

  it("reads everyday wardrobe words, not only the app's own names", () => {
    const kinds = (list: string) => parseList(list).map((p) => p.kind);
    expect(kinds("black levi's 501\nbarbour jacket\nstriped breton top\nlinen shirt white\nblack leather jacket\nnavy peacoat\ngreen parka")).toEqual([
      "jeans",
      "waxed-jacket",
      "long-sleeve",
      "oxford",
      "bomber",
      "overcoat",
      "puffer",
    ]);
    expect(kinds("black dr martens, brown brogues, black dress shoes, nike air max 90 white, white nikes")).toEqual(["boots", "loafers", "loafers", "runners", "sneakers"]);
    expect(kinds("blue denim shirt, checked shirt red, burgundy v neck jumper, black polo neck, grey crew neck jumper")).toEqual(["oxford", "flannel", "v-neck", "turtleneck", "crewneck"]);
    // A looser word never overrides a garment named outright.
    expect(kinds("ecru chore coat, navy rugby shirt, white long sleeve tee, grey fleece hoodie, grey flannel trousers")).toEqual(["chore-coat", "rugby", "long-sleeve", "hoodie", "trousers"]);
    expect(parsePiece("linen shirt white")).toMatchObject({ material: "linen", color: "White" });
    expect(parsePiece("black leather jacket")).toMatchObject({ material: "leather" });
  });

  it("reads washes and shades, and a colour after a comma", () => {
    expect(parsePiece("light wash jeans")).toMatchObject({ color: "Denim", colorGuessed: false });
    expect(parsePiece("desert boots sand")).toMatchObject({ kind: "boots", color: "Oatmeal" });
    expect(parsePiece("dark green corduroy trousers")).toMatchObject({ color: "Forest" });
    expect(parseList("patagonia fleece, cream\nnavy chinos").map((p) => [p.name, p.kind, p.color])).toEqual([
      ["Patagonia fleece, cream", "fleece", "Ecru"],
      ["Navy chinos", "chinos", "Navy"],
    ]);
    // A colour on the next line is its own (unknown) piece, not the last one's colour.
    expect(parseList("hoodie\ncream")).toHaveLength(2);
  });
});
