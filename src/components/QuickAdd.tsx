"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GarmentTile } from "@/components/art/Garment";
import { ColourSheet } from "@/components/ColourSheet";
import { SLOT_LABEL } from "@/lib/kinds";
import { PALETTE, type ColorName } from "@/lib/palette";
import { addedNote, addLabel, colourOptions, defaultPick, filterCards, groupDeck, offerFor, ownedColours, togglePick } from "@/lib/quickadd";
import { starterItem, STARTER_DECK, type StarterCard } from "@/lib/starter";
import { typedItem } from "@/lib/typed";
import { newId, useWardrobe } from "@/state/wardrobe";

/** Each card drawn in its first colour, made once. */
const CARD_ITEMS = new Map(STARTER_DECK.map((c) => [c.id, starterItem(c)]));

/**
 * Add a common piece in a few taps, without a photo. Step one: pick the piece
 * from the starter deck's cards (or type a name). Step two: pick its colours.
 * Adding uses the swipe deck's own ids, so a piece can't be added twice.
 * After each add it goes back to step one, so several can be added in a row.
 */
export function QuickAdd({ onClose }: { onClose: (added: number) => void }) {
  const { items, addPieces } = useWardrobe();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  const [query, setQuery] = useState("");
  const [card, setCard] = useState<StarterCard | null>(null);
  const [picked, setPicked] = useState<ColorName[]>([]);
  const [otherOpen, setOtherOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [total, setTotal] = useState(0);

  const groups = useMemo(() => groupDeck(filterCards(STARTER_DECK, query)), [query]);
  const offer = useMemo(() => offerFor(query), [query]);
  const owned = useMemo(() => (card ? ownedColours(card, items) : []), [card, items]);

  const finish = () => onClose(total);

  function choose(c: StarterCard) {
    setCard(c);
    setPicked(defaultPick(c, ownedColours(c, items)));
    setNote(null);
    setFailed(false);
  }

  async function save(pieces: { name: string; make: () => ReturnType<typeof starterItem> }[]) {
    if (!pieces.length || saving) return false;
    setSaving(true);
    setFailed(false);
    try {
      const made = pieces.map((p) => p.make());
      await addPieces(made.map((item) => ({ item })));
      setTotal((t) => t + made.length);
      setNote(addedNote(made.map((m) => m.name)));
      return true;
    } catch {
      setFailed(true);
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function addPicked() {
    if (!card) return;
    const c = card;
    const ok = await save(picked.map((colour) => ({ name: starterItem(c, colour).name, make: () => starterItem(c, colour) })));
    if (ok) {
      setCard(null);
      setPicked([]);
    }
  }

  async function addOffer() {
    if (!offer) return;
    const piece = offer.piece;
    const ok = await save([{ name: piece.name, make: () => typedItem(piece, newId()) }]);
    if (ok) setQuery("");
  }

  const options = card ? colourOptions(card, owned, picked) : [];

  return (
    <dialog
      ref={ref}
      className="sheet quick-add"
      aria-labelledby="quick-add-title"
      onClose={(e) => {
        e.stopPropagation();
        finish();
      }}
      onCancel={(e) => e.stopPropagation()}
    >
      <div className="sheet-head">
        <h2 id="quick-add-title" className="display" style={{ fontSize: 26 }}>
          {card ? card.name : "Quick add"}
        </h2>
        <button type="button" className="text-link" onClick={() => ref.current?.close()}>
          {total > 0 ? "Done" : "Close"}
        </button>
      </div>

      {note && (
        <p className="typed-note" role="status">
          {note}
        </p>
      )}
      {failed && (
        <p className="typed-note" role="alert">
          Couldn’t add that. Try again.
        </p>
      )}

      {!card ? (
        <>
          <label className="field" htmlFor="quick-add-search">
            <span className="label">What is it? Search, or type a name</span>
            <input
              id="quick-add-search"
              type="search"
              className="input"
              value={query}
              autoComplete="off"
              placeholder="Tee, loafers, sambas…"
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          {offer && (
            <button type="button" className="btn alt quick-offer" onClick={() => void addOffer()} disabled={saving}>
              {offer.label}
            </button>
          )}
          {groups.map((g) => (
            <fieldset key={g.slot} className="kind-group">
              <legend className="label">{SLOT_LABEL[g.slot]}</legend>
              <div className="kind-grid">
                {g.cards.map((c) => (
                  <button key={c.id} type="button" className="kind-option" onClick={() => choose(c)}>
                    <span className="plinth kind-art">
                      <GarmentTile item={CARD_ITEMS.get(c.id)!} decorative />
                    </span>
                    <span className="kind-label">{c.name}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          ))}
          {groups.length === 0 && !offer && <p className="setting-note">Nothing matches. Try another word, or use Type a list.</p>}
        </>
      ) : (
        <>
          <p className="setting-note">Which colours? Tap every one you have.</p>
          <div className="colour-grid quick-colours" role="group" aria-label={`Colours of ${card.name}`}>
            {options.map((c) => {
              const have = owned.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  className="colour-option"
                  aria-pressed={have || picked.includes(c)}
                  disabled={have}
                  onClick={() => setPicked((p) => togglePick(p, c, owned))}
                >
                  <span className="colour-dot" style={{ background: PALETTE[c].hex }} aria-hidden="true" />
                  <span className="quick-colour-text">
                    {c}
                    {have && <span className="quick-have">In your wardrobe</span>}
                  </span>
                </button>
              );
            })}
          </div>
          <button type="button" className="btn alt" aria-haspopup="dialog" onClick={() => setOtherOpen(true)}>
            Other colour
          </button>
          <div className="actions">
            <button type="button" className="btn" onClick={() => void addPicked()} disabled={!picked.length || saving}>
              {addLabel(picked.length)}
            </button>
            <button type="button" className="btn quiet" onClick={() => setCard(null)}>
              Back
            </button>
          </div>
        </>
      )}

      {otherOpen && card && (
        <ColourSheet title={card.name} picked={picked} onToggle={(c) => setPicked((p) => togglePick(p, c, owned))} onClose={() => setOtherOpen(false)} />
      )}
    </dialog>
  );
}
