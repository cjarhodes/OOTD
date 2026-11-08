import type { PersonalState } from "./db";
import type { Wear } from "./types";

/**
 * Combine two copies of one wardrobe that both changed (this device and the
 * account), keeping everything from both. Where the same piece, plan, trip or
 * note exists in both, this device's version wins: it's the one in hand.
 */
export function mergeStates(device: PersonalState, account: PersonalState): PersonalState {
  const byId = <T extends { id: string }>(mine: T[] = [], theirs: T[] = []): T[] => {
    const seen = new Set(mine.map((x) => x.id));
    return [...mine, ...theirs.filter((x) => !seen.has(x.id))];
  };
  const wearKey = (w: Wear) => `${w.date}|${[...w.itemIds].sort().join("+")}`;
  const wornHere = new Set(device.wears.map(wearKey));
  const items = byId(device.items, account.items);
  const owned = new Set(items.map((i) => i.id));
  return {
    ...account,
    ...device,
    items,
    wears: [...device.wears, ...account.wears.filter((w) => !wornHere.has(wearKey(w)))].sort((a, b) => a.date.localeCompare(b.date)),
    plans: { ...account.plans, ...device.plans },
    feedback: { ...account.feedback, ...device.feedback },
    comfort: device.comfort,
    trips: byId(device.trips, account.trips),
    // A wish that became a piece on either side is no longer wanted.
    wishlist: byId(device.wishlist, account.wishlist).filter((w) => !owned.has(w.id)),
  };
}
