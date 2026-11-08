import { KINDS, makeItem } from "./kinds";
import { PALETTE } from "./palette";
import { MATERIALS } from "./tagging";
import type { Item, Kind, Material, WishItem } from "./types";

/**
 * The wishlist: pieces to buy, tracked apart from the wardrobe so they never
 * reach a look, a count or a capsule. "Got it" turns an entry into a piece.
 */

const FITS = new Set(["slim", "regular", "relaxed", "boxy", "wide"]);

/** A wishlist entry as a piece: for drawing it, and for testing it as a next buy. Never stored. */
export function wishToItem(w: WishItem): Item {
  return makeItem({
    id: w.id,
    name: w.name,
    kind: w.kind,
    color: w.color,
    ...(w.fit ? { fit: w.fit } : {}),
    ...(w.material ? { material: w.material } : {}),
    ...(w.formality !== undefined ? { formality: w.formality } : {}),
    ...(w.boldness !== undefined ? { boldness: w.boldness } : {}),
  });
}

/** A piece described as a wishlist entry. */
export function wishFromItem(i: Pick<Item, "id" | "name" | "kind" | "color" | "fit" | "material" | "formality" | "boldness">, addedAt = new Date().toISOString()): WishItem {
  return {
    id: i.id,
    name: i.name,
    kind: i.kind,
    color: i.color,
    ...(i.fit ? { fit: i.fit } : {}),
    material: i.material,
    formality: i.formality,
    boldness: i.boldness,
    addedAt,
  };
}

/** Keep only well-formed entries, once each. Wishlists come from backups and other devices, so they're untrusted. */
export function cleanWishlist(raw: unknown): WishItem[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: WishItem[] = [];
  for (const w of raw as Partial<WishItem>[]) {
    if (!w || typeof w.id !== "string" || !w.id || w.id.length > 80 || seen.has(w.id)) continue;
    if (typeof w.name !== "string" || !w.name.trim() || w.name.length > 80) continue;
    if (typeof w.kind !== "string" || !(w.kind in KINDS)) continue;
    if (typeof w.color !== "string" || !(w.color in PALETTE)) continue;
    seen.add(w.id);
    out.push({
      id: w.id,
      name: w.name.trim(),
      kind: w.kind as Kind,
      color: w.color,
      ...(typeof w.fit === "string" && FITS.has(w.fit) ? { fit: w.fit } : {}),
      ...(typeof w.material === "string" && (MATERIALS as string[]).includes(w.material) ? { material: w.material as Material } : {}),
      ...(typeof w.formality === "number" ? { formality: Math.max(1, Math.min(5, Math.round(w.formality))) } : {}),
      ...(typeof w.boldness === "number" ? { boldness: Math.max(0, Math.min(2, Math.round(w.boldness))) } : {}),
      addedAt: typeof w.addedAt === "string" ? w.addedAt : new Date(0).toISOString(),
    });
  }
  return out;
}

/**
 * The first version of the wishlist kept wanted pieces among the wardrobe's
 * items (status "wanted"). Move any such pieces onto the wishlist, out of the
 * wardrobe, so nothing wanted can be worn or counted.
 */
export function moveWantedToWishlist<T extends { items: unknown[]; wishlist?: unknown }>(state: T): Omit<T, "wishlist"> & { wishlist: WishItem[] } {
  const wanted = (state.items as Partial<Item>[]).filter((i) => (i as { status?: string })?.status === "wanted");
  const existing = cleanWishlist(state.wishlist);
  if (!wanted.length) return { ...state, wishlist: existing };
  const moved = cleanWishlist(wanted.map((i) => ({ ...i, addedAt: new Date().toISOString() })));
  const ids = new Set(existing.map((w) => w.id));
  return {
    ...state,
    items: (state.items as Partial<Item>[]).filter((i) => (i as { status?: string })?.status !== "wanted"),
    wishlist: [...existing, ...moved.filter((w) => !ids.has(w.id))],
  };
}
