"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { GarmentTile } from "@/components/art/Garment";
import { ColourSheet } from "@/components/ColourSheet";
import { NextBuys } from "@/components/NextBuys";
import { SLOT_LABEL, KINDS } from "@/lib/kinds";
import { PALETTE, type ColorName } from "@/lib/palette";
import { alreadyHas, STARTER_DECK, starterItem, type StarterCard } from "@/lib/starter";
import { wishFromItem } from "@/lib/wishlist";
import { useWardrobe } from "@/state/wardrobe";

type Choice = "have" | "skip" | "want";
interface Decision {
  card: StarterCard;
  choice: Choice;
  /** Pieces added to the wardrobe (one per colour you have). */
  itemIds: string[];
  /** Entries added to the wishlist. */
  wishIds: string[];
}

const THRESHOLD = 90;
const LABEL: Record<Choice, string> = { have: "I have it", skip: "Not mine", want: "Want it" };

/**
 * Build a wardrobe by swiping: right for pieces you own, left for ones you
 * don't, up for ones you'd like. Every right swipe is in the wardrobe at once,
 * drawn as an illustration, so Today can dress you before you've taken a photo.
 */
export default function StartPage() {
  const { ready, items, mode, setMode, addPieces, removeItem, addWish, removeWish } = useWardrobe();
  // Fix the deck when the page opens, so pieces added while swiping don't reshuffle it.
  const [deck, setDeck] = useState<StarterCard[] | null>(null);
  useEffect(() => {
    if (ready && !deck) setDeck(STARTER_DECK.filter((c) => !alreadyHas(c, items)));
  }, [ready, deck, items]);

  const [index, setIndex] = useState(0);
  // The colours ticked on each card, and the one its picture shows.
  const [picked, setPicked] = useState<Record<string, ColorName[]>>({});
  const [shown, setShown] = useState<Record<string, ColorName>>({});
  // Every other colour opens in a sheet, so the card never holds a long list.
  const [sheetOpen, setSheetOpen] = useState(false);
  const [history, setHistory] = useState<Decision[]>([]);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [leaving, setLeaving] = useState<Choice | null>(null);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);

  const card = deck?.[index] ?? null;
  const color = card ? (shown[card.id] ?? card.colors[0]!) : null;
  const ticked = card ? (picked[card.id] ?? []) : [];
  // With nothing ticked, the colour on show is the one you mean.
  const chosen: ColorName[] = ticked.length ? ticked : color ? [color] : [];
  const toggle = (c: ColorName) => {
    if (!card) return;
    setShown((m) => ({ ...m, [card.id]: c }));
    setPicked((m) => {
      const now = m[card.id] ?? [];
      return { ...m, [card.id]: now.includes(c) ? now.filter((x) => x !== c) : [...now, c] };
    });
  };
  const preview = useMemo(() => (card && color ? starterItem(card, color) : null), [card, color]);
  const done = deck !== null && index >= deck.length;
  const counts = {
    have: history.reduce((n, d) => n + d.itemIds.length, 0),
    want: history.reduce((n, d) => n + d.wishIds.length, 0),
  };

  const decide = useCallback(
    async (choice: Choice) => {
      if (!card || !preview || leaving) return;
      if (mode !== "personal") setMode("personal");
      setLeaving(choice);
      let itemIds: string[] = [];
      let wishIds: string[] = [];
      if (choice === "have") {
        // One piece per colour you have, skipping any already in the wardrobe.
        const pieces = chosen.map((c) => starterItem(card, c)).filter((p) => !items.some((i) => i.id === p.id));
        itemIds = pieces.map((p) => p.id);
        if (pieces.length) void addPieces(pieces.map((item) => ({ item })));
      } else if (choice === "want") {
        // Tracked on the wishlist only: nothing joins the wardrobe.
        for (const c of chosen) {
          const wish = wishFromItem(starterItem(card, c));
          addWish(wish);
          wishIds.push(wish.id);
        }
      }
      setHistory((h) => [...h, { card, choice, itemIds, wishIds }]);
      // Let the card fly off before the next one takes its place.
      window.setTimeout(() => {
        setLeaving(null);
        setDrag(null);
        setIndex((i) => i + 1);
      }, 220);
    },
    [card, preview, leaving, mode, setMode, addPieces, addWish, chosen, items],
  );

  const undo = useCallback(async () => {
    const last = history[history.length - 1];
    if (!last || leaving) return;
    for (const id of last.itemIds) await removeItem(id);
    for (const id of last.wishIds) removeWish(id);
    setHistory((h) => h.slice(0, -1));
    setIndex((i) => Math.max(0, i - 1));
  }, [history, leaving, removeItem, removeWish]);

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
    if (y < -THRESHOLD && Math.abs(y) > Math.abs(x)) void decide("want");
    else if (x > THRESHOLD) void decide("have");
    else if (x < -THRESHOLD) void decide("skip");
    else setDrag(null);
  };

  // Which way the card is leaning, for the stamp on it.
  const lean: Choice | null = leaving ?? (drag ? (drag.y < -40 && Math.abs(drag.y) > Math.abs(drag.x) ? "want" : drag.x > 40 ? "have" : drag.x < -40 ? "skip" : null) : null);
  const strength = drag ? Math.min(1, Math.max(Math.abs(drag.x), -drag.y) / THRESHOLD) : leaving ? 1 : 0;
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
        <span className="eyebrow">Quick start · {done ? "done" : deck ? `${Math.min(index + 1, deck.length)} of ${deck.length}` : "…"}</span>
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
            <span style={{ width: `${(index / deck.length) * 100}%` }} />
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
                  <legend className="label">{ticked.length ? `You have ${ticked.length}` : "Your colours: tap every one you own"}</legend>
                  <div className="colour-chips">
                    {/* The card's own colours, then any others picked from the sheet. */}
                    {[...card.colors, ...ticked.filter((c) => !card.colors.includes(c))].map((c) => (
                      <button key={c} type="button" className="colour-chip" aria-pressed={ticked.includes(c)} onClick={() => toggle(c)}>
                        <span className="colour-dot" style={{ background: PALETTE[c].hex }} aria-hidden="true" />
                        {c}
                      </button>
                    ))}
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
              <span aria-hidden="true">✓</span> {chosen.length > 1 ? `I have ${chosen.length}` : "I have it"}
            </button>
          </div>
          <div className="swipe-foot">
            <span className="label">
              {counts.have} in your wardrobe · {counts.want} on your wishlist
            </span>
            {history.length > 0 && (
              <button type="button" className="text-link" onClick={() => void undo()}>
                Undo
              </button>
            )}
          </div>
        </div>
      )}

      {sheetOpen && card && (
        <ColourSheet title={`${card.name}: your colours`} picked={ticked} onToggle={toggle} onClose={() => setSheetOpen(false)} />
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
            </div>
          </div>
          <NextBuys />
        </div>
      )}

      {deck && deck.length === 0 && (
        <p className="footer-note">You’ve already got every piece in the starter deck. Your best next buys are below.</p>
      )}
    </>
  );
}
