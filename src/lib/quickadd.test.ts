import { describe, expect, it } from "vitest";
import { addedNote, addLabel, colourOptions, defaultPick, filterCards, groupDeck, offerFor, ownedColours, togglePick } from "./quickadd";
import { KINDS } from "./kinds";
import { starterItem, STARTER_DECK } from "./starter";

const card = (id: string) => STARTER_DECK.find((c) => c.id === id)!;

describe("grouping the deck", () => {
  const groups = groupDeck(STARTER_DECK);

  it("puts every card in one group, by slot, in the order of the five slots", () => {
    expect(groups.map((g) => g.slot)).toEqual(["base", "mid", "outer", "bottom", "shoes"]);
    expect(groups.flatMap((g) => g.cards)).toHaveLength(STARTER_DECK.length);
    for (const g of groups) for (const c of g.cards) expect(KINDS[c.kind].slot).toBe(g.slot);
  });

  it("keeps deck order inside a group", () => {
    for (const g of groups) {
      const positions = g.cards.map((c) => STARTER_DECK.indexOf(c));
      expect(positions).toEqual([...positions].sort((a, b) => a - b));
    }
  });
});

describe("searching", () => {
  it("keeps everything for an empty search", () => {
    expect(filterCards(STARTER_DECK, "  ")).toHaveLength(STARTER_DECK.length);
  });

  it("matches words in any order, ignoring case", () => {
    expect(filterCards(STARTER_DECK, "LOAFERS").map((c) => c.id)).toEqual(["loafers"]);
    expect(filterCards(STARTER_DECK, "tee heavyweight").map((c) => c.id)).toEqual(["tee"]);
    expect(filterCards(STARTER_DECK, "zzzz")).toEqual([]);
  });

  it("offers a typed name as a piece of its type", () => {
    const o = offerFor("sambas");
    expect(o?.piece.kind).toBe("sneakers");
    expect(o?.label).toBe(`Add “${o!.piece.name}” as sneakers`);
  });

  it("offers nothing for an empty search, an unknown word or something OOTD doesn't plan", () => {
    expect(offerFor("   ")).toBeNull();
    expect(offerFor("mystery thing")).toBeNull();
    expect(offerFor("black belt")).toBeNull();
  });
});

describe("colours already owned", () => {
  const tee = card("tee");

  it("is only the colours of that card's own starter pieces", () => {
    const items = [starterItem(tee, "White"), starterItem(tee, "Black"), starterItem(card("jeans"), "Indigo")];
    expect(ownedColours(tee, items)).toEqual(expect.arrayContaining(["White", "Black"]));
    expect(ownedColours(tee, items)).toHaveLength(2);
  });

  it("ignores a piece of the same type that didn't come from the card", () => {
    expect(ownedColours(tee, [{ id: "typed-1" }, { id: "st-long-sleeve-white" }])).toEqual([]);
  });

  it("counts a colour outside the card's own list", () => {
    expect(ownedColours(tee, [starterItem(tee, "Rust")])).toEqual(["Rust"]);
  });

  it("is never picked again, and skips to the next colour for the default", () => {
    const owned = ownedColours(tee, [starterItem(tee, "White")]);
    expect(defaultPick(tee, owned)).toEqual(["Black"]);
    expect(togglePick(["Black"], "White", owned)).toEqual(["Black"]);
    expect(defaultPick(card("sneakers"), ["White", "Black"])).toEqual([]);
  });
});

describe("picking colours", () => {
  const tee = card("tee");

  it("toggles a colour on and off", () => {
    expect(togglePick(["White"], "Black", [])).toEqual(["White", "Black"]);
    expect(togglePick(["White", "Black"], "White", [])).toEqual(["Black"]);
  });

  it("shows the card's colours first, then any other owned or picked one once", () => {
    expect(colourOptions(tee, ["Rust"], ["Rust", "Pink"])).toEqual([...tee.colors, "Rust", "Pink"]);
    expect(colourOptions(tee, [], ["White"])).toEqual(tee.colors);
  });

  it("words the button and the confirmation", () => {
    expect(addLabel(0)).toBe("Add pieces");
    expect(addLabel(1)).toBe("Add 1 piece");
    expect(addLabel(3)).toBe("Add 3 pieces");
    expect(addedNote(["White heavyweight tee"])).toBe("Added: white heavyweight tee");
    expect(addedNote(["White tee", "Black tee", "Grey tee"])).toBe("Added: white tee, black tee and grey tee");
  });
});

describe("taps to add one common piece, starting on Wardrobe", () => {
  it("is three: open Quick add, tap the piece, tap Add (the first colour is already picked)", () => {
    const tee = card("tee");
    const taps = [
      "open Quick add",
      "tap the heavyweight tee",
      // No colour tap: the first colour is ticked, and the button already counts it.
      ...(defaultPick(tee, []).length === 1 ? [] : ["tap a colour"]),
      `tap "${addLabel(defaultPick(tee, []).length)}"`,
    ];
    expect(taps).toHaveLength(3);
    expect(defaultPick(tee, [])).toEqual(["White"]);
    expect(addLabel(1)).toBe("Add 1 piece");
  });
});
