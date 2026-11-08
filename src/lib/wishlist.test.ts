import { describe, expect, it } from "vitest";
import { parseBackup } from "./backup";
import { STARTER_DECK, starterItem } from "./starter";
import { cleanWishlist, moveWantedToWishlist, wishFromItem, wishToItem } from "./wishlist";

const card = (id: string) => STARTER_DECK.find((c) => c.id === id)!;

describe("wishlist", () => {
  it("round-trips a piece through a wishlist entry", () => {
    const loafers = starterItem(card("loafers"), "Black");
    const back = wishToItem(wishFromItem(loafers, "2026-11-08T00:00:00Z"));
    expect(back).toMatchObject({ id: loafers.id, name: loafers.name, kind: "loafers", color: "Black", material: "suede", status: "available" });
  });

  it("keeps only well-formed entries, once each", () => {
    const good = wishFromItem(starterItem(card("chore")));
    const list = cleanWishlist([good, good, { ...good, id: "x", kind: "spacesuit" }, { ...good, id: "y", color: "Plaid" }, null, "nope"]);
    expect(list).toEqual([good]);
    expect(cleanWishlist("not a list")).toEqual([]);
  });

  it("moves pieces saved as wanted out of the wardrobe and onto the wishlist", () => {
    const tee = starterItem(card("tee"));
    const legacy = { ...starterItem(card("overcoat")), status: "wanted" };
    const moved = moveWantedToWishlist({ items: [tee, legacy] as unknown[], wishlist: [] });
    expect(moved.items).toEqual([tee]);
    expect(moved.wishlist.map((w) => w.id)).toEqual([legacy.id]);
  });

  it("does the same for backups and saves, so a wanted piece can never be worn", () => {
    const tee = starterItem(card("tee"));
    const legacy = { ...starterItem(card("overcoat")), status: "wanted" };
    const parsed = parseBackup({
      app: "ootd",
      version: 1,
      exportedAt: "2026-11-08T00:00:00Z",
      state: { version: 1, items: [tee, legacy], wears: [], plans: {}, feedback: {}, comfort: "neutral", trips: [] },
      images: {},
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.backup.state.items.map((i) => i.id)).toEqual([tee.id]);
    expect(parsed.backup.state.wishlist?.map((w) => w.id)).toEqual([legacy.id]);
  });
});
