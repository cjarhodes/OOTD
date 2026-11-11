"use client";

import { useState } from "react";
import { ColourGrid } from "@/components/ColourSheet";
import { FIT_LABEL, fitsFor, KINDS, MATERIAL_LABEL, SLOT_LABEL } from "@/lib/kinds";
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

export function ItemFields({
  value,
  onChange,
  idPrefix,
  colourNote,
}: {
  value: Draft;
  onChange: (d: Draft) => void;
  idPrefix: string;
  /** Shown beside the colour's name, e.g. "Saved". */
  colourNote?: string;
}) {
  // A piece that already has a type leads with its colour and keeps the long
  // list of types folded away; a new photo asks what it is first.
  const [typeFirst] = useState(value.kind === null);
  const [choosing, setChoosing] = useState(value.kind === null);
  const set = (patch: Partial<Draft>) => {
    const next = { ...value, ...patch };
    // Keep the suggested name in step until it has been typed over.
    if (!next.nameEdited && next.kind) next.name = `${next.color} ${KINDS[next.kind].label}`;
    // A typed name that starts with the old colour ("Navy heavyweight tee") follows the new one.
    else if (patch.color && patch.color !== value.color && next.name.toLowerCase().startsWith(`${value.color.toLowerCase()} `))
      next.name = `${patch.color}${next.name.slice(value.color.length)}`;
    onChange(next);
  };

  const type =
    choosing || !value.kind ? (
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
                  onClick={() => {
                    set({
                      kind: k,
                      material: value.kind === k ? value.material : KINDS[k].material,
                      fit: value.kind === k ? value.fit : KINDS[k].fit,
                      formality: value.kind === k ? value.formality : KINDS[k].formality,
                    });
                    if (!typeFirst) setChoosing(false);
                  }}
                >
                  {KINDS[k].label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </fieldset>
    ) : (
      <div className="field">
        <span className="label" id={`${idPrefix}-type`}>
          What is it?
        </span>
        <button type="button" className="colour-chip chip-current" aria-labelledby={`${idPrefix}-type ${idPrefix}-type-name`} onClick={() => setChoosing(true)}>
          <span id={`${idPrefix}-type-name`}>{KINDS[value.kind].label.charAt(0).toUpperCase() + KINDS[value.kind].label.slice(1)}</span>
          <span className="chip-change">Change</span>
        </button>
      </div>
    );
  const colour = (
    <div className="field">
      <span className="label">
        Colour · {value.color}
        {colourNote && <span role="status"> · {colourNote}</span>}
      </span>
      <ColourGrid label="Colour" picked={[value.color]} onToggle={(c) => set({ color: c })} />
    </div>
  );

  return (
    <div className="fields">
      {typeFirst ? type : colour}
      {typeFirst ? colour : type}

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
          {value.kind && fitsFor(KINDS[value.kind].slot).length > 0 && (
            <label className="field" htmlFor={`${idPrefix}-fit`}>
              <span className="label">Fit</span>
              <select id={`${idPrefix}-fit`} className="input" value={value.fit} onChange={(e) => set({ fit: e.target.value as Draft["fit"] })}>
                {fitsFor(KINDS[value.kind].slot).map((f) => (
                  <option key={f} value={f}>
                    {FIT_LABEL[f]}
                  </option>
                ))}
              </select>
            </label>
          )}
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
