"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { GarmentTile } from "@/components/art/Garment";
import { ColourSheet } from "@/components/ColourSheet";
import { NextBuys } from "@/components/NextBuys";
import { SLOT_LABEL, KINDS } from "@/lib/kinds";
import { PALETTE, type ColorName } from "@/lib/palette";
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
  type Choice,
  type DeckAction,
  type DeckState,
} from "@/lib/deck";
import { browserStorage, choicesAfter, loadChoices, saveChoices, skippedCount, storeKey, withoutSkipped, type Choices } from "@/lib/deck-store";
import { colourOptions } from "@/lib/quickadd";
import { STARTER_DECK, starterItem } from "@/lib/starter";
import { choiceOf, leanOf, strengthOf } from "@/lib/swipe";
import { wishFromItem } from "@/lib/wishlist";
import { useAuth } from "@/state/auth";
import { useWardrobe } from "@/state/wardrobe";

const LABEL: Record<Choice, string> = { have: "I have it", skip: "Not mine", want: "Want it" };

/**
 * Build a wardrobe by swiping: right for pieces you own, left for ones you
 * don't, up for ones you'd like. Every right swipe is in the wardrobe at once,
 * drawn as an illustration, so Today can dress you before you've taken a photo.
 */
export default function StartPage() {
  const { ready, items, mode, setMode, addPieces, removeItem, addWish, removeWish } = useWardrobe();
  // Fix the deck when the page opens, so pieces added while swiping don't reshuffle it.
  const [dk, setDk] = useState<DeckState | null>(null);
  // Each card's choice is remembered on this device, per account, so the deck resumes where it stopped.
  const { user } = useAuth();
  const storageKey = storeKey(user?.id);
  const stored = useRef<Choices>({});
  const [skipped, setSkipped] = useState(0);
  const remember = (next: Choices) => {
    stored.current = next;
    setSkipped(skippedCount(next));
    saveChoices(browserStorage(), storageKey, next);
  };
  useEffect(() => {
    if (!ready || dk) return;
    const saved = loadChoices(browserStorage(), storageKey);
    stored.current = saved;
    setSkipped(skippedCount(saved));
    setDk(initialDeck(cardsToShow(STARTER_DECK, items, saved), items));
  }, [ready, dk, items, storageKey]);
  /** Bring back the cards marked "not mine". */
  const revisit = () => {
    const left = withoutSkipped(stored.current);
    remember(left);
    setDrag(null);
    setDk(initialDeck(cardsToShow(STARTER_DECK, items, left), items));
  };

  // Every other colour opens in a sheet, so the card never holds a long list.
  const [sheetOpen, setSheetOpen] = useState(false);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [leaving, setLeaving] = useState<Choice | null>(null);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);

  const deck = dk?.deck ?? null;
  const index = dk?.index ?? 0;
  const history = dk?.history ?? [];
  const card = dk ? currentCard(dk) : null;
  const color = dk ? shownColour(dk) : null;
  const ticked = dk ? tickedColours(dk) : [];
  const owned = dk ? ownedOnCard(dk) : [];
  const chosen: ColorName[] = dk ? chosenColours(dk) : [];
  /** Apply an action to the deck, returning what to do to the wardrobe. */
  const step = (action: DeckAction) => {
    if (!dk) return null;
    const result = deckReducer(dk, action);
    setDk(result.state);
    return result.effects;
  };
  const toggle = (c: ColorName) => void step({ type: "toggleColour", colour: c });
  const preview = useMemo(() => (card && color ? starterItem(card, color) : null), [card, color]);
  const done = dk !== null && isDone(dk);
  const counts = countsOf(history);
  const last = history[history.length - 1] ?? null;
  const place = dk ? placeOf(dk, STARTER_DECK.length) : null;

  const decide = useCallback(
    async (choice: Choice) => {
      if (!dk || !card || !preview || leaving) return;
      if (mode !== "personal") setMode("personal");
      setLeaving(choice);
      const { state, effects } = deckReducer(dk, { type: "decide", choice, ownedIds: items.map((i) => i.id) });
      setDk(state);
      remember(choicesAfter(stored.current, effects));
      if (effects.addPieces.length) void addPieces(effects.addPieces.map((item) => ({ item })));
      for (const item of effects.addWishes) addWish(wishFromItem(item));
      // Let the card fly off before the next one takes its place.
      window.setTimeout(() => {
        setLeaving(null);
        setDrag(null);
        setDk((s) => (s ? deckReducer(s, { type: "advance" }).state : s));
      }, 220);
    },
    [dk, card, preview, leaving, mode, setMode, addPieces, addWish, items],
  );

  const undo = useCallback(async () => {
    if (!dk || !dk.history.length || leaving) return;
    const { state, effects } = deckReducer(dk, { type: "undo" });
    setDk(state);
    remember(choicesAfter(stored.current, effects));
    for (const id of effects.removeItemIds) await removeItem(id);
    for (const id of effects.removeWishIds) removeWish(id);
  }, [dk, leaving, removeItem, removeWish]);

  // Arrow keys: left, up, right; Backspace undoes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (sheetOpen || e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey) return;
      if (e.key === "ArrowRight") void decide("have");
      else if (e.key === "ArrowLeft") void decide("skip");
      else if (e.key === "ArrowUp") {
        e.preventDefault();
        void decide("want");
      } else if (e.key === "Backspace") void undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [decide, undo, sheetOpen]);

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    // Colours are tapped, never dragged: only the picture and text start a swipe.
    if ((e.target as HTMLElement).closest("button, .colour-picks")) return;
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ x: 0, y: 0 });
  };
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!start.current || start.current.id !== e.pointerId) return;
    setDrag({ x: e.clientX - start.current.x, y: e.clientY - start.current.y });
  };
  const onUp = () => {
    if (!start.current || !drag) return;
    start.current = null;
    const { x, y } = drag;
    const choice = choiceOf(x, y);
    if (choice) void decide(choice);
    else setDrag(null);
  };

  // Which way the card is leaning, for the stamp on it.
  const lean: Choice | null = leaving ?? (drag ? leanOf(drag.x, drag.y) : null);
  const strength = drag ? strengthOf(drag.x, drag.y) : leaving ? 1 : 0;
  const transform = leaving
    ? leaving === "want"
      ? "translate(0, -120vh)"
      : `translate(${leaving === "have" ? 120 : -120}vw, 0) rotate(${leaving === "have" ? 18 : -18}deg)`
    : drag
      ? `translate(${drag.x}px, ${Math.min(drag.y, 40)}px) rotate(${drag.x * 0.06}deg)`
      : undefined;

  return (
    <>
      <div className="page-head">
        <span className="eyebrow">Quick start · {done ? "done" : place ? `${place.at} of ${place.total}` : "…"}</span>
        <h1 className="display page-title">Swipe your wardrobe</h1>
      </div>

      {!done && (
        <p className="swipe-help">
          <span>Right: I have it</span>
          <span>Up: want it</span>
          <span>Left: not mine</span>
        </p>
      )}

      {deck && !done && card && preview && color && (
        <div className="swipe">
          <div className="swipe-progress" aria-hidden="true">
            <span style={{ width: `${(((place?.at ?? 1) - 1) / STARTER_DECK.length) * 100}%` }} />
          </div>
          <div className="swipe-stack">
            {deck[index + 1] && (
              <div className="swipe-card swipe-next" aria-hidden="true">
                <div className="plinth swipe-art">
                  <GarmentTile item={starterItem(deck[index + 1]!)} decorative />
                </div>
              </div>
            )}
            <div
              className={`swipe-card${drag && !leaving ? " dragging" : ""}`}
              style={{ transform }}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={() => {
                start.current = null;
                setDrag(null);
              }}
              aria-roledescription="card"
              aria-label={`${preview.name}. ${card.note}`}
            >
              {lean && (
                <span className={`swipe-stamp stamp-${lean}`} style={{ opacity: strength }} aria-hidden="true">
                  {LABEL[lean]}
                </span>
              )}
              <div className="plinth swipe-art">
                <GarmentTile item={preview} decorative />
              </div>
              <div className="swipe-text">
                <span className="label">
                  {card.tag === "Now" ? "On trend" : "Essential"} · {SLOT_LABEL[KINDS[card.kind].slot]}
                </span>
                <p className="swipe-name">{preview.name}</p>
                <p className="swipe-note">{card.note}</p>
                <fieldset className="colour-picks">
                  <legend className="label">
                    {ticked.length ? `You have ${ticked.length}` : owned.length ? "Any other colours you own?" : "Your colours: tap every one you own"}
                  </legend>
                  <div className="colour-chips">
                    {/* The card's own colours, then any others owned or picked from the sheet. */}
                    {colourOptions(card, owned, ticked).map((c) =>
                      owned.includes(c) ? (
                        <button key={c} type="button" className="colour-chip owned" aria-pressed="true" disabled>
                          <span className="colour-dot" style={{ background: PALETTE[c].hex }} aria-hidden="true" />
                          {c}
                          <span className="colour-owned">In your wardrobe</span>
                        </button>
                      ) : (
                        <button key={c} type="button" className="colour-chip" aria-pressed={ticked.includes(c)} onClick={() => toggle(c)}>
                          <span className="colour-dot" style={{ background: PALETTE[c].hex }} aria-hidden="true" />
                          {c}
                        </button>
                      ),
                    )}
                    <button type="button" className="colour-chip more" onClick={() => setSheetOpen(true)} aria-haspopup="dialog">
                      + Other colour
                    </button>
                  </div>
                </fieldset>
              </div>
            </div>
          </div>

          <div className="swipe-actions">
            <button type="button" className="swipe-btn" onClick={() => void decide("skip")} aria-keyshortcuts="ArrowLeft">
              <span aria-hidden="true">✕</span> Not mine
            </button>
            <button type="button" className="swipe-btn want" onClick={() => void decide("want")} aria-keyshortcuts="ArrowUp">
              <span aria-hidden="true">☆</span> {chosen.length > 1 ? `Want ${chosen.length}` : "Want it"}
            </button>
            <button type="button" className="swipe-btn have" onClick={() => void decide("have")} aria-keyshortcuts="ArrowRight">
              <span aria-hidden="true">✓</span> {chosen.length === 0 ? "Next" : chosen.length > 1 ? `I have ${chosen.length}` : "I have it"}
            </button>
          </div>
          <div className="swipe-foot">
            <span className="label">
              {counts.have} in your wardrobe · {counts.want} on your wishlist
            </span>
            {last && (
              <button type="button" className="text-link swipe-undo" onClick={() => void undo()} aria-label={`Undo: ${last.name}`}>
                Undo
              </button>
            )}
          </div>
        </div>
      )}

      {sheetOpen && card && (
        <ColourSheet title={`${card.name}: your colours`} picked={[...owned, ...ticked]} onToggle={toggle} onClose={() => setSheetOpen(false)} />
      )}

      {done && (
        <div className="swipe-done">
          <div className="plinth empty">
            <p className="display" style={{ fontSize: 28, color: "var(--ink)" }}>
              {counts.have ? `${counts.have} pieces in, ready to dress` : "All swiped"}
            </p>
            <p>
              {counts.want ? `${counts.want} on your wishlist. ` : ""}Your pieces are drawn for now. Swap in real photos whenever you like from
              Wardrobe.
            </p>
            <div className="actions">
              <Link href="/" className="btn">
                See today’s look
              </Link>
              <Link href="/add" className="btn quiet">
                Add photos of your own
              </Link>
              {last && (
                <button type="button" className="btn quiet" onClick={() => void undo()} aria-label={`Undo: ${last.name}`}>
                  Undo
                </button>
              )}
              {skipped > 0 && (
                <button type="button" className="btn quiet" onClick={revisit}>
                  Go through the ones you skipped ({skipped})
                </button>
              )}
            </div>
          </div>
          <NextBuys />
        </div>
      )}

      {deck && deck.length === 0 && skipped === 0 && (
        <p className="footer-note">You’ve already got every piece in the starter deck. Your best next buys are below.</p>
      )}
    </>
  );
}
