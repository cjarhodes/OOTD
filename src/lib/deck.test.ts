import { describe, expect, it } from "vitest";
import { makeItem } from "./kinds";
import {
  cardsToShow,
  chosenColours,
  countsOf,
  currentCard,
  deckReducer,
  initialDeck,
  isDone,
  ownedOnCard,
  placeOf,
  shownColour,
  tickedColours,
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
    expect(effects).toEqual({
      addPieces: [],
      addWishes: [],
      removeItemIds: [],
      removeWishIds: [],
      saveChoice: { cardId: "tee", choice: "skip" },
      clearChoiceId: null,
    });
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

describe("owning one colour never hides a card", () => {
  const own = (id: string) => makeItem({ id, name: id, kind: "tee", color: "White" });
  /** Pieces that did not come from the deck: typed or photographed. */
  const blackJeans = makeItem({ id: "photo-1", name: "Black straight jeans", kind: "jeans", color: "Black" });
  const whiteTee = makeItem({ id: "typed-2", name: "White tee", kind: "tee", color: "White" });

  it("hides no card for a typed or photographed piece of the same type (the fault 11 example)", () => {
    expect(cardsToShow(STARTER_DECK, [blackJeans, whiteTee])).toHaveLength(STARTER_DECK.length);
    const s = initialDeck(STARTER_DECK, [blackJeans, whiteTee]);
    expect(s.owned).toEqual({});
  });

  it("hides a card only when its starter piece is owned in every colour it lists", () => {
    const some = tee.colors.slice(0, -1).map((c) => own(`st-tee-${c.toLowerCase()}`));
    expect(cardsToShow(STARTER_DECK, some).some((c) => c.id === "tee")).toBe(true);
    const all = tee.colors.map((c) => own(`st-tee-${c.toLowerCase()}`));
    expect(cardsToShow(STARTER_DECK, all).some((c) => c.id === "tee")).toBe(false);
  });

  it("notes the owned colours, shows the first one not owned and adds nothing twice", () => {
    const first = tee.colors[0]!;
    const s = initialDeck([tee, jeans], [own(`st-tee-${first.toLowerCase()}`)]);
    expect(ownedOnCard(s)).toEqual([first]);
    expect(shownColour(s)).toBe(tee.colors[1]);
    expect(chosenColours(s)).toEqual([tee.colors[1]]);
    // An owned colour can't be ticked.
    const same = deckReducer(s, { type: "toggleColour", colour: first }).state;
    expect(tickedColours(same)).toEqual([]);
    const { effects } = deckReducer(s, { type: "decide", choice: "have", ownedIds: [] });
    expect(effects.addPieces.map((p) => p.color)).toEqual([tee.colors[1]]);
  });

  it("has nothing to add when the colour on show is owned and nothing else is ticked", () => {
    const owned = tee.colors.slice(0, -1).map((c) => own(`st-tee-${c.toLowerCase()}`));
    const s = initialDeck([tee], owned);
    expect(chosenColours(s)).toEqual([tee.colors[tee.colors.length - 1]]);
    const all = initialDeck([tee], tee.colors.map((c) => own(`st-tee-${c.toLowerCase()}`)));
    expect(chosenColours(all)).toEqual([]);
    const { effects, state } = deckReducer(all, { type: "decide", choice: "have", ownedIds: [] });
    expect(effects.addPieces).toEqual([]);
    expect(state.history).toHaveLength(1);
  });
});

describe("remembered choices", () => {
  it("asks the page to remember a choice and to forget it on undo", () => {
    const decided = deckReducer(initialDeck([tee, jeans]), { type: "decide", choice: "want", ownedIds: [] });
    expect(decided.effects.saveChoice).toEqual({ cardId: "tee", choice: "want" });
    expect(deckReducer(decided.state, { type: "undo" }).effects.clearChoiceId).toBe("tee");
  });

  it("leaves out cards that have a stored choice", () => {
    const left = cardsToShow(STARTER_DECK, [], { tee: "skip", jeans: "have" });
    expect(left).toHaveLength(STARTER_DECK.length - 2);
    expect(left.some((c) => c.id === "tee" || c.id === "jeans")).toBe(false);
  });

  it("counts every card in the starter deck in the place shown", () => {
    const left = STARTER_DECK.slice(20);
    const s = initialDeck(left);
    expect(placeOf(s, STARTER_DECK.length)).toEqual({ at: 21, total: STARTER_DECK.length });
    const later = run(s, { type: "decide", choice: "skip", ownedIds: [] }, { type: "advance" });
    expect(placeOf(later, STARTER_DECK.length).at).toBe(22);
    expect(placeOf(initialDeck([]), 44)).toEqual({ at: 44, total: 44 });
  });
});

describe("undo from the finish screen", () => {
  it("brings the last card back and names the piece to undo", () => {
    let s = initialDeck([tee]);
    s = run(s, { type: "decide", choice: "have", ownedIds: [] }, { type: "advance" });
    expect(isDone(s)).toBe(true);
    expect(s.history[s.history.length - 1]!.name).toBe("White heavyweight tee");
    s = run(s, { type: "undo" });
    expect(isDone(s)).toBe(false);
    expect(currentCard(s)).toBe(tee);
    expect(s.history).toEqual([]);
  });

  it("names a skipped card by the colour on show", () => {
    const { state } = deckReducer(initialDeck([tee]), { type: "toggleColour", colour: tee.colors[1]! });
    const decided = deckReducer(state, { type: "decide", choice: "skip", ownedIds: [] }).state;
    expect(decided.history[0]!.name).toBe("Black heavyweight tee");
  });
});
