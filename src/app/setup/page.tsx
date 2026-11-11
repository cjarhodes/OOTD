"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { GarmentTile } from "@/components/art/Garment";
import { ColourSheet } from "@/components/ColourSheet";
import { PALETTE, type ColorName } from "@/lib/palette";
import { countPicked, ownedColours, piecesFor, removalsFor, SETUP_SECTIONS, type Picked } from "@/lib/setup";
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
 * deck at once, with the colours you own ticked. Tick to add, untick a piece
 * you already have to take it out. Nothing is saved until the button is pressed.
 */
export default function SetupPage() {
  const { ready, items, mode, setMode, addPieces, removeItem, personalCount } = useWardrobe();
  const [picked, setPicked] = useState<Picked>({});
  // Colours already in the wardrobe that have been unticked, to take out on save.
  const [removed, setRemoved] = useState<Picked>({});
  const [filter, setFilter] = useState<Filter>("All");
  const [sheetCard, setSheetCard] = useState<StarterCard | null>(null);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState<{ added: number; removed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  const count = countPicked(picked, items);
  const dropping = removalsFor(removed, items).length;
  const flip = (set: typeof setPicked, card: StarterCard, c: ColorName) =>
    set((m) => {
      const now = m[card.id] ?? [];
      return { ...m, [card.id]: now.includes(c) ? now.filter((x) => x !== c) : [...now, c] };
    });

  /** A colour dot: tick or untick it. Unticking one that's already in the wardrobe marks it to be taken out. */
  const toggleColour = (card: StarterCard, c: ColorName, owned: ColorName[]) => flip(owned.includes(c) ? setRemoved : setPicked, card, c);
  /** The picture or name: tick the tile, or untick everything on it. */
  const toggleTile = (card: StarterCard, owned: ColorName[]) => {
    const ticked = picked[card.id] ?? [];
    const out = removed[card.id] ?? [];
    const kept = owned.filter((c) => !out.includes(c));
    if (ticked.length || kept.length) {
      // On: clear the new ticks and untick everything already owned.
      setPicked((m) => ({ ...m, [card.id]: [] }));
      setRemoved((m) => ({ ...m, [card.id]: owned }));
    } else if (out.length) {
      // Off because it was unticked just now: put it back.
      setRemoved((m) => ({ ...m, [card.id]: [] }));
    } else {
      setPicked((m) => ({ ...m, [card.id]: [card.colors[0]!] }));
    }
  };

  async function add() {
    if ((!count && !dropping) || adding) return;
    setAdding(true);
    setError(null);
    try {
      const fresh = piecesFor(picked, items);
      const gone = removalsFor(removed, items);
      if (mode !== "personal") setMode("personal");
      if (fresh.length) await addPieces(fresh.map((item) => ({ item })));
      for (const piece of gone) await removeItem(piece.id);
      setAdded({ added: fresh.length, removed: gone.length });
      setPicked({});
      setRemoved({});
      requestAnimationFrame(() => doneRef.current?.focus());
    } catch {
      setError("These changes couldn’t be saved on this device. Check your wardrobe before trying again.");
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
          <p className="setup-help">Everything most men own, on one page. Tick a piece and the colours you have, untick anything that isn’t yours, and save it all at once.</p>
        </div>

        {!ready ? (
          <p className="label" role="status">
            Loading your wardrobe…
          </p>
        ) : added !== null ? (
          <div className="plinth empty setup-done">
            <h2 className="display" style={{ fontSize: 28, color: "var(--ink)" }} ref={doneRef} tabIndex={-1}>
              {[added.added ? `Added ${pieces(added.added)}` : "", added.removed ? `${added.added ? "removed" : "Removed"} ${pieces(added.removed)}` : ""].filter(Boolean).join(", ")}.
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
                  setRemoved({});
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
                      removed={removed[card.id] ?? []}
                      onTile={(owned) => toggleTile(card, owned)}
                      onColour={(c, owned) => toggleColour(card, c, owned)}
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
                {count || !dropping ? `${pieces(count)} to add` : ""}
                {count && dropping ? " · " : ""}
                {dropping ? `${pieces(dropping)} to remove` : ""}
              </span>
              <div className="setup-bar-actions">
                {(count > 0 || dropping > 0) && (
                  <button
                    type="button"
                    className="btn quiet"
                    onClick={() => {
                      setPicked({});
                      setRemoved({});
                    }}
                  >
                    Undo changes
                  </button>
                )}
                <button type="button" className="btn" disabled={(count === 0 && dropping === 0) || adding} onClick={() => void add()}>
                  {adding ? "Saving…" : dropping ? "Save changes" : count ? `Add ${pieces(count)}` : "Add pieces"}
                </button>
              </div>
            </div>
          </>
        )}

        {sheetCard && (
          <ColourSheet
            title={`${sheetCard.name}: your colours`}
            picked={[...(picked[sheetCard.id] ?? []), ...ownedColours(sheetCard, items).filter((c) => !(removed[sheetCard.id] ?? []).includes(c))]}
            onToggle={(c) => toggleColour(sheetCard, c, ownedColours(sheetCard, items))}
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
  removed,
  onTile,
  onColour,
  onMore,
}: {
  card: StarterCard;
  ticked: ColorName[];
  owned: ColorName[];
  /** Owned colours that have been unticked, to be taken out on save. */
  removed: ColorName[];
  onTile: (owned: ColorName[]) => void;
  onColour: (c: ColorName, owned: ColorName[]) => void;
  onMore: () => void;
}) {
  const kept = owned.filter((c) => !removed.includes(c));
  const going = owned.filter((c) => removed.includes(c));
  const on = ticked.length > 0 || kept.length > 0;
  const shownColour = ticked[ticked.length - 1] ?? kept[0] ?? card.colors[0]!;
  const piece = starterItem(card, shownColour);
  // The card's own colours, then any others ticked or already owned.
  const dots = [...card.colors, ...[...owned, ...ticked].filter((c, i, all) => !card.colors.includes(c) && all.indexOf(c) === i)];
  return (
    <li className={`tile setup-tile${on ? " on" : ""}`}>
      {on && (
        <span className="setup-tick" aria-hidden="true">
          ✓
        </span>
      )}
      <button type="button" className="setup-main" aria-pressed={on} aria-describedby={`note-${card.id}`} onClick={() => onTile(owned)}>
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
          {kept.length > 0 && <span>In your wardrobe: {kept.join(", ")}</span>}
          {ticked.length > 0 && <span className="setup-ticked">Adding: {ticked.join(", ")}</span>}
          {going.length > 0 && <span className="setup-going">Removing: {going.join(", ")}</span>}
        </p>
      )}
      <div className="setup-dots" role="group" aria-label={`${card.name}: colours`}>
        {dots.map((c) => {
          const isOwned = owned.includes(c);
          const isOn = isOwned ? !removed.includes(c) : ticked.includes(c);
          return (
            <button
              key={c}
              type="button"
              className={`setup-dot${isOwned ? " owned" : ""}`}
              aria-pressed={isOn}
              aria-label={c}
              title={isOwned ? (isOn ? `${c}, in your wardrobe. Untick to remove it.` : `${c}, to be removed`) : c}
              onClick={() => onColour(c, owned)}
            >
              {/* The tick is drawn in the dot, light on dark colours and dark on light, so "ticked" never rests on colour alone. */}
              <span className="colour-dot" style={{ background: PALETTE[c].hex, color: PALETTE[c].lightness < 0.5 ? "#fff" : "#1a1a19" }} aria-hidden="true">
                {isOn && "✓"}
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
