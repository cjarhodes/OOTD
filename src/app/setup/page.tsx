"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { GarmentTile } from "@/components/art/Garment";
import { ColourSheet } from "@/components/ColourSheet";
import { PALETTE, type ColorName } from "@/lib/palette";
import { countPicked, ownedColours, piecesFor, SETUP_SECTIONS, type Picked } from "@/lib/setup";
import { starterItem, type StarterCard } from "@/lib/starter";
import { useWardrobe } from "@/state/wardrobe";

type Filter = "All" | StarterCard["tag"];
const FILTERS: { value: Filter; label: string }[] = [
  { value: "All", label: "All" },
  { value: "Essential", label: "Essentials" },
  { value: "Classic", label: "Classics" },
  { value: "Now", label: "On trend" },
];

const pieces = (n: number) => `${n} ${n === 1 ? "piece" : "pieces"}`;

/**
 * Build a wardrobe from one page, for a laptop: every piece in the starter
 * deck at once, with the colours you own ticked, added in one go. Nothing is
 * saved until the button is pressed.
 */
export default function SetupPage() {
  const { ready, items, mode, setMode, addPieces, personalCount } = useWardrobe();
  const [picked, setPicked] = useState<Picked>({});
  const [filter, setFilter] = useState<Filter>("All");
  const [sheetCard, setSheetCard] = useState<StarterCard | null>(null);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  const count = countPicked(picked, items);

  const toggleColour = (card: StarterCard, c: ColorName) =>
    setPicked((m) => {
      const now = m[card.id] ?? [];
      return { ...m, [card.id]: now.includes(c) ? now.filter((x) => x !== c) : [...now, c] };
    });
  /** The picture or name: tick the first free colour, or clear the tile. */
  const toggleTile = (card: StarterCard, owned: ColorName[]) =>
    setPicked((m) => {
      if ((m[card.id] ?? []).length) return { ...m, [card.id]: [] };
      const first = card.colors.find((c) => !owned.includes(c));
      return first ? { ...m, [card.id]: [first] } : m;
    });

  async function add() {
    if (!count || adding) return;
    setAdding(true);
    setError(null);
    try {
      const fresh = piecesFor(picked, items);
      if (mode !== "personal") setMode("personal");
      await addPieces(fresh.map((item) => ({ item })));
      setAdded(fresh.length);
      setPicked({});
      requestAnimationFrame(() => doneRef.current?.focus());
    } catch {
      setError("These pieces couldn’t be saved on this device. Nothing was added.");
    } finally {
      setAdding(false);
    }
  }

  const sections = SETUP_SECTIONS.map((s) => ({ ...s, cards: s.cards.filter((c) => filter === "All" || c.tag === filter) })).filter(
    (s) => s.cards.length > 0,
  );

  return (
    <>
      <div className="setup-desktop">
        <div className="page-head">
          <span className="eyebrow">
            Your wardrobe · {pieces(personalCount)}
          </span>
          <h1 className="display page-title" ref={titleRef} tabIndex={-1}>
            Tick what you own
          </h1>
          <p className="setup-help">Everything most men own, on one page. Tick a piece, pick the colours you have, and add them all at once.</p>
        </div>

        {!ready ? (
          <p className="label" role="status">
            Loading your wardrobe…
          </p>
        ) : added !== null ? (
          <div className="plinth empty setup-done">
            <h2 className="display" style={{ fontSize: 28, color: "var(--ink)" }} ref={doneRef} tabIndex={-1}>
              Added {pieces(added)}.
            </h2>
            <div className="actions">
              <Link href="/wardrobe" className="btn">
                See your wardrobe
              </Link>
              <Link href="/" className="btn alt">
                See today’s look
              </Link>
              <button
                type="button"
                className="btn quiet"
                onClick={() => {
                  setAdded(null);
                  setPicked({});
                  requestAnimationFrame(() => titleRef.current?.focus());
                }}
              >
                Tick more
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="setup-filters" role="group" aria-label="Show">
              {FILTERS.map((f) => (
                <button key={f.value} type="button" className="chip" aria-pressed={filter === f.value} onClick={() => setFilter(f.value)}>
                  {f.label}
                </button>
              ))}
            </div>

            {sections.map((s) => (
              <section key={s.slot} className="setup-section" aria-labelledby={`setup-${s.slot}`}>
                <h2 id={`setup-${s.slot}`} className="display setup-heading">
                  {s.heading}
                </h2>
                <ul className="setup-grid" aria-label={s.heading}>
                  {s.cards.map((card) => (
                    <SetupTile
                      key={card.id}
                      card={card}
                      ticked={picked[card.id] ?? []}
                      owned={ownedColours(card, items)}
                      onTile={(owned) => toggleTile(card, owned)}
                      onColour={(c) => toggleColour(card, c)}
                      onMore={() => setSheetCard(card)}
                    />
                  ))}
                </ul>
              </section>
            ))}

            {error && (
              <p className="banner" role="alert">
                {error}
              </p>
            )}
            <div className="setup-bar">
              <span className="setup-count" role="status">
                {count} {count === 1 ? "piece" : "pieces"} ticked
              </span>
              <div className="setup-bar-actions">
                {count > 0 && (
                  <button type="button" className="btn quiet" onClick={() => setPicked({})}>
                    Clear
                  </button>
                )}
                <button type="button" className="btn" disabled={count === 0 || adding} onClick={() => void add()}>
                  {adding ? "Adding…" : count ? `Add ${pieces(count)}` : "Add pieces"}
                </button>
              </div>
            </div>
          </>
        )}

        {sheetCard && (
          <ColourSheet
            title={`${sheetCard.name}: your colours`}
            picked={[...(picked[sheetCard.id] ?? []), ...ownedColours(sheetCard, items)]}
            onToggle={(c) => {
              if (!ownedColours(sheetCard, items).includes(c)) toggleColour(sheetCard, c);
            }}
            onClose={() => setSheetCard(null)}
          />
        )}
      </div>

      <div className="setup-phone">
        <div className="page-head">
          <span className="eyebrow">Your wardrobe</span>
          <h1 className="display page-title">Tick what you own</h1>
        </div>
        <p className="setup-help">This page is made for a laptop. On a phone, swipe through the basics instead.</p>
        <div className="actions">
          <Link href="/start" className="btn">
            Swipe the basics
          </Link>
        </div>
      </div>
    </>
  );
}

function SetupTile({
  card,
  ticked,
  owned,
  onTile,
  onColour,
  onMore,
}: {
  card: StarterCard;
  ticked: ColorName[];
  owned: ColorName[];
  onTile: (owned: ColorName[]) => void;
  onColour: (c: ColorName) => void;
  onMore: () => void;
}) {
  const on = ticked.length > 0;
  const shownColour = ticked[ticked.length - 1] ?? card.colors[0]!;
  const piece = starterItem(card, shownColour);
  // The card's own colours, then any others ticked or already owned.
  const dots = [...card.colors, ...[...owned, ...ticked].filter((c, i, all) => !card.colors.includes(c) && all.indexOf(c) === i)];
  const noneFree = !on && card.colors.every((c) => owned.includes(c));
  return (
    <li className={`tile setup-tile${on ? " on" : ""}`}>
      {on && (
        <span className="setup-tick" aria-hidden="true">
          ✓
        </span>
      )}
      <button type="button" className="setup-main" aria-pressed={on} aria-describedby={`note-${card.id}`} disabled={noneFree} onClick={() => onTile(owned)}>
        <span className="setup-art">
          <GarmentTile item={piece} decorative />
        </span>
        <span className="tile-name">{card.name}</span>
      </button>
      <p id={`note-${card.id}`} className="setup-note">
        {card.note}
      </p>
      {(owned.length > 0 || ticked.length > 0) && (
        <p className="tile-meta setup-caption">
          {owned.length > 0 && <span>In your wardrobe</span>}
          {ticked.length > 0 && <span className="setup-ticked">Ticked: {ticked.join(", ")}</span>}
        </p>
      )}
      <div className="setup-dots" role="group" aria-label={`${card.name}: colours`}>
        {dots.map((c) => {
          const isOwned = owned.includes(c);
          return (
            <button
              key={c}
              type="button"
              className={`setup-dot${isOwned ? " owned" : ""}`}
              aria-pressed={isOwned || ticked.includes(c)}
              aria-label={c}
              title={isOwned ? `${c}, in your wardrobe` : c}
              disabled={isOwned}
              onClick={() => onColour(c)}
            >
              {/* The tick is drawn in the dot, light on dark colours and dark on light, so "ticked" never rests on colour alone. */}
              <span className="colour-dot" style={{ background: PALETTE[c].hex, color: PALETTE[c].lightness < 0.5 ? "#fff" : "#1a1a19" }} aria-hidden="true">
                {(isOwned || ticked.includes(c)) && "✓"}
              </span>
            </button>
          );
        })}
        <button type="button" className="setup-more" aria-label={`Other colours for ${card.name}`} title="Other colours" aria-haspopup="dialog" onClick={onMore}>
          +
        </button>
      </div>
    </li>
  );
}
