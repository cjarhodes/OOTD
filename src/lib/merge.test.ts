import { describe, expect, it } from "vitest";
import { emptyPersonal, type PersonalState } from "./db";
import { makeItem } from "./kinds";
import { mergeStates } from "./merge";

const piece = (id: string, name = id) => makeItem({ id, name, kind: "tee", color: "White" });

describe("mergeStates", () => {
  it("keeps every piece from both copies, with this device winning a tie", () => {
    // The phone swiped 40 pieces; the account has 3 typed on another device.
    const device: PersonalState = { ...emptyPersonal(), items: [...Array.from({ length: 40 }, (_, i) => piece(`d${i}`)), piece("both", "Phone name")] };
    const account: PersonalState = { ...emptyPersonal(), items: [piece("a1"), piece("a2"), piece("a3"), piece("both", "Laptop name")] };
    const merged = mergeStates(device, account);
    expect(merged.items).toHaveLength(44);
    expect(merged.items.find((i) => i.id === "both")!.name).toBe("Phone name");
  });

  it("joins wears without doubling one logged on both, and keeps plans, notes and trips from both", () => {
    const device: PersonalState = {
      ...emptyPersonal(),
      wears: [{ date: "2026-11-02", itemIds: ["a", "b"] }],
      plans: { "2026-11-09": { date: "2026-11-09", itemIds: ["a"], occasion: "office", tier: "fresh" } },
      feedback: { "a+b": "love" },
      comfort: "runs-warm",
      trips: [{ id: "t1" } as never],
      wishlist: [{ id: "w1", name: "Sky oxford", kind: "oxford", color: "Sky", addedAt: "2026-11-01" }],
    };
    const account: PersonalState = {
      ...emptyPersonal(),
      items: [piece("w2")],
      wears: [{ date: "2026-11-02", itemIds: ["b", "a"] }, { date: "2026-11-01", itemIds: ["c"] }],
      plans: { "2026-11-09": { date: "2026-11-09", itemIds: ["z"], occasion: "office", tier: "easy" }, "2026-11-10": { date: "2026-11-10", itemIds: ["c"], occasion: "weekend", tier: "fresh" } },
      feedback: { "c": "skip" },
      trips: [{ id: "t1" } as never, { id: "t2" } as never],
      wishlist: [{ id: "w2", name: "Got it", kind: "tee", color: "White", addedAt: "2026-11-01" }],
    };
    const merged = mergeStates(device, account);
    expect(merged.wears.map((w) => w.date)).toEqual(["2026-11-01", "2026-11-02"]);
    expect(merged.plans["2026-11-09"]!.itemIds).toEqual(["a"]);
    expect(Object.keys(merged.plans)).toEqual(["2026-11-09", "2026-11-10"]);
    expect(merged.feedback).toEqual({ c: "skip", "a+b": "love" });
    expect(merged.comfort).toBe("runs-warm");
    expect(merged.trips!.map((t) => t.id)).toEqual(["t1", "t2"]);
    // A wish bought on the other device (now a piece) drops off the list.
    expect(merged.wishlist!.map((w) => w.id)).toEqual(["w1"]);
  });
});
