"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GarmentTile } from "@/components/art/Garment";
import { ColourSheet } from "@/components/ColourSheet";
import { KindSheet, kindName } from "@/components/KindSheet";
import { LiveRegion, useAnnouncer } from "@/components/LiveRegion";
import { addedMessage, removedMessage } from "@/lib/announce";
import { PALETTE } from "@/lib/palette";
import { typedItem } from "@/lib/typed";
import { addLabel, afterAdding, leftNote, readyRows, rowsOf, withoutRow, type Fix, type Fixes } from "@/lib/typelist";
import { newId, useWardrobe } from "@/state/wardrobe";

/**
 * Add pieces by typing them, one per line or comma: "White Converse high
 * tops, brown Birkenstock Arizonas". Each line is matched to a type and
 * colour, which can be corrected before anything is added. No photos needed;
 * pieces are drawn until a photo is added.
 */
export function TypeList({ onClose, onAdded }: { onClose: () => void; onAdded: (count: number) => void }) {
  const { addPieces } = useWardrobe();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  const [text, setText] = useState("");
  // Corrections, by line, place in the line and name together, so identical lines don't share one.
  const [fixes, setFixes] = useState<Fixes>({});
  const [picking, setPicking] = useState<string | null>(null);
  const [pickingKind, setPickingKind] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Pieces added so far, and whether some lines were left behind for the person to sort out.
  const [addedCount, setAddedCount] = useState(0);
  const [tidied, setTidied] = useState(false);
  const { text: spoken, say } = useAnnouncer();

  const rows = useMemo(() => rowsOf(text, fixes), [text, fixes]);
  const ready = readyRows(rows);
  const note = tidied ? leftNote(rows) : null;
  const fix = (key: string, patch: Fix) => setFixes((f) => ({ ...f, [key]: { ...f[key], ...patch } }));

  // Closing after adding some pieces reports them, so Wardrobe can say what was added.
  const finish = () => (addedCount > 0 ? onAdded(addedCount) : onClose());

  async function add() {
    if (!ready.length || saving) return;
    setSaving(true);
    const made = ready.map((r) => typedItem({ ...r, kind: r.kind! }, newId()));
    await addPieces(made.map((item) => ({ item })));
    const left = afterAdding(text, fixes);
    const total = addedCount + ready.length;
    if (!left.text.trim()) {
      onAdded(total);
      return;
    }
    setAddedCount(total);
    setText(left.text);
    setFixes(left.fixes);
    setTidied(true);
    setSaving(false);
    const stillLeft = leftNote(rowsOf(left.text, left.fixes));
    say(stillLeft ? `${addedMessage(made.map((m) => m.name))}. ${stillLeft}` : addedMessage(made.map((m) => m.name)));
  }

  function remove(key: string) {
    const out = withoutRow(text, fixes, key);
    const gone = rows.find((r) => r.key === key);
    if (gone) say(removedMessage(gone.name));
    setText(out.text);
    setFixes(out.fixes);
  }

  const pickingRow = picking ? rows.find((r) => r.key === picking) : undefined;
  const pickingKindRow = pickingKind ? rows.find((r) => r.key === pickingKind) : undefined;

  return (
    <dialog
      ref={ref}
      className="sheet type-list"
      aria-labelledby="type-list-title"
      onClose={(e) => {
        e.stopPropagation();
        finish();
      }}
      onCancel={(e) => e.stopPropagation()}
    >
      <div className="sheet-head">
        <h2 id="type-list-title" className="display" style={{ fontSize: 26 }}>
          Type a list
        </h2>
        <button type="button" className="text-link" onClick={finish}>
          Close
        </button>
      </div>
      {note && <p className="typed-note">{note}</p>}
      <LiveRegion text={spoken} />
      <label className="field" htmlFor="type-list-text">
        <span className="label">One piece per line, or separated by commas</span>
        <textarea
          id="type-list-text"
          className="input type-list-text"
          rows={4}
          value={text}
          placeholder={"White Converse high tops\nBrown Birkenstock Arizonas\nNavy merino crewneck"}
          onChange={(e) => setText(e.target.value)}
        />
      </label>

      {rows.length > 0 && (
        <ul className="typed-rows" aria-label="Pieces to add">
          {rows.map((r) => (
            <li key={r.key} className="typed-row">
              <div className="plinth typed-art">{r.kind ? <GarmentTile item={typedItem({ ...r, kind: r.kind }, `preview-${r.key}`)} decorative /> : <span aria-hidden="true">?</span>}</div>
              <div className="typed-text">
                <span className="typed-name">{r.name}</span>
                {r.unsupported ? (
                  <span className="typed-reason">{r.unsupported}</span>
                ) : (
                  <span className="typed-controls">
                    <button
                      type="button"
                      className="colour-chip kind-chip"
                      aria-label={r.kind ? `Type of ${r.name}: ${kindName(r.kind)}. Change` : `Type of ${r.name}: not picked. Pick one`}
                      aria-haspopup="dialog"
                      aria-invalid={!r.kind}
                      onClick={() => setPickingKind(r.key)}
                    >
                      {r.kind ? kindName(r.kind) : "Pick a type"}
                    </button>
                    <button
                      type="button"
                      className="colour-chip"
                      aria-label={r.colorMissing ? `Colour of ${r.name}: not picked. Pick one` : `Colour of ${r.name}: ${r.color}. Change`}
                      aria-haspopup="dialog"
                      aria-invalid={r.colorMissing}
                      onClick={() => setPicking(r.key)}
                    >
                      {!r.colorMissing && <span className="colour-dot" style={{ background: PALETTE[r.color].hex }} aria-hidden="true" />}
                      {r.colorMissing ? "Pick a colour" : r.color}
                      {!r.colorMissing && r.colorGuessed && <span className="typed-guess">guessed</span>}
                    </button>
                  </span>
                )}
              </div>
              <button type="button" className="typed-remove" aria-label={`Remove ${r.name}`} onClick={() => remove(r.key)}>
                <span aria-hidden="true">×</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <button type="button" className="btn" onClick={() => void add()} disabled={!ready.length || saving}>
        {addLabel(rows)}
      </button>
      <p className="setting-note">They’re drawn for now. Add a photo of any of them later from its sheet.</p>

      {pickingKindRow && <KindSheet title={pickingKindRow.name} picked={pickingKindRow.kind} onPick={(k) => fix(pickingKindRow.key, { kind: k })} onClose={() => setPickingKind(null)} />}
      {pickingRow && (
        <ColourSheet title={pickingRow.name} single picked={[pickingRow.color]} onToggle={(c) => fix(pickingRow.key, { color: c })} onClose={() => setPicking(null)} />
      )}
    </dialog>
  );
}
