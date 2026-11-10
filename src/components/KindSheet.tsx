"use client";

import { useEffect, useRef } from "react";
import { GarmentTile } from "@/components/art/Garment";
import { KINDS, makeItem, SLOT_LABEL } from "@/lib/kinds";
import { usualColour } from "@/lib/starter";
import { KIND_LIST } from "@/lib/tagging";
import type { Kind, Slot } from "@/lib/types";

const SLOTS: Slot[] = ["base", "mid", "outer", "bottom", "shoes"];

/** "heavyweight tee" to "Heavyweight tee". */
export function kindName(k: Kind): string {
  const label = KINDS[k].label;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * Every type, grouped, each drawn: a full-height sheet to pick from, instead
 * of a long native menu. Choosing a type closes it.
 */
export function KindSheet({ title, picked, onPick, onClose }: { title: string; picked: Kind | null; onPick: (k: Kind) => void; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    // Open with the current type in view, not at the top of a long list. The jump is instant ("auto"), so there is no motion to turn off.
    d?.querySelector<HTMLElement>('[aria-pressed="true"]')?.scrollIntoView({ block: "center", behavior: "auto" });
  }, []);

  return (
    <dialog
      ref={ref}
      className="sheet kind-sheet"
      aria-labelledby="kind-sheet-title"
      // React passes a dialog's close up to any dialog around it, so stop it here.
      onClose={(e) => {
        e.stopPropagation();
        onClose();
      }}
      onCancel={(e) => e.stopPropagation()}
    >
      <div className="sheet-head">
        <h2 id="kind-sheet-title" className="display" style={{ fontSize: 24 }}>
          {title}
        </h2>
        <button type="button" className="text-link" onClick={() => ref.current?.close()}>
          Close
        </button>
      </div>
      {SLOTS.map((slot) => (
        <fieldset key={slot} className="kind-group">
          <legend className="label">{SLOT_LABEL[slot]}</legend>
          <div className="kind-grid">
            {KIND_LIST.filter((k) => KINDS[k].slot === slot).map((k) => (
              <button
                key={k}
                type="button"
                className="kind-option"
                aria-pressed={picked === k}
                onClick={() => {
                  onPick(k);
                  ref.current?.close();
                }}
              >
                <span className="plinth kind-art">
                  <GarmentTile item={makeItem({ id: `kind-${k}`, name: kindName(k), kind: k, color: usualColour(k) })} decorative />
                </span>
                <span className="kind-label">{kindName(k)}</span>
              </button>
            ))}
          </div>
        </fieldset>
      ))}
    </dialog>
  );
}
