"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { GarmentTile } from "@/components/art/Garment";
import { NextBuys } from "@/components/NextBuys";
import { SLOT_LABEL, KINDS } from "@/lib/kinds";
import { PALETTE, type ColorName } from "@/lib/palette";
import { alreadyHas, STARTER_DECK, starterItem, type StarterCard } from "@/lib/starter";
import { useWardrobe } from "@/state/wardrobe";

type Choice = "have" | "skip" | "want";
interface Decision {
  card: StarterCard;
  choice: Choice;
  itemId: string | null;
}

const THRESHOLD = 90;
const LABEL: Record<Choice, string> = { have: "I have it", skip: "Not mine", want: "Want it" };

/**
 * Build a wardrobe by swiping: right for pieces you own, left for ones you
 * don't, up for ones you'd like. Every right swipe is in the wardrobe at once,
 * drawn as an illustration, so Today can dress you before you've taken a photo.
 */
export default function StartPage() {
  const { ready, items, mode, setMode, addPieces, removeItem } = useWardrobe();
  // Fix the deck when the page opens, so pieces added while swiping don't reshuffle it.
  const [deck, setDeck] = useState<StarterCard[] | null>(null);
  useEffect(() => {
    if (ready && !deck) setDeck(STARTER_DECK.filter((c) => !alreadyHas(c, items)));
  }, [ready, deck, items]);

  const [index, setIndex] = useState(0);
  const [colors, setColors] = useState<Record<string, ColorName>>({});
  const [history, setHistory] = useState<Decision[]>([]);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [leaving, setLeaving] = useState<Choice | null>(null);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);

  const card = deck?.[index] ?? null;
  const color = card ? (colors[card.id] ?? card.colors[0]!) : null;
  const preview = useMemo(() => (card && color ? starterItem(card, color) : null), [card, color]);
  const done = deck !== null && index >= deck.length;
  const counts = {
    have: history.filter((d) => d.choice === "have").length,
    want: history.filter((d) => d.choice === "want").length,
  };

  const decide = useCallback(
    async (choice: Choice) => {
      if (!card || !preview || leaving) return;
      if (mode !== "personal") setMode("personal");
      setLeaving(choice);
      let itemId: string | null = null;
      if (choice !== "skip") {
        const item = { ...preview, status: choice === "want" ? ("wanted" as const) : ("available" as const) };
        itemId = item.id;
        void addPieces([{ item }]);
      }
      setHistory((h) => [...h, { card, choice, itemId }]);
      // Let the card fly off before the next one takes its place.
      window.setTimeout(() => {
        setLeaving(null);
        setDrag(null);
        setIndex((i) => i + 1);
      }, 220);
    },
    [card, preview, leaving, mode, setMode, addPieces],
  );

  const undo = useCallback(async () => {
    const last = history[history.length - 1];
    if (!last || leaving) return;
    if (last.itemId) await removeItem(last.itemId);
    setHistory((h) => h.slice(0, -1));
    setIndex((i) => Math.max(0, i - 1));
  }, [history, leaving, removeItem]);

  // Arrow keys: left, up, right; Backspace undoes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey) return;
      if (e.key === "ArrowRight") void decide("have");
      else if (e.key === "ArrowLeft") void decide("skip");
      else if (e.key === "ArrowUp") {
        e.preventDefault();
        void decide("want");
      } else if (e.key === "Backspace") void undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [decide, undo]);

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
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
                {card.colors.length > 1 && (
                  <div className="swipes-colors" role="group" aria-label="Colour">
                    {card.colors.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className="swatch small"
                        aria-pressed={c === color}
                        aria-label={c}
                        title={c}
                        style={{ background: PALETTE[c].hex }}
                        onClick={() => setColors((m) => ({ ...m, [card.id]: c }))}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="swipe-actions">
            <button type="button" className="swipe-btn" onClick={() => void decide("skip")} aria-keyshortcuts="ArrowLeft">
              <span aria-hidden="true">✕</span> Not mine
            </button>
            <button type="button" className="swipe-btn want" onClick={() => void decide("want")} aria-keyshortcuts="ArrowUp">
              <span aria-hidden="true">☆</span> Want it
            </button>
            <button type="button" className="swipe-btn have" onClick={() => void decide("have")} aria-keyshortcuts="ArrowRight">
              <span aria-hidden="true">✓</span> I have it
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
