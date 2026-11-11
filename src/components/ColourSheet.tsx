"use client";

import { useEffect, useRef } from "react";
import { COLOR_NAMES, PALETTE, type ColorFamily, type ColorName } from "@/lib/palette";

/** Families in the order a person looks for a colour: whites, greys, browns, blues, greens, then the brights. */
const FAMILIES: ColorFamily[] = ["white", "grey", "black", "brown", "blue", "green", "red", "pink", "yellow"];
const ORDER: ColorName[] = FAMILIES.flatMap((f) => COLOR_NAMES.filter((c) => PALETTE[c].family === f));

/**
 * Every colour on one screen: a swatch with its name beneath, five across, so
 * a thumb reaches any of them without scrolling.
 */
export function ColourGrid({ label, picked, onToggle }: { label: string; picked: ColorName[]; onToggle: (c: ColorName) => void }) {
  return (
    <div className="colour-swatches" role="group" aria-label={label}>
      {ORDER.map((c) => (
        <button key={c} type="button" className="colour-swatch" aria-pressed={picked.includes(c)} onClick={() => onToggle(c)}>
          <span className="colour-dot" style={{ background: PALETTE[c].hex }} aria-hidden="true" />
          {c}
        </button>
      ))}
    </div>
  );
}

/** The colour grid in a sheet of its own, for places with no room to show it inline. */
export function ColourSheet({
  title,
  picked,
  onToggle,
  onClose,
  single = false,
}: {
  title: string;
  picked: ColorName[];
  onToggle: (c: ColorName) => void;
  onClose: () => void;
  /** Pick one colour: choosing it closes the sheet. */
  single?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      className="sheet colour-sheet"
      aria-labelledby="colour-sheet-title"
      // React passes a dialog's close up to any dialog around it (the piece editor), so stop it here.
      onClose={(e) => {
        e.stopPropagation();
        onClose();
      }}
      onCancel={(e) => e.stopPropagation()}
    >
      <div className="sheet-head">
        <h2 id="colour-sheet-title" className="display" style={{ fontSize: 24 }}>
          {title}
        </h2>
        <button type="button" className="text-link" onClick={onClose}>
          Done
        </button>
      </div>
      {!single && <p className="setting-note">{picked.length ? `${picked.length} picked. Tap a colour again to remove it.` : "Tap every colour you own."}</p>}
      <ColourGrid
        label={title}
        picked={picked}
        onToggle={(c) => {
          onToggle(c);
          if (single) ref.current?.close();
        }}
      />
      {!single && (
        <button type="button" className="btn colour-done" onClick={onClose}>
          {picked.length ? `Done · ${picked.length} picked` : "Done"}
        </button>
      )}
    </dialog>
  );
}
