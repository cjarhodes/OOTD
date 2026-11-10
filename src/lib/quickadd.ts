import { KINDS } from "./kinds";
import { COLOR_NAMES, type ColorName } from "./palette";
import { starterItem, type StarterCard } from "./starter";
import { parsePiece, type TypedPiece } from "./typed";
import type { Item, Kind, Slot } from "./types";

/**
 * The pure parts of Quick add: the starter deck grouped for a grid, filtered
 * by what's typed, which colours a wardrobe already has for a card, and the
 * words the sheet uses. Kept apart from the component so they can be tested.
 */

export const SLOT_ORDER: Slot[] = ["base", "mid", "outer", "bottom", "shoes"];

export interface CardGroup {
  slot: Slot;
  cards: StarterCard[];
}

/** The deck by slot (base to shoes), in deck order within each slot. Slots with no card are left out. */
export function groupDeck(deck: readonly StarterCard[]): CardGroup[] {
  return SLOT_ORDER.map((slot) => ({ slot, cards: deck.filter((c) => KINDS[c.kind].slot === slot) })).filter((g) => g.cards.length > 0);
}

/** Cards whose name or type contains every word typed, in deck order. An empty search keeps them all. */
export function filterCards(deck: readonly StarterCard[], query: string): StarterCard[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [...deck];
  return deck.filter((c) => {
    const hay = `${c.name} ${KINDS[c.kind].label}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}

/** What the person typed, read as a piece Quick add could add by itself, or null when it has no type or is something OOTD doesn't plan. */
export interface Offer {
  piece: TypedPiece & { kind: Kind };
  /** The button's words: Add “Sambas” as sneakers. */
  label: string;
}

export function offerFor(query: string): Offer | null {
  const text = query.trim();
  if (!text) return null;
  const piece = parsePiece(text);
  if (!piece || !piece.kind || piece.unsupported) return null;
  const typed = { ...piece, kind: piece.kind };
  return { piece: typed, label: `Add “${piece.name}” as ${KINDS[piece.kind].label}` };
}

/** The colours this wardrobe already has for a card: its starter piece (same id as the swipe deck gives it) in each colour. */
export function ownedColours(card: StarterCard, items: readonly Pick<Item, "id">[]): ColorName[] {
  const ids = new Set(items.map((i) => i.id));
  return COLOR_NAMES.filter((c) => ids.has(starterItem(card, c).id));
}

/** The first of the card's own colours that isn't owned: ticked to begin with, so a common piece needs no colour tap. */
export function defaultPick(card: StarterCard, owned: readonly ColorName[]): ColorName[] {
  const first = card.colors.find((c) => !owned.includes(c));
  return first ? [first] : [];
}

/** The swatches to show: the card's colours, then any other colour already owned or picked. */
export function colourOptions(card: StarterCard, owned: readonly ColorName[], picked: readonly ColorName[]): ColorName[] {
  const extra = [...owned, ...picked].filter((c, i, all) => !card.colors.includes(c) && all.indexOf(c) === i);
  return [...card.colors, ...extra];
}

/** Add or take away one colour from the pick. Colours already owned can't be picked. */
export function togglePick(picked: readonly ColorName[], colour: ColorName, owned: readonly ColorName[]): ColorName[] {
  if (owned.includes(colour)) return [...picked];
  return picked.includes(colour) ? picked.filter((c) => c !== colour) : [...picked, colour];
}

/** "Add 1 piece", "Add 3 pieces", and "Add pieces" while nothing is picked. */
export function addLabel(count: number): string {
  if (count <= 0) return "Add pieces";
  return `Add ${count} ${count === 1 ? "piece" : "pieces"}`;
}

/** "Added: white heavyweight tee" or "Added: white tee and black tee". */
export function addedNote(names: readonly string[]): string {
  const lower = names.map((n) => n.toLowerCase());
  const list = lower.length > 1 ? `${lower.slice(0, -1).join(", ")} and ${lower[lower.length - 1]}` : (lower[0] ?? "");
  return `Added: ${list}`;
}
