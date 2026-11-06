import { describe, expect, it } from "vitest";
import { lookbookEntries, lookbookView } from "./lookbook";
import { SAMPLE_ITEMS } from "./sample";

const ids = (...x: string[]) => x;
const A = ids("b-tee-white", "p-jeans-indigo", "s-sneakers-white");
const B = ids("b-oxford-sky", "m-crew-navy", "p-jeans-indigo", "s-sneakers-white");

describe("lookbook", () => {
  it("groups wears by look, whatever the order, and counts them", () => {
    const entries = lookbookEntries(
      [
        { date: "2026-10-01", itemIds: A, occasion: "weekend" },
        { date: "2026-10-09", itemIds: [...A].reverse(), occasion: "office" },
        { date: "2026-10-05", itemIds: B },
      ],
      {},
      SAMPLE_ITEMS,
    );
    expect(entries).toHaveLength(2);
    const a = entries.find((e) => e.itemIds.includes("b-tee-white"))!;
    expect(a.worn).toBe(2);
    expect(a.lastWorn).toBe("2026-10-09");
    expect(a.occasion).toBe("office");
  });

  it("includes loved looks that were never worn, and skips looks with deleted pieces", () => {
    const loved = [...B].sort().join("+");
    const entries = lookbookEntries([{ date: "2026-10-01", itemIds: ["gone", ...A.slice(1)] }], { [loved]: "love", "x+y": "love" }, SAMPLE_ITEMS);
    expect(entries.map((e) => e.signature)).toEqual([loved]);
    expect(entries[0]!.loved).toBe(true);
    expect(entries[0]!.worn).toBe(0);
  });

  it("sorts each view for its purpose", () => {
    const entries = lookbookEntries(
      [
        { date: "2026-10-01", itemIds: A },
        { date: "2026-10-02", itemIds: A },
        { date: "2026-11-04", itemIds: B },
      ],
      { [[...B].sort().join("+")]: "love" },
      SAMPLE_ITEMS,
    );
    expect(lookbookView(entries, "worn", "2026-11-06")[0]!.worn).toBe(2);
    expect(lookbookView(entries, "loved", "2026-11-06")).toHaveLength(1);
    // A favourite not worn in two weeks comes back; one worn this week doesn't.
    expect(lookbookView(entries, "lately", "2026-11-06").map((e) => e.worn)).toEqual([2]);
  });
});
