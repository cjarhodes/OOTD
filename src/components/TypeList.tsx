"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GarmentTile } from "@/components/art/Garment";
import { ColourSheet } from "@/components/ColourSheet";
import { KINDS, makeItem, SLOT_LABEL } from "@/lib/kinds";
import { PALETTE, type ColorName } from "@/lib/palette";
import { applyTags, KIND_LIST, MAX_LIST_CHARS, type Tags } from "@/lib/tagging";
import { parseList, typedItem, type TypedPiece } from "@/lib/typed";
import type { Kind, Slot } from "@/lib/types";
import { useAI } from "@/state/ai";
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
  // What AI made of the text, kept only while the text is unchanged.
  const ai = useAI();
  const [read, setRead] = useState<{ text: string; pieces: Tags[] } | null>(null);
  const [reading, setReading] = useState(false);
  const [readNote, setReadNote] = useState<string | null>(null);
  const byAI = read?.text === text ? read.pieces : null;

  const rows: (TypedPiece & { tags?: Tags })[] = useMemo(() => {
    const parsed: (TypedPiece & { tags?: Tags })[] = byAI
      ? byAI.map((t) => ({ name: t.name, kind: t.kind, color: t.color, material: t.material, colorGuessed: false, tags: t }))
      : parseList(text);
    return parsed.map((p) => ({ ...p, ...fixes[p.name], colorGuessed: p.colorGuessed && !fixes[p.name]?.color }));
  }, [text, fixes, byAI]);

  async function readWithAI() {
    if (reading || !text.trim()) return;
    setReading(true);
    setReadNote(null);
    const result = await ai.requestList(text);
    setReading(false);
    if ("error" in result) return setReadNote(result.error);
    setRead({ text, pieces: result.pieces });
    setReadNote(`Read by Claude: ${result.pieces.length} ${result.pieces.length === 1 ? "piece" : "pieces"}. Check them over.`);
    void ai.refresh();
  }
  const missing = rows.filter((r) => !r.kind).length;
  const fix = (name: string, patch: { kind?: Kind; color?: ColorName }) => setFixes((f) => ({ ...f, [name]: { ...f[name], ...patch } }));

  async function add() {
    if (!rows.length || missing || saving) return;
    setSaving(true);
    await addPieces(
      rows.map((r) => {
        const id = newId();
        // AI's details (fit, dress level, pattern) hold as long as its type wasn't corrected.
        if (r.tags && r.tags.kind === r.kind) return { item: applyTags(makeItem({ id, name: r.name, kind: r.tags.kind, color: r.color }), { ...r.tags, color: r.color }) };
        return { item: typedItem({ ...r, kind: r.kind! }, id) };
      }),
    );
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
        <span className="label">{ai.canTag ? "Write what you own, any way you like" : "One piece per line, or separated by commas"}</span>
        <textarea
          id="type-list-text"
          className="input type-list-text"
          rows={4}
          maxLength={MAX_LIST_CHARS}
          value={text}
          placeholder={"White Converse high tops\nBrown Birkenstock Arizonas\nNavy merino crewneck"}
          onChange={(e) => setText(e.target.value)}
        />
      </label>

      {ai.canTag && (
        <div className="type-list-ai">
          <button type="button" className="btn alt" onClick={() => void readWithAI()} disabled={reading || !text.trim() || byAI !== null}>
            {reading ? "Reading…" : byAI ? "Read by AI" : "Read with AI"}
          </button>
          <span className="setting-note" role="status">
            {readNote ?? (missing > 0 ? "Some lines weren’t recognised. AI can read brands, models and whole sentences." : "For brands, models or whole sentences.")}
            {ai.left !== null && !readNote ? ` ${ai.left} of ${ai.status.limit} left this month.` : ""}
          </span>
        </div>
      )}
      {!ai.canTag && readNote && (
        <p className="setting-note" role="status">
          {readNote}
        </p>
      )}

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
