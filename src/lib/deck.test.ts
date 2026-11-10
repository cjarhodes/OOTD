import { describe, expect, it } from "vitest";
import {
  chosenColours,
  countsOf,
  currentCard,
  deckReducer,
  initialDeck,
  isDone,
  type DeckAction,
  type DeckState,
} from "./deck";
import { STARTER_DECK, type StarterCard } from "./starter";

const tee = STARTER_DECK.find((c) => c.id === "tee")!;
const jeans = STARTER_DECK.find((c) => c.colors.length > 1 && c.id !== "tee")!;

/** Apply actions in order, as the page does (advancing after each decision). */
function run(state: DeckState, ...actions: DeckAction[]): DeckState {
  return actions.reduce((s, a) => deckReducer(s, a).state, state);
}

describe("deck reducer", () => {
  const start = () => initialDeck([tee, jeans]);

  it("adds the colour shown when 'have' is chosen with nothing ticked", () => {
    const { state, effects } = deckReducer(start(), { type: "decide", choice: "have", ownedIds: [] });
    expect(effects.addPieces.map((p) => p.id)).toEqual([`st-tee-${tee.colors[0]!.toLowerCase()}`]);
    expect(effects.addWishes).toEqual([]);
    expect(state.history).toHaveLength(1);
  });

  it("follows the colour tapped last when nothing is ticked off again", () => {
    const s = run(start(), { type: "toggleColour", colour: tee.colors[1]! }, { type: "toggleColour", colour: tee.colors[1]! });
    // Ticked then unticked: the picture still shows the last colour tapped.
    expect(chosenColours(s)).toEqual([tee.colors[1]]);
  });

  it("adds one piece per ticked colour", () => {
    const [a, b, c] = tee.colors;
    const s = run(start(), { type: "toggleColour", colour: a! }, { type: "toggleColour", colour: b! }, { type: "toggleColour", colour: c! });
    const { effects } = deckReducer(s, { type: "decide", choice: "have", ownedIds: [] });
    expect(effects.addPieces).toHaveLength(3);
    expect(effects.addPieces.map((p) => p.color)).toEqual([a, b, c]);
  });

  it("skips pieces already in the wardrobe", () => {
    const first = `st-tee-${tee.colors[0]!.toLowerCase()}`;
    const { effects, state } = deckReducer(start(), { type: "decide", choice: "have", ownedIds: [first] });
    expect(effects.addPieces).toEqual([]);
    expect(state.history[0]!.itemIds).toEqual([]);
  });

  it("puts 'want' on the wishlist and adds no pieces", () => {
    const [a, b] = tee.colors;
    const s = run(start(), { type: "toggleColour", colour: a! }, { type: "toggleColour", colour: b! });
    const { effects, state } = deckReducer(s, { type: "decide", choice: "want", ownedIds: [] });
    expect(effects.addPieces).toEqual([]);
    expect(effects.addWishes.map((p) => p.color)).toEqual([a, b]);
    expect(state.history[0]!.wishIds).toHaveLength(2);
  });

  it("adds nothing when a card is skipped", () => {
    const { effects, state } = deckReducer(start(), { type: "decide", choice: "skip", ownedIds: [] });
    expect(effects).toEqual({ addPieces: [], addWishes: [], removeItemIds: [], removeWishIds: [] });
    expect(state.history).toEqual([expect.objectContaining({ choice: "skip", itemIds: [], wishIds: [] })]);
  });

  it("undoes a 'have' by removing its pieces", () => {
    const decided = deckReducer(start(), { type: "decide", choice: "have", ownedIds: [] });
    const moved = deckReducer(decided.state, { type: "advance" }).state;
    const { state, effects } = deckReducer(moved, { type: "undo" });
    expect(effects.removeItemIds).toEqual(decided.effects.addPieces.map((p) => p.id));
    expect(effects.removeWishIds).toEqual([]);
    expect(state.history).toEqual([]);
    expect(state.index).toBe(0);
  });

  it("undoes a 'want' by removing its wishes", () => {
    const decided = deckReducer(start(), { type: "decide", choice: "want", ownedIds: [] });
    const { effects } = deckReducer(decided.state, { type: "undo" });
    expect(effects.removeWishIds).toEqual(decided.effects.addWishes.map((p) => p.id));
    expect(effects.removeItemIds).toEqual([]);
  });

  it("undoes a skip without touching the wardrobe", () => {
    const decided = deckReducer(start(), { type: "decide", choice: "skip", ownedIds: [] });
    const { state, effects } = deckReducer(decided.state, { type: "undo" });
    expect(effects.removeItemIds).toEqual([]);
    expect(effects.removeWishIds).toEqual([]);
    expect(state.history).toEqual([]);
  });

  it("does nothing when undoing at the start", () => {
    const s = start();
    const { state, effects } = deckReducer(s, { type: "undo" });
    expect(state).toBe(s);
    expect(effects.removeItemIds).toEqual([]);
    expect(state.index).toBe(0);
  });

  it("ends the deck after the last card", () => {
    let s = start();
    expect(isDone(s)).toBe(false);
    for (const choice of ["have", "skip"] as const) {
      s = run(s, { type: "decide", choice, ownedIds: [] }, { type: "advance" });
    }
    expect(isDone(s)).toBe(true);
    expect(currentCard(s)).toBeNull();
    // Nothing more to decide on a finished deck.
    const after = deckReducer(s, { type: "decide", choice: "have", ownedIds: [] });
    expect(after.state).toBe(s);
    expect(after.effects.addPieces).toEqual([]);
  });

  it("counts what was added and wished for", () => {
    const [a, b] = tee.colors;
    let s = run(start(), { type: "toggleColour", colour: a! }, { type: "toggleColour", colour: b! });
    s = run(s, { type: "decide", choice: "have", ownedIds: [] }, { type: "advance" }, { type: "decide", choice: "want", ownedIds: [] });
    expect(countsOf(s.history)).toEqual({ have: 2, want: 1 });
  });

  it("starts each card on its own first colour", () => {
    const card: StarterCard = jeans;
    expect(chosenColours(run(start(), { type: "advance" }))).toEqual([card.colors[0]]);
  });
});
