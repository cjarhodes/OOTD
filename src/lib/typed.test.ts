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
});
