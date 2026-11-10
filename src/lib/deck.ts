import { KINDS, SLOT_LABEL } from "./kinds";
import type { ColorName } from "./palette";
import { ownedColours } from "./quickadd";
import { ROUND_NAME, STARTER_DECK, starterItem, type Round, type StarterCard } from "./starter";
import type { Item, Slot } from "./types";

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
  /** The pieces themselves, for showing what was added. */
  pieces: Item[];
  /** Entries added to the wishlist (a wish takes the id of the piece it describes). */
  wishIds: string[];
  /** The pieces those wishes describe. */
  wishes: Item[];
  /** The name of the piece the card showed, for "Undo: <name>". */
  name: string;
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
  /** Set when only one part of the wardrobe is being swiped (`/start?slot=shoes`): rounds are ignored. */
  slot: Slot | null;
  /** Where the person chose to keep going past the end of a round, so that screen isn't shown again there. */
  resumeAt: number | null;
}

export type DeckAction =
  | { type: "toggleColour"; colour: ColorName }
  /** `ownedIds` are the ids of the pieces already in the wardrobe, so none is added twice. */
  | { type: "decide"; choice: Choice; ownedIds: readonly string[] }
  | { type: "undo" }
  /** Carry on past the end of a round. */
  | { type: "continue" }
  /** Fix a piece just added: swap it for the same card in another colour. */
  | { type: "recolour"; cardId: string; from: ColorName; to: ColorName; ownedIds: readonly string[] }
  /** Take back one piece just added, leaving the rest of its card's choice as it was. */
  | { type: "removePiece"; cardId: string; id: string }
  /** Take back one wish just added. */
  | { type: "removeWish"; cardId: string; id: string };

/** What the page should do to the wardrobe and wishlist after an action. */
export interface DeckEffects {
  addPieces: Item[];
  /** Pieces to track on the wishlist instead of the wardrobe. */
  addWishes: Item[];
  removeItemIds: string[];
  removeWishIds: string[];
  /** The choice to remember on this device for a card, if one was just made. */
  saveChoice: { cardId: string; choice: Choice } | null;
  /** The card whose remembered choice an undo takes back. */
  clearChoiceId: string | null;
}

export interface DeckResult {
  state: DeckState;
  effects: DeckEffects;
}

const NONE: DeckEffects = { addPieces: [], addWishes: [], removeItemIds: [], removeWishIds: [], saveChoice: null, clearChoiceId: null };

/**
 * The cards to show for a wardrobe, round by round and in deck order within a
 * round. A card is left out only when its starter piece is in the wardrobe in
 * every colour the card lists, or when a choice for it was remembered. A piece
 * of the same type that didn't come from the deck (typed or photographed)
 * never hides a card. So the first card is always in the first round that
 * still has cards to decide.
 */
export function cardsToShow(
  all: readonly StarterCard[],
  items: readonly Pick<Item, "id">[],
  choices: Readonly<Record<string, Choice>> = {},
  /** Only this part of the wardrobe, in deck order and ignoring rounds. */
  slot: Slot | null = null,
): StarterCard[] {
  const left = all
    .filter((c) => {
      if (slot && KINDS[c.kind].slot !== slot) return false;
      if (choices[c.id]) return false;
      const have = ownedColours(c, items);
      return !c.colors.every((col) => have.includes(col));
    })
  // Round by round (a stable sort keeps deck order inside a round); one part of the wardrobe stays in deck order.
  return slot ? left : left.sort((a, b) => a.round - b.round);
}

/**
 * Changing the colour of a starter piece. A starter piece's id holds its
 * colour (`st-<card>-<colour>`), so the piece can't just be edited: the old
 * one goes and the card's piece in the new colour comes in, unless the
 * wardrobe already has that colour, when the old one just goes.
 */
export function recolourPlan(
  card: StarterCard,
  from: ColorName,
  to: ColorName,
  ownedIds: readonly string[],
): { remove: string[]; add: Item[] } {
  if (from === to) return { remove: [], add: [] };
  const next = starterItem(card, to);
  return { remove: [starterItem(card, from).id], add: ownedIds.includes(next.id) ? [] : [next] };
}

/** A piece or wish added during this visit, and the card it came from. */
export interface Added {
  piece: Item;
  cardId: string;
}

/** The pieces added this visit, in the order they were added; with a round, only that round's. */
export function addedPieces(history: readonly Decision[], round?: Round): Added[] {
  return history.filter((d) => round === undefined || d.card.round === round).flatMap((d) => d.pieces.map((piece) => ({ piece, cardId: d.card.id })));
}

/** The wishes added this visit. */
export function addedWishes(history: readonly Decision[]): Added[] {
  return history.flatMap((d) => d.wishes.map((piece) => ({ piece, cardId: d.card.id })));
}

/** `items` are what the wardrobe holds now: the colours of each card already owned are noted so they can't be added again. */
export function initialDeck(deck: StarterCard[], items: readonly Pick<Item, "id">[] = [], slot: Slot | null = null): DeckState {
  const owned: Record<string, ColorName[]> = {};
  for (const c of deck) {
    const have = ownedColours(c, items);
    if (have.length) owned[c.id] = have;
  }
  return { deck, index: 0, owned, picked: {}, shown: {}, history: [], slot, resumeAt: null };
}

export const currentCard = (s: DeckState): StarterCard | null => s.deck[s.index] ?? null;

export const isDone = (s: DeckState): boolean => s.index >= s.deck.length;

/** "21 of 44": where the current card sits among every card in the starter deck, however many were set aside. */
export function placeOf(s: DeckState, total: number): { at: number; total: number } {
  return { at: Math.min(Math.max(total - s.deck.length, 0) + s.index + 1, total), total };
}

/** The link under Wardrobe's grid. It uses the filter chips' own words (`SLOT_LABEL`): "Swipe more in Outer (6)". */
export function swipeMoreLabel(slot: Slot, left: number): string {
  return `Swipe more in ${SLOT_LABEL[slot]} (${left})`;
}

/** The part of the wardrobe a `?slot=` value names, or null for anything else. */
export function slotFromParam(value: string | null | undefined): Slot | null {
  return value && Object.hasOwn(SLOT_LABEL, value) ? (value as Slot) : null;
}

/** How many cards are left to swipe for one part of the wardrobe. */
export function slotCardsLeft(
  slot: Slot,
  items: readonly Pick<Item, "id">[],
  choices: Readonly<Record<string, Choice>> = {},
  all: readonly StarterCard[] = STARTER_DECK,
): number {
  return cardsToShow(all, items, choices, slot).length;
}

/**
 * Where the current card sits in its round: "The basics · 4 of 12". Cards set aside or already decided count as
 * passed. When one part of the wardrobe is being swiped it is counted within that part instead: "Shoes · 3 of 10". The part is named as the Wardrobe filter chips name it.
 */
export function roundPlace(s: DeckState, all: readonly StarterCard[] = STARTER_DECK): { round: Round; name: string; at: number; total: number } | null {
  const card = currentCard(s);
  if (!card) return null;
  const same = (c: StarterCard) => (s.slot ? KINDS[c.kind].slot === s.slot : c.round === card.round);
  const total = all.filter(same).length;
  const left = s.deck.slice(s.index).filter(same).length;
  const name = s.slot ? SLOT_LABEL[s.slot] : ROUND_NAME[card.round];
  return { round: card.round, name, at: Math.min(Math.max(total - left, 0) + 1, total), total };
}

/** True when the last card decided was the end of a round and the next card is in a later one, until the person carries on. */
export function atRoundEnd(s: DeckState): boolean {
  const last = s.history[s.history.length - 1];
  const next = currentCard(s);
  if (s.slot || !last || !next) return false;
  return last.card.round !== next.round && s.resumeAt !== s.index;
}

export interface RoundEnd {
  round: Round;
  name: string;
  /** The pieces added in that round during this visit. */
  pieces: Added[];
  /** Wishes added in that round during this visit. */
  wishes: Added[];
  /** The round that comes next and how many of its cards are left. */
  next: { round: Round; name: string; left: number };
}

/** What the end-of-round screen shows, or null when the deck isn't at the end of a round. */
export function roundEnd(s: DeckState): RoundEnd | null {
  if (!atRoundEnd(s)) return null;
  const last = s.history[s.history.length - 1]!;
  const next = currentCard(s)!;
  const done = s.history.filter((d) => d.card.round === last.card.round);
  return {
    round: last.card.round,
    name: ROUND_NAME[last.card.round],
    pieces: addedPieces(done),
    wishes: addedWishes(done),
    next: { round: next.round, name: ROUND_NAME[next.round], left: s.deck.slice(s.index).filter((c) => c.round === next.round).length },
  };
}

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

/**
 * The swatches to draw on a card: at most `max`, the rest folded into "+ Other colour" so the card
 * fits a small phone. A colour already owned or ticked is always drawn, so a tick is never hidden.
 */
export function visibleColours(
  options: readonly ColorName[],
  owned: readonly ColorName[],
  ticked: readonly ColorName[],
  max = 4,
): ColorName[] {
  const must = (c: ColorName) => owned.includes(c) || ticked.includes(c);
  let room = Math.max(0, max - options.filter(must).length);
  return options.filter((c) => must(c) || room-- > 0);
}

export function countsOf(history: Decision[]): { have: number; want: number } {
  return {
    have: history.reduce((n, d) => n + d.itemIds.length, 0),
    want: history.reduce((n, d) => n + d.wishIds.length, 0),
  };
}

const withDecision = (s: DeckState, at: number, d: Decision): DeckState => ({ ...s, history: s.history.map((x, i) => (i === at ? d : x)) });

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
        pieces: addPieces,
        wishIds: addWishes.map((p) => p.id),
        wishes: addWishes,
        name: starterItem(card, chosen[0] ?? card.colors[0]!).name,
      };
      // The next card is live at once: the page only animates the old one away.
      return {
        state: { ...state, index: state.index + 1, history: [...state.history, decision], resumeAt: null },
        effects: { ...NONE, addPieces, addWishes, saveChoice: { cardId: card.id, choice: action.choice } },
      };
    }
    case "undo": {
      const last = state.history[state.history.length - 1];
      if (!last) return { state, effects: NONE };
      return {
        state: { ...state, history: state.history.slice(0, -1), index: Math.max(0, state.index - 1), resumeAt: null },
        effects: { ...NONE, removeItemIds: last.itemIds, removeWishIds: last.wishIds, clearChoiceId: last.card.id },
      };
    }
    case "continue":
      return { state: { ...state, resumeAt: state.index }, effects: NONE };
    case "recolour": {
      const at = state.history.findIndex((d) => d.card.id === action.cardId);
      const d = state.history[at];
      if (!d || !d.pieces.some((p) => p.id === starterItem(d.card, action.from).id)) return { state, effects: NONE };
      // The decision's own pieces are in the wardrobe already, so a colour it holds can't be added twice.
      const plan = recolourPlan(d.card, action.from, action.to, [...action.ownedIds, ...d.pieces.map((p) => p.id)]);
      if (!plan.remove.length) return { state, effects: NONE };
      const pieces = d.pieces.flatMap((p) => (plan.remove.includes(p.id) ? plan.add : [p]));
      return {
        state: withDecision(state, at, { ...d, pieces, itemIds: pieces.map((p) => p.id), name: pieces[0]?.name ?? d.name }),
        effects: { ...NONE, removeItemIds: plan.remove, addPieces: plan.add },
      };
    }
    case "removePiece": {
      const at = state.history.findIndex((d) => d.card.id === action.cardId);
      const d = state.history[at];
      if (!d || !d.itemIds.includes(action.id)) return { state, effects: NONE };
      const pieces = d.pieces.filter((p) => p.id !== action.id);
      return {
        state: withDecision(state, at, { ...d, pieces, itemIds: pieces.map((p) => p.id) }),
        effects: { ...NONE, removeItemIds: [action.id] },
      };
    }
    case "removeWish": {
      const at = state.history.findIndex((d) => d.card.id === action.cardId);
      const d = state.history[at];
      if (!d || !d.wishIds.includes(action.id)) return { state, effects: NONE };
      const wishes = d.wishes.filter((p) => p.id !== action.id);
      return {
        state: withDecision(state, at, { ...d, wishes, wishIds: wishes.map((p) => p.id) }),
        effects: { ...NONE, removeWishIds: [action.id] },
      };
    }
  }
}
