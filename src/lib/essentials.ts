import { isOwned } from "./kinds";
import type { Item, Slot } from "./types";

/** The pieces a first look can't do without. */
export const ESSENTIALS: { slot: Slot; label: string }[] = [
  { slot: "base", label: "A top: a tee, shirt or knit polo" },
  { slot: "bottom", label: "Trousers, jeans or chinos" },
  { slot: "shoes", label: "A pair of shoes" },
];

/** Slots a wardrobe still needs before it can make a look. */
export function missingEssentials(items: readonly Pick<Item, "slot" | "status">[]): Slot[] {
  const have = new Set(items.filter(isOwned).map((i) => i.slot));
  return ESSENTIALS.map((e) => e.slot).filter((s) => !have.has(s));
}
