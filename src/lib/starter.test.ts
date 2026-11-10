import { describe, expect, it } from "vitest";
import { KINDS } from "./kinds";
import { COLOR_NAMES } from "./palette";
import { groupDeck } from "./quickadd";
import { ROUNDS, STARTER_DECK, starterItem, usualColour } from "./starter";

describe("the starter deck", () => {
  it("is at most 56 cards", () => {
    expect(STARTER_DECK.length).toBeLessThanOrEqual(56);
  });

  it("has unique ids, and no id that another card's id starts with, so starter piece ids can't collide", () => {
    const ids = STARTER_DECK.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const a of ids) for (const b of ids) if (a !== b) expect(b.startsWith(`${a}-`), `${a} / ${b}`).toBe(false);
  });

  it("uses only colours and types that exist, and lists no colour twice", () => {
    for (const c of STARTER_DECK) {
      expect(c.colors.length, c.id).toBeGreaterThan(0);
      expect(new Set(c.colors).size, c.id).toBe(c.colors.length);
      for (const colour of c.colors) expect(COLOR_NAMES, `${c.id} ${colour}`).toContain(colour);
      expect(KINDS[c.kind], c.id).toBeDefined();
    }
  });

  it("builds a piece for every card in every colour, with its own id", () => {
    const seen = new Set<string>();
    for (const c of STARTER_DECK) {
      for (const colour of c.colors) {
        const item = starterItem(c, colour);
        expect(item.id).toBe(`st-${c.id}-${colour.toLowerCase()}`);
        expect(item.kind).toBe(c.kind);
        expect(item.color).toBe(colour);
        expect(item.name.toLowerCase().startsWith(colour.toLowerCase()), item.name).toBe(true);
        expect(item.name.toLowerCase().split(" ").filter((w) => w === colour.toLowerCase()), item.name).toHaveLength(1);
        expect(seen.has(item.id), item.id).toBe(false);
        seen.add(item.id);
      }
    }
  });

  it("has no two cards with the same type, fit, material and first colour, and none with the same type and first colour", () => {
    const full = new Set<string>();
    const short = new Set<string>();
    for (const c of STARTER_DECK) {
      const f = [c.kind, c.fit ?? "", c.material ?? "", c.colors[0]].join("/");
      const s = [c.kind, c.colors[0]].join("/");
      expect(full.has(f), `${c.id}: ${f}`).toBe(false);
      expect(short.has(s), `${c.id}: ${s}`).toBe(false);
      full.add(f);
      short.add(s);
    }
  });

  it("gives every card a round, a one-line note and a tag, and keeps round 1 at twelve", () => {
    for (const c of STARTER_DECK) {
      expect(ROUNDS, c.id).toContain(c.round);
      expect(c.note.trim(), c.id).not.toBe("");
      expect(c.note, c.id).not.toMatch(/\n/);
      expect(["Essential", "Now"], c.id).toContain(c.tag);
    }
    expect(STARTER_DECK.filter((c) => c.round === 1)).toHaveLength(12);
  });

  it("puts new cards in a round that fits their part of the wardrobe", () => {
    for (const c of STARTER_DECK.filter((x) => x.round !== 1)) {
      const slot = KINDS[c.kind].slot;
      if (c.round === 2) expect(["mid", "outer"], c.id).toContain(slot);
      if (c.round === 3) expect(slot, c.id).toBe("shoes");
      if (c.round === 4) expect(["base", "bottom"], c.id).toContain(slot);
    }
  });

  it("still groups sensibly for Quick add: every card once, every part of the wardrobe drawn", () => {
    const groups = groupDeck(STARTER_DECK);
    expect(groups.map((g) => g.slot)).toEqual(["base", "mid", "outer", "bottom", "shoes"]);
    expect(groups.flatMap((g) => g.cards)).toHaveLength(STARTER_DECK.length);
    for (const g of groups) expect(g.cards.every((c) => KINDS[c.kind].slot === g.slot)).toBe(true);
  });

  it("leaves the usual colour of each type as it was, with new cards after the old ones", () => {
    expect(usualColour("oxford")).toBe("Sky");
    expect(usualColour("jeans")).toBe("Indigo");
    expect(usualColour("trousers")).toBe("Charcoal");
    expect(usualColour("loafers")).toBe("Brown");
    expect(usualColour("bomber")).toBe("Black");
    expect(usualColour("v-neck")).toBe("Navy");
  });
});
