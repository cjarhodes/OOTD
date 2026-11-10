import { describe, expect, it } from "vitest";
import { parseList } from "./typed";

const brief = (text: string) => parseList(text).map((p) => [p.name, p.kind, p.color]);

describe("colour lists", () => {
  it("makes one piece per colour, in the order typed", () => {
    const want = [
      ["White tee", "tee", "White"],
      ["Black tee", "tee", "Black"],
      ["Grey tee", "tee", "Grey"],
    ];
    expect(brief("white, black and grey tees")).toEqual(want);
    expect(brief("white/black/grey tees")).toEqual(want);
    expect(brief("tees in white, black and grey")).toEqual(want);
    expect(brief("white & black & grey tees")).toEqual(want);
    expect(brief("navy and grey crewnecks")).toEqual([
      ["Navy crewneck", "crewneck", "Navy"],
      ["Grey crewneck", "crewneck", "Grey"],
    ]);
  });

  it("keeps plural-only garments plural, and shoes as pairs", () => {
    expect(brief("black, navy and grey jeans").map((r) => r[0])).toEqual(["Black jeans", "Navy jeans", "Grey jeans"]);
    expect(brief("white, black and grey sambas").map((r) => r[0])).toEqual(["White sambas", "Black sambas", "Grey sambas"]);
  });

  it("leaves two colours on one singular piece as one piece", () => {
    expect(brief("black and white tee")).toEqual([["Black and white tee", "tee", "Black"]]);
    expect(brief("red and black check shirt")).toEqual([["Red and black check shirt", "flannel", "Red"]]);
    // Trim colours and a slash before a question mark are not lists.
    expect(parseList("white/cream and brown accented adidas sambas")).toHaveLength(1);
    expect(parseList("Green/taupe? Bostons")).toHaveLength(1);
    expect(parseList("Light/baby blue adidas gazelles")).toHaveLength(1);
    expect(parseList("grey marl t shirt")).toHaveLength(1);
  });
});

describe("numbers", () => {
  it("makes that many pieces with the same name, never more than ten", () => {
    expect(brief("3 white tees")).toEqual(Array(3).fill(["White tee", "tee", "White"]));
    expect(brief("2x black jeans")).toEqual(Array(2).fill(["Black jeans", "jeans", "Black"]));
    expect(brief("black jeans x2")).toEqual(Array(2).fill(["Black jeans", "jeans", "Black"]));
    expect(brief("two grey hoodies")).toEqual(Array(2).fill(["Grey hoodie", "hoodie", "Grey"]));
    expect(parseList("ten navy tees")).toHaveLength(10);
    expect(parseList("25 navy tees")).toHaveLength(10);
    expect(brief("1 white tee")).toEqual([["White tee", "tee", "White"]]);
  });

  it("does not mistake model numbers and sizes for counts", () => {
    expect(brief("Levi's 501")).toEqual([["Levi's 501", "jeans", "Indigo"]]);
    expect(parseList("1/4 zip navy")).toHaveLength(1);
    expect(parseList("550s")).toHaveLength(1);
  });

  it("multiplies a count by a colour list", () => {
    expect(parseList("2 white and black tees")).toHaveLength(4);
  });
});

describe("a colour after a comma", () => {
  it("belongs to the piece before it", () => {
    expect(brief("Quarter zip, navy")).toEqual([["Navy Quarter zip", "quarter-zip", "Navy"]]);
    expect(brief("rugby shirt, green")).toEqual([["Green rugby shirt", "rugby", "Olive"]]);
    expect(brief("Adidas Sambas, black")).toEqual([["Black Adidas Sambas", "sneakers", "Black"]]);
    expect(brief("New Balance 990v5, grey")).toEqual([["Grey New Balance 990v5", "runners", "Grey"]]);
  });

  it("attaches backward only when the piece before has no colour", () => {
    // Navy already has a colour, so grey has nowhere to go and is left as a row to place.
    expect(brief("navy crewneck, grey")).toEqual([
      ["Navy crewneck", "crewneck", "Navy"],
      ["Grey", null, "Grey"],
    ]);
  });

  it("attaches forward when the piece before already has a colour, or there is none", () => {
    expect(brief("grey, black jeans")).toEqual([
      ["Grey jeans", "jeans", "Grey"],
      ["Black jeans", "jeans", "Black"],
    ]);
    expect(brief("white, black tees")).toEqual([
      ["White tee", "tee", "White"],
      ["Black tee", "tee", "Black"],
    ]);
    expect(brief("black jeans, grey, navy chinos").map((r) => r[0])).toEqual(["Black jeans", "Grey chinos", "Navy chinos"]);
  });

  it("reads a mixed list one way: a lone colour goes to the garment after it", () => {
    // "navy crewneck, grey, black jeans": the navy crewneck has its colour, so
    // "grey" joins the jeans that follow. Result: a navy crewneck, grey jeans
    // and black jeans. It is the more likely reading of a list of pieces.
    expect(brief("navy crewneck, grey, black jeans")).toEqual([
      ["Navy crewneck", "crewneck", "Navy"],
      ["Grey jeans", "jeans", "Grey"],
      ["Black jeans", "jeans", "Black"],
    ]);
  });

  it("does not cross lines", () => {
    expect(brief("navy tee\ngrey\nblack jeans").map((r) => r[0])).toEqual(["Navy tee", "Grey", "Black jeans"]);
  });

  it("leaves a colour with nothing to join as a row of its own", () => {
    expect(brief("grey")).toEqual([["Grey", null, "Grey"]]);
  });
});
