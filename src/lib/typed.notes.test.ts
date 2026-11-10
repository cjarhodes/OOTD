import { describe, expect, it } from "vitest";
import { parseList, parsePiece, readHeading } from "./typed";
import { afterAdding, rowsOf } from "./typelist";

const kinds = (text: string) => parseList(text).map((p) => p.kind);

describe("fresh lines the parser was not tuned on", () => {
  it("reads a bare fleece as the fleece type", () => {
    const p = parsePiece("black North Face fleece");
    expect(p?.kind).toBe("fleece");
    expect(p?.color).toBe("Black");
  });

  it("lets another garment word beat a bare fleece", () => {
    expect(parsePiece("fleece hoodie")?.kind).toBe("hoodie");
    expect(parsePiece("fleece lined jeans")?.kind).toBe("jeans");
  });

  it("reads 'a couple of' and 'a pair of' before a non-pair garment as two", () => {
    const tees = parseList("a couple of white t shirts");
    expect(tees.map((p) => [p.kind, p.color])).toEqual([["tee", "White"], ["tee", "White"]]);
    expect(parseList("a pair of white tees")).toHaveLength(2);
    expect(parseList("couple of grey hoodies")).toHaveLength(2);
  });

  it("keeps a pair of jeans or shoes as one, and 2 pairs as two", () => {
    expect(parseList("a pair of jeans")).toHaveLength(1);
    expect(parseList("a pair of black jeans")).toHaveLength(1);
    expect(parseList("a pair of white sneakers")).toHaveLength(1);
    expect(parseList("2 pairs of navy chinos")).toHaveLength(2);
    expect(parseList("one pair of navy chinos")).toHaveLength(1);
  });

  it("reads 'rain mac' as a rain shell, and a plain mac as an overcoat", () => {
    expect(parsePiece("navy rain mac")?.kind).toBe("rain-shell");
    expect(parsePiece("navy mac")?.kind).toBe("overcoat");
  });

  it("reads sweat shorts and jersey shorts as shorts", () => {
    expect(parsePiece("navy sweat shorts")?.kind).toBe("shorts");
    expect(parsePiece("grey jersey shorts")?.kind).toBe("shorts");
    expect(parsePiece("grey sweatshirt")?.kind).toBe("sweatshirt");
  });
});

describe("and between two garments", () => {
  it("makes two pieces", () => {
    expect(kinds("jeans and chinos")).toEqual(["jeans", "chinos"]);
    expect(kinds("black jeans and white tee")).toEqual(["jeans", "tee"]);
    expect(parseList("black jeans and white tee").map((p) => p.color)).toEqual(["Black", "White"]);
  });

  it("makes three from two ands", () => {
    expect(kinds("tee and jeans & sneakers")).toEqual(["tee", "jeans", "sneakers"]);
  });

  it("keeps two colours with one garment as one piece", () => {
    const one = parseList("black and white tee");
    expect(one).toHaveLength(1);
    expect(one[0]?.kind).toBe("tee");
    expect(parseList("red and black check shirt")).toHaveLength(1);
  });

  it("still lists colours", () => {
    expect(parseList("navy and grey crewnecks").map((p) => p.color)).toEqual(["Navy", "Grey"]);
  });
});

describe("headings", () => {
  it("recognises a line ending in a colon, or a lone slot word", () => {
    expect(readHeading("Shoes:")).toEqual({ slot: "shoes" });
    expect(readHeading("Jackets")).toEqual({ slot: "outer" });
    expect(readHeading("Tops")).toEqual({ slot: "base" });
    expect(readHeading("Work clothes:")).toEqual({ slot: null });
    expect(readHeading("Trousers:")).toEqual({ slot: "bottom" });
  });

  it("leaves ordinary lines and lone garment words alone", () => {
    expect(readHeading("navy crewneck")).toBeNull();
    expect(readHeading("trousers")).toBeNull();
    expect(readHeading("sneakers")).toBeNull();
    expect(readHeading("")).toBeNull();
  });

  it("makes no piece from a heading", () => {
    expect(parseList("Shoes:")).toEqual([]);
    expect(parseList("Jackets\nnavy bomber").map((p) => p.kind)).toEqual(["bomber"]);
  });

  it("breaks a tie under a heading only", () => {
    expect(parsePiece("white oxford")?.kind).toBe("oxford");
    expect(parseList("Shoes:\nwhite oxford")[0]?.kind).toBe("loafers");
    expect(parseList("Shoes:\nwhite oxford")[0]?.material).toBe("leather");
    expect(parseList("Tops:\nwhite oxford")[0]?.kind).toBe("oxford");
  });

  it("does not change a line that already has a type, and needs no help for Sambas", () => {
    expect(parseList("Shoes:\nSambas")[0]?.kind).toBe("sneakers");
    expect(parseList("Jackets\nnavy bomber")[0]?.kind).toBe("bomber");
    expect(parseList("Shoes:\nnavy bomber")[0]?.kind).toBe("bomber");
  });

  it("gives a line with no type one from the heading when the words allow", () => {
    expect(parseList("Jackets\nleather")[0]?.kind).toBe("bomber");
    expect(parseList("Bottoms:\ndark wash")[0]?.kind).toBe("jeans");
    expect(parseList("mystery thing")[0]?.kind).toBeNull();
  });

  it("ends at a blank line or the next heading", () => {
    expect(kinds("Shoes:\nwhite oxford\n\nwhite oxford")).toEqual(["loafers", "oxford"]);
    expect(kinds("Shoes:\nwhite oxford\nTops:\nwhite oxford")).toEqual(["loafers", "oxford"]);
  });

  const NOTE = [
    "Tops:",
    "white tee",
    "navy oxford",
    "grey hoodie",
    "",
    "Shoes",
    "white sambas",
    "brown oxford",
    "black chelsea boots",
    "",
    "Jackets:",
    "navy bomber",
    "olive waxed",
    "tan rain mac",
  ].join("\n");

  it("reads a 12-line note with three headings", () => {
    const pieces = parseList(NOTE);
    expect(pieces.map((p) => p.kind)).toEqual(["tee", "oxford", "hoodie", "sneakers", "loafers", "boots", "bomber", "waxed-jacket", "rain-shell"]);
    expect(pieces.map((p) => p.color)).toEqual(["White", "Navy", "Grey", "White", "Brown", "Black", "Navy", "Olive", "Camel"]);
  });

  it("keeps the context when rows are read through Type a list", () => {
    const rows = rowsOf(NOTE, {});
    expect(rows).toHaveLength(9);
    expect(rows[4]?.kind).toBe("loafers");
    expect(rows[4]?.chunk).toBe(7);
  });

  it("drops a heading with its lines when they are added, and keeps one that still has a line", () => {
    const text = "Shoes:\nwhite sambas\nmystery thing\n\nTops:\nwhite tee";
    const after = afterAdding(text, {});
    expect(after.text).toBe("Shoes:\nmystery thing");
  });
});
