import type { ColorName } from "./palette";
import { ownedColours } from "./quickadd";
import { starterItem, type StarterCard } from "./starter";
import type { Item } from "./types";

/**
 * The state of a swipe session on /start, as a pure reducer. The page draws
 * the deck and reads the pointer; everything that decides what a swipe does
 * lives here, so it can be tested.
 */
export type Choice = "have" | "skip" | "want";

export interface Decision {
  card: StarterCard;
  choice: Choice;
  /** Pieces added to the wardrobe (one per colour you have). */
  itemIds: string[];
  /** Entries added to the wishlist (a wish takes the id of the piece it describes). */
  wishIds: string[];
}

export interface DeckState {
  deck: StarterCard[];
  index: number;
  /** The colours of each card already in the wardrobe, worked out when the deck was made. */
  owned: Record<string, ColorName[]>;
  /** The colours ticked on each card. */
  picked: Record<string, ColorName[]>;
  /** The colour each card's picture shows. */
  shown: Record<string, ColorName>;
  history: Decision[];
}

export type DeckAction =
  | { type: "toggleColour"; colour: ColorName }
  /** `ownedIds` are the ids of the pieces already in the wardrobe, so none is added twice. */
  | { type: "decide"; choice: Choice; ownedIds: readonly string[] }
  /** Move on to the next card, once the last one has finished leaving. */
  | { type: "advance" }
  | { type: "undo" };

/** What the page should do to the wardrobe and wishlist after an action. */
export interface DeckEffects {
  addPieces: Item[];
  /** Pieces to track on the wishlist instead of the wardrobe. */
  addWishes: Item[];
  removeItemIds: string[];
  removeWishIds: string[];
}

export interface DeckResult {
  state: DeckState;
  effects: DeckEffects;
}

const NONE: DeckEffects = { addPieces: [], addWishes: [], removeItemIds: [], removeWishIds: [] };

/**
 * The cards to show for a wardrobe. A card is left out only when its starter
 * piece is in the wardrobe in every colour the card lists. A piece of the same
 * type that didn't come from the deck (typed or photographed) never hides a card.
 */
export function cardsToShow(all: readonly StarterCard[], items: readonly Pick<Item, "id">[]): StarterCard[] {
  return all.filter((c) => {
    const have = ownedColours(c, items);
    return !c.colors.every((col) => have.includes(col));
  });
}

/** `items` are what the wardrobe holds now: the colours of each card already owned are noted so they can't be added again. */
export function initialDeck(deck: StarterCard[], items: readonly Pick<Item, "id">[] = []): DeckState {
  const owned: Record<string, ColorName[]> = {};
  for (const c of deck) {
    const have = ownedColours(c, items);
    if (have.length) owned[c.id] = have;
  }
  return { deck, index: 0, owned, picked: {}, shown: {}, history: [] };
}

export const currentCard = (s: DeckState): StarterCard | null => s.deck[s.index] ?? null;

export const isDone = (s: DeckState): boolean => s.index >= s.deck.length;

/** The colours of the current card already in the wardrobe. */
export function ownedOnCard(s: DeckState): ColorName[] {
  const card = currentCard(s);
  return card ? (s.owned[card.id] ?? []) : [];
}

/** The colour on show for the current card: the one last tapped, else the first it lists that isn't owned yet. */
export function shownColour(s: DeckState): ColorName | null {
  const card = currentCard(s);
  if (!card) return null;
  const owned = s.owned[card.id] ?? [];
  return s.shown[card.id] ?? card.colors.find((c) => !owned.includes(c)) ?? card.colors[0]!;
}

/** The colours ticked on the current card. */
export function tickedColours(s: DeckState): ColorName[] {
  const card = currentCard(s);
  return card ? (s.picked[card.id] ?? []) : [];
}

/**
 * The colours a choice applies to. With nothing ticked, the colour on show is
 * the one you mean, unless you already own it: then there is nothing to add.
 */
export function chosenColours(s: DeckState): ColorName[] {
  const owned = ownedOnCard(s);
  const ticked = tickedColours(s).filter((c) => !owned.includes(c));
  const shown = shownColour(s);
  return ticked.length ? ticked : shown && !owned.includes(shown) ? [shown] : [];
}

export function countsOf(history: Decision[]): { have: number; want: number } {
  return {
    have: history.reduce((n, d) => n + d.itemIds.length, 0),
    want: history.reduce((n, d) => n + d.wishIds.length, 0),
  };
}

export function deckReducer(state: DeckState, action: DeckAction): DeckResult {
  switch (action.type) {
    case "toggleColour": {
      const card = currentCard(state);
      if (!card) return { state, effects: NONE };
      // Colours already in the wardrobe can't be ticked again.
      if ((state.owned[card.id] ?? []).includes(action.colour)) return { state, effects: NONE };
      const now = state.picked[card.id] ?? [];
      return {
        state: {
          ...state,
          shown: { ...state.shown, [card.id]: action.colour },
          picked: {
            ...state.picked,
            [card.id]: now.includes(action.colour) ? now.filter((x) => x !== action.colour) : [...now, action.colour],
          },
        },
        effects: NONE,
      };
    }
    case "decide": {
      const card = currentCard(state);
      if (!card) return { state, effects: NONE };
      const chosen = chosenColours(state);
      let addPieces: Item[] = [];
      let addWishes: Item[] = [];
      if (action.choice === "have") {
        // One piece per colour you have, skipping any already in the wardrobe.
        addPieces = chosen.map((c) => starterItem(card, c)).filter((p) => !action.ownedIds.includes(p.id));
      } else if (action.choice === "want") {
        // Tracked on the wishlist only: nothing joins the wardrobe.
        addWishes = chosen.map((c) => starterItem(card, c));
      }
      const decision: Decision = {
        card,
        choice: action.choice,
        itemIds: addPieces.map((p) => p.id),
        wishIds: addWishes.map((p) => p.id),
      };
      return {
        state: { ...state, history: [...state.history, decision] },
        effects: { ...NONE, addPieces, addWishes },
      };
    }
    case "advance":
      return { state: { ...state, index: state.index + 1 }, effects: NONE };
    case "undo": {
      const last = state.history[state.history.length - 1];
      if (!last) return { state, effects: NONE };
      return {
        state: { ...state, history: state.history.slice(0, -1), index: Math.max(0, state.index - 1) },
        effects: { ...NONE, removeItemIds: last.itemIds, removeWishIds: last.wishIds },
      };
    }
  }
}
