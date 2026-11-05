"use client";

import { KINDS, MATERIAL_LABEL, SLOT_LABEL } from "@/lib/kinds";
import { COLOR_NAMES, PALETTE, type ColorName } from "@/lib/palette";
import { KIND_LIST, MATERIALS, PATTERNS, type Tags } from "@/lib/tagging";
import type { Kind, Slot } from "@/lib/types";

const SLOTS: Slot[] = ["base", "mid", "outer", "bottom", "shoes"];
const FORMALITY = ["Very casual", "Casual", "Smart casual", "Smart", "Formal"];
const BOLDNESS = ["Classic", "A little interesting", "Statement"];

/** The editable description of one piece. `kind` is null until chosen. */
export interface Draft extends Omit<Tags, "kind"> {
  kind: Kind | null;
  nameEdited: boolean;
}

export function ItemFields({ value, onChange, idPrefix }: { value: Draft; onChange: (d: Draft) => void; idPrefix: string }) {
  const set = (patch: Partial<Draft>) => {
    const next = { ...value, ...patch };
    // Keep the suggested name in step until it has been typed over.
    if (!next.nameEdited && next.kind) next.name = `${next.color} ${KINDS[next.kind].label}`;
    onChange(next);
  };

  return (
    <div className="fields">
      <fieldset className="field">
        <legend className="label">What is it?</legend>
        {SLOTS.map((slot) => (
          <div key={slot} className="kind-group">
            <span className="kind-slot">{SLOT_LABEL[slot]}</span>
            <div className="kind-chips">
              {KIND_LIST.filter((k) => KINDS[k].slot === slot).map((k) => (
                <button
                  key={k}
                  type="button"
                  className="chip small"
                  aria-pressed={value.kind === k}
                  onClick={() =>
                    set({
                      kind: k,
                      material: value.kind === k ? value.material : KINDS[k].material,
                      formality: value.kind === k ? value.formality : KINDS[k].formality,
                    })
                  }
                >
                  {KINDS[k].label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </fieldset>

      <fieldset className="field">
        <legend className="label">Colour</legend>
        <div className="swatches">
          {COLOR_NAMES.map((c) => (
            <button
              key={c}
              type="button"
              className="swatch"
              aria-pressed={value.color === c}
              aria-label={c}
              title={c}
              style={{ background: PALETTE[c].hex }}
              onClick={() => set({ color: c as ColorName })}
            />
          ))}
        </div>
        <span className="swatch-name">{value.color}</span>
      </fieldset>

      <label className="field" htmlFor={`${idPrefix}-name`}>
        <span className="label">Name</span>
        <input
          id={`${idPrefix}-name`}
          className="input"
          value={value.name}
          maxLength={60}
          placeholder="e.g. Navy lambswool crewneck"
          onChange={(e) => onChange({ ...value, name: e.target.value, nameEdited: true })}
        />
      </label>

      <details className="more">
        <summary>More details</summary>
        <div className="field-row">
          <label className="field" htmlFor={`${idPrefix}-material`}>
            <span className="label">Material</span>
            <select id={`${idPrefix}-material`} className="input" value={value.material} onChange={(e) => set({ material: e.target.value as Draft["material"] })}>
              {MATERIALS.map((m) => (
                <option key={m} value={m}>
                  {MATERIAL_LABEL[m]}
                </option>
              ))}
            </select>
          </label>
          <label className="field" htmlFor={`${idPrefix}-pattern`}>
            <span className="label">Pattern</span>
            <select id={`${idPrefix}-pattern`} className="input" value={value.pattern} onChange={(e) => set({ pattern: e.target.value as Draft["pattern"] })}>
              {PATTERNS.map((p) => (
                <option key={p} value={p}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <label className="field" htmlFor={`${idPrefix}-formality`}>
            <span className="label">Dress level</span>
            <select id={`${idPrefix}-formality`} className="input" value={value.formality} onChange={(e) => set({ formality: Number(e.target.value) })}>
              {FORMALITY.map((f, i) => (
                <option key={f} value={i + 1}>
                  {f}
                </option>
              ))}
            </select>
          </label>
          <label className="field" htmlFor={`${idPrefix}-boldness`}>
            <span className="label">Character</span>
            <select id={`${idPrefix}-boldness`} className="input" value={value.boldness} onChange={(e) => set({ boldness: Number(e.target.value) })}>
              {BOLDNESS.map((b, i) => (
                <option key={b} value={i}>
                  {b}
                </option>
              ))}
            </select>
          </label>
        </div>
      </details>
    </div>
  );
}
