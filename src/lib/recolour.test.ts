import { describe, expect, it } from "vitest";
import { copiesInColours, renamedFor, takenColours } from "./recolour";
import { starterItem, STARTER_DECK } from "./starter";
import { makeItem } from "./kinds";

const crew = STARTER_DECK.find((c) => c.id === "crew")!;
const navy = starterItem(crew, "Navy");
let n = 0;
const ids = () => `new-${++n}`;

describe("renaming for a new colour", () => {
  it("swaps the colour at the start of the name", () => {
    expect(renamedFor("Navy merino crewneck", "Navy", "Grey")).toBe("Grey merino crewneck");
    expect(renamedFor("navy crewneck", "Navy", "Grey")).toBe("Grey crewneck");
  });
  it("leaves a name that doesn't start with its colour alone", () => {
    expect(renamedFor("Merino crewneck", "Navy", "Grey")).toBe("Merino crewneck");
    expect(renamedFor("Navyblue crewneck", "Navy", "Grey")).toBe("Navyblue crewneck");
  });
});

describe("colours already taken", () => {
  it("is the piece's own colour and the same piece in other colours", () => {
    const items = [navy, starterItem(crew, "Grey"), starterItem(STARTER_DECK.find((c) => c.id === "jeans")!, "Black")];
    expect(takenColours(navy, items).sort()).toEqual(["Grey", "Navy"]);
  });

  it("ignores another type with the same words, and a different name on the same type", () => {
    const other = makeItem({ id: "x", name: "Black cashmere crewneck", kind: "crewneck", color: "Black" });
    const sameWords = makeItem({ id: "y", name: "Black merino crewneck", kind: "cardigan", color: "Black" });
    expect(takenColours(navy, [navy, other, sameWords])).toEqual(["Navy"]);
  });

  it("matches a name that doesn't start with its colour only when the whole name matches", () => {
    const a = makeItem({ id: "a", name: "Crewneck", kind: "crewneck", color: "Navy" });
    const b = makeItem({ id: "b", name: "Crewneck", kind: "crewneck", color: "Grey" });
    expect(takenColours(a, [a, b]).sort()).toEqual(["Grey", "Navy"]);
  });
});

describe("copies", () => {
  it("makes one per colour with new ids, the same details and the colour swapped in the name", () => {
    const out = copiesInColours(navy, ["Grey", "Black"], [navy], ids);
    expect(out.map((i) => i.name)).toEqual(["Grey merino crewneck", "Black merino crewneck"]);
    expect(out.map((i) => i.color)).toEqual(["Grey", "Black"]);
    expect(new Set(out.map((i) => i.id)).size).toBe(2);
    expect(out.every((i) => i.id !== navy.id && i.kind === navy.kind && i.material === navy.material && i.warmth === navy.warmth)).toBe(true);
  });

  it("skips colours already owned and repeats within the request, and the piece's own", () => {
    const items = [navy, starterItem(crew, "Grey")];
    expect(copiesInColours(navy, ["Grey", "Navy", "Black", "Black"], items, ids).map((i) => i.color)).toEqual(["Black"]);
  });

  it("starts each copy available, even when the original is in the wash", () => {
    expect(copiesInColours({ ...navy, status: "laundry" }, ["Grey"], [navy], ids)[0]!.status).toBe("available");
  });
});
