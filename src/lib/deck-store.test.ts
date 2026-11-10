import { describe, expect, it } from "vitest";
import {
  HINT_KEY,
  choicesAfter,
  hintSeen,
  markHintSeen,
  loadChoices,
  parseChoices,
  saveChoices,
  skippedCount,
  storeKey,
  withChoice,
  withoutSkipped,
  type StorageLike,
} from "./deck-store";

function fake(initial: Record<string, string> = {}): StorageLike & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k]! : null),
    setItem: (k, v) => {
      data[k] = v;
    },
  };
}

const broken: StorageLike = {
  getItem: () => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("blocked");
  },
};

describe("deck store", () => {
  it("keeps each account, and the sample wardrobe, apart", () => {
    expect(storeKey("abc")).not.toBe(storeKey("def"));
    expect(storeKey(null)).toBe("ootd.swipe.v1.sample");
    expect(storeKey("sample")).not.toBe(storeKey(null));
  });

  it("stores { v: 1, choices }", () => {
    const s = fake();
    saveChoices(s, "k", { tee: "have" });
    expect(JSON.parse(s.data.k!)).toEqual({ v: 1, choices: { tee: "have" } });
    expect(loadChoices(s, "k")).toEqual({ tee: "have" });
  });

  it("remembers a choice and takes it back on undo", () => {
    const decided = choicesAfter({ tee: "have" }, { saveChoice: { cardId: "jeans", choice: "skip" }, clearChoiceId: null });
    expect(decided).toEqual({ tee: "have", jeans: "skip" });
    expect(choicesAfter(decided, { saveChoice: null, clearChoiceId: "jeans" })).toEqual({ tee: "have" });
    expect(choicesAfter(decided, { saveChoice: null, clearChoiceId: null })).toBe(decided);
  });

  it("counts and clears only the skipped ones", () => {
    const all = { a: "skip", b: "have", c: "skip", d: "want" } as const;
    expect(skippedCount(all)).toBe(2);
    expect(withoutSkipped(all)).toEqual({ b: "have", d: "want" });
    expect(withChoice({}, "a", "want")).toEqual({ a: "want" });
  });

  it("can count and clear the skipped ones of some cards only", () => {
    const all = { a: "skip", b: "have", c: "skip", d: "want" } as const;
    expect(skippedCount(all, ["a", "b"])).toBe(1);
    expect(skippedCount(all, [])).toBe(0);
    expect(withoutSkipped(all, ["a", "b"])).toEqual({ b: "have", c: "skip", d: "want" });
    expect(withoutSkipped(all, [])).toEqual(all);
  });

  it("reads nothing from missing, corrupt or odd data", () => {
    expect(loadChoices(fake(), "k")).toEqual({});
    expect(loadChoices(fake({ k: "{not json" }), "k")).toEqual({});
    expect(parseChoices("null")).toEqual({});
    expect(parseChoices('"text"')).toEqual({});
    expect(parseChoices('{"v":2,"choices":{"tee":"have"}}')).toEqual({});
    expect(parseChoices('{"v":1}')).toEqual({});
    expect(parseChoices('{"v":1,"choices":[]}')).toEqual({});
    expect(parseChoices('{"v":1,"choices":"x"}')).toEqual({});
  });

  it("keeps the good entries when others are invalid", () => {
    expect(parseChoices('{"v":1,"choices":{"tee":"have","jeans":"maybe","shell":4,"puffer":"want"}}')).toEqual({ tee: "have", puffer: "want" });
  });

  it("works with no storage at all, and with storage that throws", () => {
    expect(loadChoices(null, "k")).toEqual({});
    expect(() => saveChoices(null, "k", { tee: "have" })).not.toThrow();
    expect(loadChoices(broken, "k")).toEqual({});
    expect(() => saveChoices(broken, "k", { tee: "skip" })).not.toThrow();
  });

  it("doesn't mix accounts", () => {
    const s = fake();
    saveChoices(s, storeKey("a"), { tee: "have" });
    expect(loadChoices(s, storeKey("b"))).toEqual({});
    expect(loadChoices(s, storeKey(null))).toEqual({});
  });

  it("remembers that the hint has played, on this device only", () => {
    const s = fake();
    expect(hintSeen(s)).toBe(false);
    markHintSeen(s);
    expect(hintSeen(s)).toBe(true);
    // Not tied to an account, and kept apart from the card choices.
    expect(s.data[HINT_KEY]).toBe("1");
    expect(loadChoices(s, storeKey("a"))).toEqual({});
    saveChoices(s, storeKey("a"), { tee: "have" });
    expect(hintSeen(s)).toBe(true);
  });

  it("treats a missing, odd or blocked store as hint not seen, without throwing", () => {
    expect(hintSeen(null)).toBe(false);
    expect(hintSeen(fake({ [HINT_KEY]: "yes" }))).toBe(false);
    expect(hintSeen(broken)).toBe(false);
    expect(() => markHintSeen(null)).not.toThrow();
    expect(() => markHintSeen(broken)).not.toThrow();
  });
});
