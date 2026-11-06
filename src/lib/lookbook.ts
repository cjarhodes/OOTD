import { addDays } from "./dates";
import type { FeedbackValue, Item, Occasion, Wear } from "./types";

/** One look in the lookbook: something worn, loved, or both. */
export interface LookbookEntry {
  signature: string;
  itemIds: string[];
  loved: boolean;
  worn: number;
  lastWorn: string | null;
  /** The occasion it was last worn for, if recorded. */
  occasion: Occasion | null;
}

/**
 * Every look that has been worn or loved, once each, with how often and when.
 * Looks that use a piece since deleted are left out; archived pieces still count.
 */
export function lookbookEntries(wears: Wear[], feedback: Record<string, FeedbackValue>, items: Item[]): LookbookEntry[] {
  const known = new Set(items.map((i) => i.id));
  const bySig = new Map<string, LookbookEntry>();
  const entry = (ids: string[]): LookbookEntry | null => {
    if (!ids.length || !ids.every((id) => known.has(id))) return null;
    const signature = [...ids].sort().join("+");
    let e = bySig.get(signature);
    if (!e) {
      e = { signature, itemIds: [...ids].sort(), loved: false, worn: 0, lastWorn: null, occasion: null };
      bySig.set(signature, e);
    }
    return e;
  };
  for (const w of wears) {
    const e = entry(w.itemIds);
    if (!e) continue;
    e.worn++;
    if (!e.lastWorn || w.date >= e.lastWorn) {
      e.lastWorn = w.date;
      e.occasion = w.occasion ?? e.occasion;
    }
  }
  for (const [sig, value] of Object.entries(feedback)) {
    if (value !== "love") continue;
    const e = entry(sig.split("+"));
    if (e) e.loved = true;
  }
  return [...bySig.values()];
}

export type LookbookView = "loved" | "worn" | "lately";

/** Loved looks first by most recent wear; worn by how often; "not lately" for favourites gone quiet. */
export function lookbookView(entries: LookbookEntry[], view: LookbookView, today: string): LookbookEntry[] {
  const recent = (e: LookbookEntry) => e.lastWorn ?? "";
  if (view === "loved") return entries.filter((e) => e.loved).sort((a, b) => recent(b).localeCompare(recent(a)));
  if (view === "worn") return entries.filter((e) => e.worn > 0).sort((a, b) => b.worn - a.worn || recent(b).localeCompare(recent(a)));
  // Worn more than once, or loved, but not in the last two weeks: worth bringing back.
  const cutoff = addDays(today, -14);
  return entries
    .filter((e) => (e.worn > 1 || e.loved) && (!e.lastWorn || e.lastWorn < cutoff))
    .sort((a, b) => b.worn - a.worn || recent(a).localeCompare(recent(b)));
}

