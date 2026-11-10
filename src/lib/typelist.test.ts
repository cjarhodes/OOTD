import { describe, expect, it } from "vitest";
import { addLabel, afterAdding, applyFix, isReady, leftNote, missingOf, rowsOf, withoutRow } from "./typelist";
import { usualColour } from "./starter";

describe("rows ready to add", () => {
  it("counts only pieces with a type and a colour", () => {
    const rows = rowsOf("navy crewneck, mystery thing, black belt, purple hoodie", {});
    expect(rows.map((r) => isReady(r))).toEqual([true, false, false, false]);
    expect(addLabel(rows)).toBe("Add 1 piece");
  });

  it("says Add pieces when nothing is ready, and the plural when several are", () => {
    expect(addLabel(rowsOf("", {}))).toBe("Add pieces");
    expect(addLabel(rowsOf("mystery thing", {}))).toBe("Add pieces");
    expect(addLabel(rowsOf("white tee\nblack jeans\ngrey hoodie", {}))).toBe("Add 3 pieces");
  });

  it("gives an unsupported piece no way to be ready, and a missing colour is ready once picked", () => {
    const [belt, hoodie] = rowsOf("black belt\npurple hoodie", {});
    expect(belt!.unsupported).toBeTruthy();
    expect(isReady(belt!)).toBe(false);
    expect(isReady(hoodie!)).toBe(false);
    const [fixed] = rowsOf("purple hoodie", { "0:0:Purple hoodie": { color: "Navy" } });
    expect(isReady(fixed!)).toBe(true);
    expect(fixed!.colorGuessed).toBe(false);
  });
});

describe("corrections", () => {
  it("are kept apart for identical lines", () => {
    const rows = rowsOf("white tee\nwhite tee", { "1:0:White tee": { kind: "polo" } });
    expect(rows.map((r) => r.kind)).toEqual(["tee", "polo"]);
  });

  it("are kept apart for the pieces of one count", () => {
    const rows = rowsOf("3 white tees", { "0:1:White tee": { kind: "polo" } });
    expect(rows.map((r) => r.kind)).toEqual(["tee", "polo", "tee"]);
  });

  it("re-derive a guessed colour for a hand-picked type", () => {
    const [p] = rowsOf("mystery thing", {});
    const fixed = applyFix(p!, { kind: "chinos" });
    expect(fixed.kind).toBe("chinos");
    expect(fixed.color).toBe(usualColour("chinos"));
    expect(fixed.colorGuessed).toBe(true);
  });

  it("keep a typed colour when the type is picked by hand", () => {
    const [p] = rowsOf("navy mystery thing", {});
    expect(p!.colorGuessed).toBe(false);
    expect(applyFix(p!, { kind: "chinos" }).color).toBe("Navy");
  });

  it("keep a colour the person picked", () => {
    const [p] = rowsOf("mystery thing", {});
    const fixed = applyFix(p!, { kind: "chinos", color: "Olive" });
    expect(fixed.color).toBe("Olive");
    expect(fixed.colorGuessed).toBe(false);
  });
});

describe("what is left after adding", () => {
  it("leaves the line that has no type, and drops the belt", () => {
    const text = "navy crewneck, mystery thing, black belt";
    const rows = rowsOf(text, {});
    expect(addLabel(rows)).toBe("Add 1 piece");
    const after = afterAdding(text, {});
    expect(after.text.toLowerCase()).toBe("mystery thing");
    expect(leftNote(rowsOf(after.text, after.fixes))).toBe("1 line left. Pick a type for each, or delete it.");
  });

  it("leaves lines as typed when they are all still waiting, and drops the rest", () => {
    expect(afterAdding("white tee\nMystery   Thing\nblack belt\nwhat is this", {}).text).toBe("Mystery   Thing\nwhat is this");
  });

  it("leaves nothing when everything was added", () => {
    expect(afterAdding("white tee\nblack jeans", {}).text).toBe("");
    expect(leftNote(rowsOf("", {}))).toBeNull();
  });

  it("counts several lines left", () => {
    expect(leftNote(rowsOf("foo bar\nbaz qux\nwhite tee", {}))).toBe("2 lines left. Pick a type for each, or delete them.");
  });

  it("says a colour is missing when that is all that is", () => {
    const rows = rowsOf("purple hoodie\nlilac tee", {});
    expect(rows.every((r) => r.kind !== null && r.colorMissing)).toBe(true);
    expect(leftNote(rows)).toBe("2 lines left. Pick a colour for each, or delete them.");
    expect(leftNote(rowsOf("purple hoodie", {}))).toBe("1 line left. Pick a colour for each, or delete it.");
  });

  it("says type or colour when both kinds of line are waiting", () => {
    const rows = rowsOf("purple hoodie\nmystery thing", {});
    expect(missingOf(rows)).toEqual({ type: true, colour: true });
    expect(leftNote(rows)).toBe("2 lines left. Pick a type or colour for each, or delete them.");
  });

  it("stops asking for a colour once it is picked, or a type once it is picked", () => {
    const text = "purple hoodie\nmystery thing";
    expect(leftNote(rowsOf(text, { "0:0:Purple hoodie": { color: "Olive" } }))).toBe("1 line left. Pick a type for each, or delete it.");
    expect(leftNote(rowsOf(text, { "1:0:Mystery thing": { kind: "tee" } }))).toBe("1 line left. Pick a colour for each, or delete it.");
  });

  it("says nothing is missing when nothing is waiting", () => {
    expect(missingOf(rowsOf("white tee\nblack belt", {}))).toEqual({ type: false, colour: false });
  });

  it("moves a waiting line's correction to where the line now sits", () => {
    const text = "white tee\nmystery thing";
    const after = afterAdding(text, { "1:0:Mystery thing": { color: "Olive" } });
    expect(after.text).toBe("mystery thing");
    expect(after.fixes).toEqual({ "0:0:Mystery thing": { color: "Olive" } });
  });
});

describe("removing a row", () => {
  it("deletes its line and moves later corrections up", () => {
    const text = "white tee\nblack jeans\ngrey hoodie";
    const out = withoutRow(text, { "2:0:Grey hoodie": { color: "Olive" } }, "1:0:Black jeans");
    expect(out.text).toBe("white tee\ngrey hoodie");
    expect(out.fixes).toEqual({ "1:0:Grey hoodie": { color: "Olive" } });
  });

  it("removes one of three identical pieces and keeps the other two", () => {
    const out = withoutRow("3 white tees", {}, "0:1:White tee");
    expect(rowsOf(out.text, out.fixes).map((r) => r.name)).toEqual(["White tee", "White tee"]);
  });

  it("removes one piece of a comma line and keeps the rest", () => {
    const out = withoutRow("navy crewneck, mystery thing", {}, "0:0:Navy crewneck");
    expect(out.text.toLowerCase()).toBe("mystery thing");
  });
});
