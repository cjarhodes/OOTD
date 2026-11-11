import { describe, expect, it } from "vitest";
import { makeItem } from "./kinds";
import { countPicked, ownedColours, piecesFor, removalsFor, SETUP_SECTIONS } from "./setup";
import { STARTER_DECK, starterItem } from "./starter";

const card = (id: string) => STARTER_DECK.find((c) => c.id === id)!;

describe("the one-page setup", () => {
  it("shows every deck card in exactly one section, in the stated order", () => {
    expect(SETUP_SECTIONS.map((s) => s.heading)).toEqual([
      "Shirts and tops",
      "Knitwear and layers",
      "Jackets and coats",
      "Trousers and shorts",
      "Shoes",
    ]);
    const ids = SETUP_SECTIONS.flatMap((s) => s.cards.map((c) => c.id));
    expect(ids).toHaveLength(STARTER_DECK.length);
    expect(new Set(ids).size).toBe(STARTER_DECK.length);
    // Within a section the deck's own order holds.
    for (const s of SETUP_SECTIONS) {
      const order = s.cards.map((c) => STARTER_DECK.indexOf(c));
      expect(order).toEqual([...order].sort((a, b) => a - b));
    }
  });

  it("finds the swiped colours of a card and ignores other pieces", () => {
    const items = [
      starterItem(card("tee"), "White"),
      starterItem(card("tee"), "Black"),
      // Another card whose id starts the same way.
      starterItem(card("denim-shirt"), "Denim"),
      starterItem(card("denim-jacket"), "Denim"),
      // A photographed tee is not a swiped one.
      makeItem({ id: "abc", name: "Grey tee", kind: "tee", color: "Grey" }),
    ];
    expect(ownedColours(card("tee"), items)).toEqual(["White", "Black"]);
    expect(ownedColours(card("denim-shirt"), items)).toEqual(["Denim"]);
    expect(ownedColours(card("jeans"), items)).toEqual([]);
  });

  it("adds the chosen colours, skipping owned ids and repeats", () => {
    const items = [starterItem(card("tee"), "White")];
    const pieces = piecesFor({ tee: ["White", "Black", "Black"], jeans: ["Indigo"] }, items);
    expect(pieces.map((p) => p.id)).toEqual(["st-tee-black", "st-jeans-indigo"]);
    expect(countPicked({ tee: ["White", "Black", "Black"], jeans: ["Indigo"] }, items)).toBe(2);
  });

  it("allows a colour that is not on the card", () => {
    expect(card("tee").colors).not.toContain("Red");
    const [piece] = piecesFor({ tee: ["Red"] }, []);
    expect(piece?.id).toBe("st-tee-red");
    expect(piece?.color).toBe("Red");
  });

  it("adds nothing when nothing is ticked", () => {
    expect(piecesFor({}, [])).toEqual([]);
    expect(piecesFor({ tee: [] }, [])).toEqual([]);
  });

  it("removes only the swiped pieces that were unticked and are really there", () => {
    const whiteTee = starterItem(card("tee"), "White");
    const blackTee = starterItem(card("tee"), "Black");
    // A photographed white tee is the person's own piece: unticking the card never touches it.
    const photographed = makeItem({ id: "photo-1", name: "White tee", kind: "tee", color: "White" });
    const items = [whiteTee, blackTee, photographed];
    expect(removalsFor({ tee: ["White"] }, items)).toEqual([whiteTee]);
    // A colour that isn't in the wardrobe, and a repeat, remove nothing extra.
    expect(removalsFor({ tee: ["White", "White", "Grey"] }, items)).toEqual([whiteTee]);
    expect(removalsFor({}, items)).toEqual([]);
  });
});
