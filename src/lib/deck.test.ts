import { describe, expect, it } from "vitest";
import { makeItem } from "./kinds";
import {
  atRoundEnd,
  cardsToShow,
  chosenColours,
  countsOf,
  currentCard,
  deckReducer,
  initialDeck,
  isDone,
  ownedOnCard,
  placeOf,
  roundEnd,
  roundPlace,
  shownColour,
  tickedColours,
  visibleColours,
  type DeckAction,
  type DeckState,
} from "./deck";
import { KINDS } from "./kinds";
import { missingEssentials } from "./essentials";
import { ROUNDS, ROUND_NAME, STARTER_DECK, type StarterCard } from "./starter";

const tee = STARTER_DECK.find((c) => c.id === "tee")!;
const jeans = STARTER_DECK.find((c) => c.colors.length > 1 && c.id !== "tee")!;

/** Apply actions in order, as the page does. */
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
    expect(decided.state.index).toBe(1);
    const { state, effects } = deckReducer(decided.state, { type: "undo" });
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
      s = run(s, { type: "decide", choice, ownedIds: [] });
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
    s = run(s, { type: "decide", choice: "have", ownedIds: [] }, { type: "decide", choice: "want", ownedIds: [] });
    expect(countsOf(s.history)).toEqual({ have: 2, want: 1 });
  });

  it("starts each card on its own first colour", () => {
    const card: StarterCard = jeans;
    expect(chosenColours(run(start(), { type: "decide", choice: "skip", ownedIds: [] }))).toEqual([card.colors[0]]);
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
    const later = run(s, { type: "decide", choice: "skip", ownedIds: [] });
    expect(placeOf(later, STARTER_DECK.length).at).toBe(22);
    expect(placeOf(initialDeck([]), 44)).toEqual({ at: 44, total: 44 });
  });
});

describe("undo from the finish screen", () => {
  it("brings the last card back and names the piece to undo", () => {
    let s = initialDeck([tee]);
    s = run(s, { type: "decide", choice: "have", ownedIds: [] });
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

describe("fast tapping", () => {
  it("applies ten decisions in a row, one history entry each, with no step in between", () => {
    const many = STARTER_DECK.slice(0, 12);
    let s = initialDeck(many);
    const choices = ["have", "skip", "want", "have", "have", "skip", "want", "skip", "have", "want"] as const;
    for (const choice of choices) s = deckReducer(s, { type: "decide", choice, ownedIds: [] }).state;
    expect(s.history).toHaveLength(10);
    expect(s.history.map((d) => d.card.id)).toEqual(many.slice(0, 10).map((c) => c.id));
    expect(s.index).toBe(10);
    expect(currentCard(s)).toBe(many[10]);
  });

  it("decides the next card at once, so a second tap is never for the card that is leaving", () => {
    const first = deckReducer(initialDeck([tee, jeans]), { type: "decide", choice: "have", ownedIds: [] });
    expect(currentCard(first.state)).toBe(jeans);
    const second = deckReducer(first.state, { type: "decide", choice: "want", ownedIds: [] });
    expect(second.state.history.map((d) => [d.card.id, d.choice])).toEqual([
      ["tee", "have"],
      [jeans.id, "want"],
    ]);
  });
});

describe("colours drawn on a small card", () => {
  const five = ["Navy", "Brown", "Forest", "Red", "Black"] as const;

  it("draws at most four and folds the rest into Other colour", () => {
    expect(visibleColours(five, [], [])).toEqual(["Navy", "Brown", "Forest", "Red"]);
    expect(visibleColours(five.slice(0, 4), [], [])).toEqual(["Navy", "Brown", "Forest", "Red"]);
    expect(visibleColours(["White", "Black"], [], [])).toEqual(["White", "Black"]);
  });

  it("always draws a colour that is ticked or owned, keeping the card's order", () => {
    expect(visibleColours(five, [], ["Black"])).toEqual(["Navy", "Brown", "Forest", "Black"]);
    expect(visibleColours(five, ["Black"], [])).toEqual(["Navy", "Brown", "Forest", "Black"]);
    expect(visibleColours(five, ["Red"], ["Black"])).toEqual(["Navy", "Brown", "Red", "Black"]);
  });

  it("draws every picked colour even when that is more than four", () => {
    const all = visibleColours(five, ["Navy", "Brown", "Forest"], ["Red", "Black"]);
    expect(all).toEqual([...five]);
  });

  it("keeps an extra colour owned from elsewhere", () => {
    expect(visibleColours([...five, "Grey"], ["Grey"], [])).toEqual(["Navy", "Brown", "Forest", "Grey"]);
  });
});

describe("rounds", () => {
  const round = (n: number) => STARTER_DECK.filter((c) => c.round === n);
  const have = { type: "decide", choice: "have", ownedIds: [] } as const;

  it("gives every card a round, and the rounds hold the whole deck", () => {
    expect(STARTER_DECK.every((c) => ROUNDS.includes(c.round))).toBe(true);
    expect(ROUNDS.reduce((n, r) => n + round(r).length, 0)).toBe(STARTER_DECK.length);
    expect(ROUNDS.map((r) => ROUND_NAME[r])).toEqual(["The basics", "Layers and jackets", "Shoes", "What’s current"]);
  });

  it("makes round 1 twelve essential cards covering every slot", () => {
    const basics = round(1);
    expect(basics).toHaveLength(12);
    expect(basics.every((c) => c.tag === "Essential")).toBe(true);
    const slots = basics.map((c) => KINDS[c.kind].slot);
    for (const slot of ["base", "mid", "outer", "bottom", "shoes"] as const) expect(slots).toContain(slot);
    const count = (slot: string) => slots.filter((x) => x === slot).length;
    expect(count("base")).toBeGreaterThanOrEqual(3);
    expect(count("bottom")).toBeGreaterThanOrEqual(2);
    expect(count("shoes")).toBeGreaterThanOrEqual(2);
    expect(count("mid")).toBeGreaterThanOrEqual(2);
    expect(count("outer")).toBeGreaterThanOrEqual(2);
    for (const id of ["tee", "jeans", "sneakers", "oxford", "crew", "hoodie", "chinos"]) expect(basics.map((c) => c.id)).toContain(id);
  });

  it("keeps layers and jackets in round 2 and shoes in round 3", () => {
    expect(round(2).every((c) => ["mid", "outer"].includes(KINDS[c.kind].slot))).toBe(true);
    expect(round(3).every((c) => KINDS[c.kind].slot === "shoes")).toBe(true);
  });

  it("shows cards round by round, in deck order inside a round", () => {
    const shown = cardsToShow(STARTER_DECK, []);
    expect(shown).toHaveLength(STARTER_DECK.length);
    expect(shown.map((c) => c.round)).toEqual([...shown.map((c) => c.round)].sort((a, b) => a - b));
    for (const r of ROUNDS) expect(shown.filter((c) => c.round === r).map((c) => c.id)).toEqual(round(r).map((c) => c.id));
  });

  it("offers a look within twelve cards for a new account", () => {
    let s = initialDeck(cardsToShow(STARTER_DECK, []));
    const pieces: ReturnType<typeof makeItem>[] = [];
    let cards = 0;
    while (missingEssentials(pieces).length > 0 && !atRoundEnd(s) && cards < 12) {
      const r = deckReducer(s, have);
      pieces.push(...r.effects.addPieces);
      s = r.state;
      cards += 1;
    }
    expect(missingEssentials(pieces)).toEqual([]);
    expect(cards).toBeLessThanOrEqual(12);
    expect(cards).toBe(3); // tee, jeans and sneakers are the first three cards
  });

  it("counts within the round: 'The basics · 4 of 12'", () => {
    let s = initialDeck(cardsToShow(STARTER_DECK, []));
    expect(roundPlace(s)).toEqual({ round: 1, name: "The basics", at: 1, total: 12 });
    s = run(s, have, have, have);
    expect(roundPlace(s)).toEqual({ round: 1, name: "The basics", at: 4, total: 12 });
    expect(roundPlace(initialDeck([]))).toBeNull();
  });

  it("resumes in the first round that still has undecided cards", () => {
    const some = Object.fromEntries(round(1).slice(0, 8).map((c) => [c.id, "have" as const]));
    const back = initialDeck(cardsToShow(STARTER_DECK, [], some));
    expect(roundPlace(back)).toEqual({ round: 1, name: "The basics", at: 9, total: 12 });
    const all = Object.fromEntries(round(1).map((c) => [c.id, "skip" as const]));
    const next = initialDeck(cardsToShow(STARTER_DECK, [], all));
    expect(roundPlace(next)).toEqual({ round: 2, name: "Layers and jackets", at: 1, total: 11 });
    // Landing there is not a round end: nothing has been decided this visit.
    expect(atRoundEnd(next)).toBe(false);
  });

  it("stops at the end of a round with what was added, and carries on when asked", () => {
    let s = initialDeck(cardsToShow(STARTER_DECK, []));
    for (let i = 0; i < 11; i++) s = run(s, have);
    expect(atRoundEnd(s)).toBe(false);
    s = run(s, { type: "decide", choice: "skip", ownedIds: [] });
    expect(atRoundEnd(s)).toBe(true);
    const end = roundEnd(s)!;
    expect(end.name).toBe("The basics");
    expect(end.pieces).toHaveLength(11);
    expect(end.next).toEqual({ round: 2, name: "Layers and jackets", left: 11 });
    s = run(s, { type: "continue" });
    expect(atRoundEnd(s)).toBe(false);
    expect(roundEnd(s)).toBeNull();
    expect(roundPlace(s)!.name).toBe("Layers and jackets");
  });

  it("brings the end-of-round screen back after an undo and a new choice", () => {
    let s = initialDeck(cardsToShow(STARTER_DECK, []));
    for (let i = 0; i < 12; i++) s = run(s, have);
    s = run(s, { type: "continue" });
    s = run(s, { type: "undo" });
    expect(atRoundEnd(s)).toBe(false);
    expect(roundPlace(s)!.round).toBe(1);
    s = run(s, have);
    expect(atRoundEnd(s)).toBe(true);
  });

  it("has no round end when the deck is finished or nothing was decided", () => {
    expect(atRoundEnd(initialDeck([tee]))).toBe(false);
    expect(atRoundEnd(run(initialDeck([tee]), have))).toBe(false);
  });
});
