import { KINDS } from "./kinds";
import type { ColorName } from "./palette";
import { STARTER_DECK, starterItem, type StarterCard } from "./starter";
import type { Item, Slot } from "./types";

/** The colours ticked on each card, by card id, in the order they were ticked. */
export type Picked = Record<string, ColorName[]>;

export interface SetupSection {
  slot: Slot;
  heading: string;
  cards: StarterCard[];
}

const SECTION_HEADINGS: [Slot, string][] = [
  ["base", "Shirts and tops"],
  ["mid", "Knitwear and layers"],
  ["outer", "Jackets and coats"],
  ["bottom", "Trousers and shorts"],
  ["shoes", "Shoes"],
];

/** The whole starter deck, grouped for the one-page view. Deck order holds within a section. */
export const SETUP_SECTIONS: SetupSection[] = SECTION_HEADINGS.map(([slot, heading]) => ({
  slot,
  heading,
  cards: STARTER_DECK.filter((c) => KINDS[c.kind].slot === slot),
}));

/** The colours of this card already in the wardrobe as swiped pieces. */
export function ownedColours(card: StarterCard, items: Item[]): ColorName[] {
  const owned: ColorName[] = [];
  for (const i of items) {
    // Match the whole id, so "denim" never claims a piece of "denim-shirt".
    if (i.id === `st-${card.id}-${i.color.toLowerCase()}` && !owned.includes(i.color as ColorName)) owned.push(i.color as ColorName);
  }
  return owned;
}

/** The new pieces the ticks add: one per card and colour, skipping any already in the wardrobe and any repeat. */
export function piecesFor(picked: Picked, items: Item[]): Item[] {
  const seen = new Set(items.map((i) => i.id));
  const pieces: Item[] = [];
  for (const card of STARTER_DECK) {
    for (const colour of picked[card.id] ?? []) {
      const piece = starterItem(card, colour);
      if (seen.has(piece.id)) continue;
      seen.add(piece.id);
      pieces.push(piece);
    }
  }
  return pieces;
}

/** How many pieces the ticks would add. The page and its button both use this. */
export function countPicked(picked: Picked, items: Item[]): number {
  return piecesFor(picked, items).length;
}
