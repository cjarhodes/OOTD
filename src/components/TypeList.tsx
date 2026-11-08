"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GarmentTile } from "@/components/art/Garment";
import { ColourSheet } from "@/components/ColourSheet";
import { KINDS, SLOT_LABEL } from "@/lib/kinds";
import { PALETTE, type ColorName } from "@/lib/palette";
import { KIND_LIST } from "@/lib/tagging";
import { parseList, typedItem, type TypedPiece } from "@/lib/typed";
import type { Kind, Slot } from "@/lib/types";
import { newId, useWardrobe } from "@/state/wardrobe";

const SLOTS: Slot[] = ["base", "mid", "outer", "bottom", "shoes"];

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
  // Corrections, by the line's text, so they survive edits to other lines.
  const [fixes, setFixes] = useState<Record<string, { kind?: Kind; color?: ColorName }>>({});
  const [picking, setPicking] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const rows: TypedPiece[] = useMemo(() => parseList(text).map((p) => ({ ...p, ...fixes[p.name], colorGuessed: p.colorGuessed && !fixes[p.name]?.color })), [text, fixes]);
  const missing = rows.filter((r) => !r.kind).length;
  const fix = (name: string, patch: { kind?: Kind; color?: ColorName }) => setFixes((f) => ({ ...f, [name]: { ...f[name], ...patch } }));

  async function add() {
    if (!rows.length || missing || saving) return;
    setSaving(true);
    await addPieces(rows.map((r) => ({ item: typedItem({ ...r, kind: r.kind! }, newId()) })));
    onAdded(rows.length);
  }

  const pickingRow = picking ? rows.find((r) => r.name === picking) : undefined;

  return (
    <dialog
      ref={ref}
      className="sheet type-list"
      aria-labelledby="type-list-title"
      onClose={(e) => {
        e.stopPropagation();
        onClose();
      }}
      onCancel={(e) => e.stopPropagation()}
    >
      <div className="sheet-head">
        <h2 id="type-list-title" className="display" style={{ fontSize: 26 }}>
          Type a list
        </h2>
        <button type="button" className="text-link" onClick={onClose}>
          Close
        </button>
      </div>
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
          {rows.map((r, i) => (
            <li key={`${i}-${r.name}`} className="typed-row">
              <div className="plinth typed-art">{r.kind ? <GarmentTile item={typedItem({ ...r, kind: r.kind }, `preview-${r.name}`)} decorative /> : <span aria-hidden="true">?</span>}</div>
              <div className="typed-text">
                <span className="typed-name">{r.name}</span>
                <span className="typed-controls">
                  <select
                    className="input typed-kind"
                    aria-label={`Type of ${r.name}`}
                    value={r.kind ?? ""}
                    aria-invalid={!r.kind}
                    onChange={(e) => fix(r.name, { kind: e.target.value as Kind })}
                  >
                    {!r.kind && <option value="">Pick a type</option>}
                    {SLOTS.map((slot) => (
                      <optgroup key={slot} label={SLOT_LABEL[slot]}>
                        {KIND_LIST.filter((k) => KINDS[k].slot === slot).map((k) => (
                          <option key={k} value={k}>
                            {KINDS[k].label.charAt(0).toUpperCase() + KINDS[k].label.slice(1)}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <button type="button" className="colour-chip" aria-label={`Colour of ${r.name}: ${r.color}. Change`} aria-haspopup="dialog" onClick={() => setPicking(r.name)}>
                    <span className="colour-dot" style={{ background: PALETTE[r.color].hex }} aria-hidden="true" />
                    {r.color}
                    {r.colorGuessed && <span className="typed-guess">guessed</span>}
                  </button>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <button type="button" className="btn" onClick={() => void add()} disabled={!rows.length || missing > 0 || saving}>
        {!rows.length ? "Add pieces" : missing ? `Pick a type for ${missing === 1 ? "one piece" : `${missing} pieces`}` : `Add ${rows.length} ${rows.length === 1 ? "piece" : "pieces"}`}
      </button>
      <p className="setting-note">They’re drawn for now. Add a photo of any of them later from its sheet.</p>

      {pickingRow && (
        <ColourSheet title={pickingRow.name} single picked={[pickingRow.color]} onToggle={(c) => fix(pickingRow.name, { color: c })} onClose={() => setPicking(null)} />
      )}
    </dialog>
  );
}
