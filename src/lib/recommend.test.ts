import { describe, expect, it } from "vitest";
import { candidates, nextBuys } from "./recommend";
import { SAMPLE_ITEMS } from "./sample";
import { alreadyHas, STARTER_DECK, starterItem } from "./starter";
import type { Item } from "./types";

const card = (id: string) => STARTER_DECK.find((c) => c.id === id)!;
const summer: Item[] = [starterItem(card("tee")), starterItem(card("jeans")), starterItem(card("sneakers"))];

describe("starter deck", () => {
  it("builds valid, distinct pieces in the colour chosen", () => {
    const ids = new Set<string>();
    for (const c of STARTER_DECK) {
      for (const color of c.colors) {
        const item = starterItem(c, color);
        expect(item.color).toBe(color);
        expect(item.name.startsWith(color)).toBe(true);
        expect(ids.has(item.id)).toBe(false);
        ids.add(item.id);
      }
    }
  });

  it("knows what a wardrobe already has", () => {
    expect(alreadyHas(card("tee"), summer)).toBe(true);
    expect(alreadyHas(card("overcoat"), summer)).toBe(false);
    // A wishlist piece doesn't count as owned by kind and colour.
    expect(alreadyHas(card("overcoat"), [{ ...SAMPLE_ITEMS.find((i) => i.kind === "overcoat")!, status: "wanted" }])).toBe(false);
  });
});

describe("next buys", () => {
  it("tells a summer-only wardrobe to buy something warm", () => {
    const buys = nextBuys(summer);
    expect(buys.length).toBeGreaterThan(0);
    const top = buys[0]!;
    expect(["mid", "outer"]).toContain(top.item.slot);
    expect(top.unlocks).toBeGreaterThan(0);
    expect(top.reason).toMatch(/new looks? you can’t make today/);
  });

  it("puts wishlist pieces first among the candidates, and never suggests what's owned", () => {
    const want = { ...starterItem(card("loafers")), status: "wanted" as const };
    const list = candidates([...summer, want]);
    expect(list[0]!.wanted).toBe(true);
    expect(list.some((c) => c.item.kind === "tee" && c.item.color === "White")).toBe(false);
  });
});
