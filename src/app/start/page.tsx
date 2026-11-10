"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { GarmentTile } from "@/components/art/Garment";
import { AddedPieces } from "@/components/AddedPieces";
import { ColourSheet } from "@/components/ColourSheet";
import { FixPiece } from "@/components/FixPiece";
import { NextBuys } from "@/components/NextBuys";
import { SLOT_LABEL, KINDS } from "@/lib/kinds";
import { PALETTE, type ColorName } from "@/lib/palette";
import {
  addedPieces,
  addedWishes,
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
  SLOT_WORD,
  shownColour,
  slotFromParam,
  tickedColours,
  visibleColours,
  type Choice,
  type Added,
  type DeckAction,
  type DeckEffects,
  type DeckState,
} from "@/lib/deck";
import { browserStorage, choicesAfter, hintSeen, loadChoices, markHintSeen, saveChoices, skippedCount, storeKey, withoutSkipped, type Choices } from "@/lib/deck-store";
import { missingEssentials } from "@/lib/essentials";
import { colourOptions, ownedColours } from "@/lib/quickadd";
import { STARTER_DECK, starterItem, type StarterCard } from "@/lib/starter";
import { choiceOf, leanOf, strengthOf, velocityOf, type Sample } from "@/lib/swipe";
import type { Slot } from "@/lib/types";
import { wishFromItem } from "@/lib/wishlist";
import { useAuth } from "@/state/auth";
import { useWardrobe } from "@/state/wardrobe";

/** The ids of the cards for one part of the wardrobe, or undefined for the whole deck. */
const slotCardIds = (slot: Slot | null): string[] | undefined => (slot ? STARTER_DECK.filter((c) => KINDS[c.kind].slot === slot).map((c) => c.id) : undefined);

const LABEL: Record<Choice, string> = { have: "I have it", skip: "Not mine", want: "Want it" };

/** A card that has been decided and is flying away. The next card is already live underneath. */
interface Leaving {
  key: string;
  card: StarterCard;
  colour: ColorName;
  choice: Choice;
  /** Where the card was let go, so the exit carries on from there. */
  x: number;
  y: number;
  height: number | undefined;
}
/** A little longer than the exit animation in the stylesheet, as a fallback if `animationend` never comes. */
const LEAVE_MS = 320;

/**
 * Build a wardrobe by swiping: right for pieces you own, left for ones you
 * don't, up for ones you'd like. Every right swipe is in the wardrobe at once,
 * drawn as an illustration, so Today can dress you before you've taken a photo.
 */
export default function StartPage() {
  const { ready, items, mode, setMode, addPieces, removeItem, addWish, removeWish } = useWardrobe();
  // Fix the deck when the page opens, so pieces added while swiping don't reshuffle it.
  const [dk, setDk] = useState<DeckState | null>(null);
  // The deck as the latest action left it, so two taps in a row never act on the same card.
  const dkRef = useRef<DeckState | null>(null);
  const setDeckNow = (next: DeckState) => {
    dkRef.current = next;
    setDk(next);
  };
  // Each card's choice is remembered on this device, per account, so the deck resumes where it stopped.
  const { user } = useAuth();
  const storageKey = storeKey(user?.id);
  const stored = useRef<Choices>({});
  const [choicesNow, setChoicesNow] = useState<Choices>({});
  const remember = (next: Choices) => {
    stored.current = next;
    setChoicesNow(next);
    saveChoices(browserStorage(), storageKey, next);
  };
  useEffect(() => {
    if (!ready || dk) return;
    const saved = loadChoices(browserStorage(), storageKey);
    stored.current = saved;
    setChoicesNow(saved);
    // /start?slot=shoes swipes one part of the wardrobe, whatever the round.
    const slot = slotFromParam(new URLSearchParams(window.location.search).get("slot"));
    setDeckNow(initialDeck(cardsToShow(STARTER_DECK, items, saved, slot), items, slot));
  }, [ready, dk, items, storageKey]);
  // The one-time hint: the first card ever shown leans right then left, once. With reduced motion a line of text says it instead.
  const [hintText, setHintText] = useState(false);
  const hintTried = useRef(false);
  /** Bring back the cards marked "not mine". */
  const revisit = () => {
    const slot = dkRef.current?.slot ?? null;
    const left = withoutSkipped(stored.current, slotCardIds(slot));
    remember(left);
    stopDrag();
    setDeckNow(initialDeck(cardsToShow(STARTER_DECK, items, left, slot), items, slot));
  };

  // Every other colour opens in a sheet, so the card never holds a long list.
  const [sheetOpen, setSheetOpen] = useState(false);
  const [gone, setGone] = useState<Leaving[]>([]);
  const goneCount = useRef(0);
  const cardEl = useRef<HTMLDivElement | null>(null);
  // The stack holds both cards, so --strength is set here and the card behind can rise as the top card goes.
  const stackEl = useRef<HTMLDivElement | null>(null);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  // The last few pointer positions, for the speed of a flick on release.
  const samples = useRef<Sample[]>([]);
  // Where the card has been dragged to. Dragging never touches React state: the position is written to the
  // card as CSS custom properties, at most once a frame, and only a decision re-renders the page.
  const dragAt = useRef({ x: 0, y: 0 });
  const frame = useRef<number | null>(null);
  const paint = useCallback(() => {
    frame.current = null;
    const el = cardEl.current;
    if (!el) return;
    const { x, y } = dragAt.current;
    const lean = leanOf(x, y);
    const width = el.offsetWidth; // read before writing, so a frame forces no extra layout
    el.style.setProperty("--dx", String(x));
    el.style.setProperty("--dy", String(Math.min(y, 40)));
    stackEl.current?.style.setProperty("--strength", String(strengthOf(x, y, width)));
    if (lean) el.dataset.lean = lean;
    else delete el.dataset.lean;
  }, []);
  /** Let go of the card without a decision, or drop a drag that is over: cancel any frame still waiting. */
  const stopDrag = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    start.current = null;
    dragAt.current = { x: 0, y: 0 };
    const stack = stackEl.current;
    if (stack) {
      delete stack.dataset.dragging;
      stack.style.setProperty("--strength", "0");
    }
    const el = cardEl.current;
    if (!el) return;
    delete el.dataset.dragging;
    delete el.dataset.lean;
    el.style.setProperty("--dx", "0");
    el.style.setProperty("--dy", "0");
  }, []);
  useEffect(() => stopDrag, [stopDrag]);

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
    const cur = dkRef.current;
    if (!cur) return null;
    const result = deckReducer(cur, action);
    setDeckNow(result.state);
    return result.effects;
  };
  const toggle = (c: ColorName) => void step({ type: "toggleColour", colour: c });
  // A piece just added that is open to fix: which card it came from, and its id.
  const [fixing, setFixing] = useState<{ cardId: string; id: string } | null>(null);
  /** Do to the wardrobe and wishlist what a fix asks for. */
  const apply = async (fx: DeckEffects | null) => {
    if (!fx) return;
    if (fx.addPieces.length) await addPieces(fx.addPieces.map((item) => ({ item })));
    for (const id of fx.removeItemIds) await removeItem(id);
    for (const id of fx.removeWishIds) removeWish(id);
  };
  const preview = useMemo(() => (card && color ? starterItem(card, color) : null), [card, color]);
  // The drawings are made once per card, so a tap on a colour chip redraws neither the live card nor the one behind.
  const nextCard = deck?.[index + 1] ?? null;
  const previewArt = useMemo(() => (preview ? <GarmentTile item={preview} decorative /> : null), [preview]);
  const nextArt = useMemo(() => (nextCard ? <GarmentTile item={starterItem(nextCard)} decorative /> : null), [nextCard]);
  const done = dk !== null && isDone(dk);
  const counts = countsOf(history);
  const last = history[history.length - 1] ?? null;
  const place = dk ? placeOf(dk, STARTER_DECK.length) : null;
  const inRound = dk ? roundPlace(dk) : null;
  const skipped = skippedCount(choicesNow, slotCardIds(dk?.slot ?? null));
  // The bar fills across the round's part of the deck, or across the whole deck.
  const barWidth = inRound && dk?.slot ? (inRound.at - 1) / inRound.total : ((place?.at ?? 1) - 1) / STARTER_DECK.length;
  const end = dk ? roundEnd(dk) : null;
  const fixed = fixing ? (addedPieces(history).find((a) => a.piece.id === fixing.id) ?? null) : null;
  const justAdded = addedPieces(history);
  const justWished = addedWishes(history);
  const dropWish = (a: Added) => void apply(step({ type: "removeWish", cardId: a.cardId, id: a.piece.id }));
  // Once the wardrobe has a top, trousers and shoes, the counts line says so. Not for the sample wardrobe, which isn't yours.
  const canDress = mode === "personal" && missingEssentials(items).length === 0;
  const eyebrow = done ? "Quick start · done" : end ? `${end.name} · done` : inRound ? `${inRound.name} · ${inRound.at} of ${inRound.total}` : "…";

  const dropLeaving = useCallback((key: string) => setGone((list) => list.filter((g) => g.key !== key)), []);

  /** Decide the card on top now. Only its exit is animated: the next card is live at once. */
  const decide = useCallback(
    (choice: Choice, from: { x: number; y: number } = { x: 0, y: 0 }) => {
      const cur = dkRef.current;
      const top = cur ? currentCard(cur) : null;
      const colour = cur ? shownColour(cur) : null;
      if (!cur || !top || !colour || atRoundEnd(cur)) return;
      if (mode !== "personal") setMode("personal");
      const { state, effects } = deckReducer(cur, { type: "decide", choice, ownedIds: items.map((i) => i.id) });
      setDeckNow(state);
      stopDrag();
      remember(choicesAfter(stored.current, effects));
      if (effects.addPieces.length) void addPieces(effects.addPieces.map((item) => ({ item })));
      for (const item of effects.addWishes) addWish(wishFromItem(item));
      // With reduced motion the card just goes; there is nothing to fly away.
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      goneCount.current += 1;
      const key = `${top.id}-${goneCount.current}`;
      setGone((list) => [...list, { key, card: top, colour, choice, x: from.x, y: from.y, height: cardEl.current?.offsetHeight }]);
      window.setTimeout(() => dropLeaving(key), LEAVE_MS);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- remember only reads refs and the storage key
    [mode, setMode, addPieces, addWish, items, storageKey, dropLeaving, stopDrag],
  );

  const undo = useCallback(async () => {
    const cur = dkRef.current;
    if (!cur || !cur.history.length) return;
    const { state, effects } = deckReducer(cur, { type: "undo" });
    setDeckNow(state);
    remember(choicesAfter(stored.current, effects));
    for (const id of effects.removeItemIds) await removeItem(id);
    for (const id of effects.removeWishIds) removeWish(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- remember only reads refs and the storage key
  }, [removeItem, removeWish, storageKey]);

  const hintReady = dk !== null && !isDone(dk);
  useEffect(() => {
    if (!hintReady || hintTried.current) return;
    const timer = window.setTimeout(() => {
      const el = cardEl.current;
      const cur = dkRef.current;
      // Not while a finger is on the card, and not for anyone who has already swiped.
      if (!el || !cur || start.current) return;
      hintTried.current = true;
      const storage = browserStorage();
      if (hintSeen(storage)) return;
      markHintSeen(storage);
      if (cur.history.length || Object.keys(stored.current).length) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setHintText(true);
      else el.dataset.hint = "true";
    }, 600);
    return () => window.clearTimeout(timer);
  }, [hintReady]);

  // Arrow keys: left, up, right; Backspace undoes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (sheetOpen || fixing || e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey) return;
      if (e.key === "ArrowRight") decide("have");
      else if (e.key === "ArrowLeft") decide("skip");
      else if (e.key === "ArrowUp") {
        e.preventDefault();
        decide("want");
      } else if (e.key === "Backspace") void undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [decide, undo, sheetOpen, fixing]);

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    // Colours are tapped, never dragged: only the picture and text start a swipe.
    if ((e.target as HTMLElement).closest("button, .colour-picks")) return;
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    samples.current = [{ t: performance.now(), x: e.clientX, y: e.clientY }];
    dragAt.current = { x: 0, y: 0 };
    e.currentTarget.dataset.dragging = "true";
    delete e.currentTarget.dataset.hint;
    if (stackEl.current) stackEl.current.dataset.dragging = "true";
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  // No state is set here: the position goes to the card on the next frame.
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!start.current || start.current.id !== e.pointerId) return;
    samples.current = [...samples.current.slice(-7), { t: performance.now(), x: e.clientX, y: e.clientY }];
    dragAt.current = { x: e.clientX - start.current.x, y: e.clientY - start.current.y };
    if (frame.current === null) frame.current = requestAnimationFrame(paint);
  };
  const onUp = () => {
    if (!start.current) return;
    const { x, y } = dragAt.current;
    const { vx, vy } = velocityOf(samples.current, performance.now());
    const choice = choiceOf(x, y, vx, vy, cardEl.current?.offsetWidth);
    if (choice) decide(choice, { x, y });
    else stopDrag();
  };

  return (
    <>
      <div className="page-head swipe-head">
        <span className="eyebrow">{eyebrow}</span>
        <h1 className="display page-title">Swipe your wardrobe</h1>
      </div>

      {!done && hintText && (
        <p className="swipe-help">
          <span>Right: I have it</span>
          <span>Up: want it</span>
          <span>Left: not mine</span>
        </p>
      )}

      {deck && !done && !end && card && preview && color && (
        <div className="swipe">
          <div className="swipe-progress" aria-hidden="true">
            <span style={{ width: `${barWidth * 100}%` }} />
          </div>
          <div className="swipe-stack" ref={stackEl}>
            {deck[index + 1] && (
              <div key={deck[index + 1]!.id} className="swipe-card swipe-next" aria-hidden="true">
                <div className="plinth swipe-art">
                  {nextArt}
                </div>
              </div>
            )}
            {/* Cards just decided, flying away over the live one. */}
            {gone.map((g) => {
              const item = starterItem(g.card, g.colour);
              return (
                <div
                  key={g.key}
                  className={`swipe-card swipe-leaving leave-${g.choice}`}
                  style={{ "--fx": `${g.x}px`, "--fy": `${Math.min(g.y, 40)}px`, "--fr": `${g.x * 0.06}deg`, height: g.height } as CSSProperties}
                  onAnimationEnd={() => dropLeaving(g.key)}
                  aria-hidden="true"
                >
                  <span className={`swipe-stamp stamp-${g.choice}`}>{LABEL[g.choice]}</span>
                  <div className="plinth swipe-art">
                    <GarmentTile item={item} decorative />
                  </div>
                  <div className="swipe-text">
                    <span className="label">
                      {g.card.tag === "Now" ? "On trend" : "Essential"} · {SLOT_LABEL[KINDS[g.card.kind].slot]}
                    </span>
                    <p className="swipe-name">{item.name}</p>
                    <p className="swipe-note">{g.card.note}</p>
                  </div>
                </div>
              );
            })}
            <div
              key={card.id}
              ref={cardEl}
              className="swipe-card"
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={stopDrag}
              onAnimationEnd={(e) => {
                if (e.target === e.currentTarget) delete e.currentTarget.dataset.hint;
              }}
              aria-roledescription="card"
              aria-label={`${preview.name}. ${card.note}`}
            >
              {/* All three stamps are there; the card's data-lean says which one shows, and --strength how much. */}
              {(["have", "skip", "want"] as const).map((c) => (
                <span key={c} className={`swipe-stamp stamp-${c}`} aria-hidden="true">
                  {LABEL[c]}
                </span>
              ))}
              <div className="plinth swipe-art">{previewArt}</div>
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
                    {/* The card's own colours (four at most, so it fits a small phone), then any others owned or picked. The rest are in the sheet. */}
                    {visibleColours(colourOptions(card, owned, ticked), owned, ticked).map((c) =>
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

          <div className="swipe-foot">
            {canDress ? (
              <Link href="/" className="swipe-look">
                <span className="label">You can get dressed now.</span>
                <span className="text-link">See today’s look</span>
              </Link>
            ) : (
              <span className="label">
                {counts.have} in your wardrobe · {counts.want} on your wishlist
              </span>
            )}
            {last && (
              <button type="button" className="text-link swipe-undo" onClick={() => void undo()} aria-label={`Undo: ${last.name}`}>
                Undo
              </button>
            )}
          </div>
          {/* Last on the page, so nothing sits beneath the buttons when they are pinned above the tab bar. */}
          <div className="swipe-actions">
            <button type="button" className="swipe-btn" onClick={() => decide("skip")} aria-keyshortcuts="ArrowLeft">
              <span aria-hidden="true">✕</span> Not mine
            </button>
            <button type="button" className="swipe-btn want" onClick={() => decide("want")} aria-keyshortcuts="ArrowUp">
              <span aria-hidden="true">☆</span> {chosen.length > 1 ? `Want ${chosen.length}` : "Want it"}
            </button>
            <button type="button" className="swipe-btn have" onClick={() => decide("have")} aria-keyshortcuts="ArrowRight">
              <span aria-hidden="true">✓</span> {chosen.length === 0 ? "Next" : chosen.length > 1 ? `I have ${chosen.length}` : "I have it"}
            </button>
          </div>
        </div>
      )}

      {deck && !done && end && (
        <div className="swipe swipe-round">
          <div className="swipe-progress" aria-hidden="true">
            <span style={{ width: `${barWidth * 100}%` }} />
          </div>
          {/* Replaces the card and the buttons, and is shorter than both. */}
          <div className="plinth swipe-round-card">
            <p className="display swipe-round-title">{end.name} done</p>
            <p className="swipe-round-note" role="status">
              {end.pieces.length
                ? `${end.pieces.length} ${end.pieces.length === 1 ? "piece" : "pieces"} added`
                : "Nothing added in this round"}
              {end.wishes.length ? ` · ${end.wishes.length} on your wishlist` : ""}
            </p>
            {/* Two rows show; more scroll inside, so the buttons stay on the screen. */}
            {(end.pieces.length > 0 || end.wishes.length > 0) && (
              <div className="swipe-round-added">
                <AddedPieces compact pieces={end.pieces} wishes={end.wishes} onPick={(a) => setFixing({ cardId: a.cardId, id: a.piece.id })} onRemoveWish={dropWish} />
              </div>
            )}
            <div className="actions">
              <Link href="/" className="btn">
                See today’s look
              </Link>
              <button type="button" className="btn alt" onClick={() => step({ type: "continue" })}>
                Keep going: {end.next.name.toLowerCase()} ({end.next.left})
              </button>
              {last && (
                <button type="button" className="btn quiet" onClick={() => void undo()} aria-label={`Undo: ${last.name}`}>
                  Undo
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {fixing && fixed && (
        <FixPiece
          key={fixed.piece.id}
          piece={fixed.piece}
          hide={ownedColours(STARTER_DECK.find((c) => c.id === fixed.cardId)!, items).filter((c) => c !== fixed.piece.color)}
          onColour={(to) => {
            void apply(step({ type: "recolour", cardId: fixed.cardId, from: fixed.piece.color, to, ownedIds: items.map((i) => i.id) }));
            setFixing(null);
          }}
          onRemove={() => {
            void apply(step({ type: "removePiece", cardId: fixed.cardId, id: fixed.piece.id }));
            setFixing(null);
          }}
          onClose={() => setFixing(null)}
        />
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
            {(justAdded.length > 0 || justWished.length > 0) && <p className="setting-note">Tap a piece to fix its colour or remove it.</p>}
            <AddedPieces pieces={justAdded} wishes={justWished} onPick={(a) => setFixing({ cardId: a.cardId, id: a.piece.id })} onRemoveWish={dropWish} />
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
        <p className="footer-note">
          {dk?.slot ? `You’ve already been through every card for ${SLOT_WORD[dk.slot]}.` : "You’ve already got every piece in the starter deck. Your best next buys are below."}
        </p>
      )}
    </>
  );
}
