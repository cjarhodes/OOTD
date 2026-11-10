"use client";

import { useEffect, useRef } from "react";
import { COLOR_NAMES, PALETTE, type ColorFamily, type ColorName } from "@/lib/palette";

/** The palette in groups a person would look for a colour in. */
const GROUPS: { label: string; families: ColorFamily[] }[] = [
  { label: "Whites and creams", families: ["white"] },
  { label: "Greys and black", families: ["grey", "black"] },
  { label: "Browns and tans", families: ["brown"] },
  { label: "Blues", families: ["blue"] },
  { label: "Greens", families: ["green"] },
  { label: "Reds, pinks and yellows", families: ["red", "pink", "yellow"] },
];

/**
 * Every colour, grouped, with big targets: a full-height sheet that scrolls
 * like the page does, instead of a cramped list inside a swipe card.
 */
export function ColourSheet({
  title,
  picked,
  onToggle,
  onClose,
  single = false,
  hide = [],
}: {
  title: string;
  picked: ColorName[];
  onToggle: (c: ColorName) => void;
  onClose: () => void;
  /** Pick one colour: choosing it closes the sheet. */
  single?: boolean;
  /** Colours not to offer at all (the ones already taken). */
  hide?: ColorName[];
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
      {GROUPS.map((g) => {
        const colours = COLOR_NAMES.filter((c) => g.families.includes(PALETTE[c].family) && !hide.includes(c));
        if (colours.length === 0) return null;
        return (
          <fieldset key={g.label} className="colour-group">
            <legend className="label">{g.label}</legend>
            <div className="colour-grid">
              {colours.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="colour-option"
                  aria-pressed={picked.includes(c)}
                  onClick={() => {
                    onToggle(c);
                    if (single) ref.current?.close();
                  }}
                >
                  <span className="colour-dot" style={{ background: PALETTE[c].hex }} aria-hidden="true" />
                  {c}
                </button>
              ))}
            </div>
          </fieldset>
        );
      })}
      {!single && (
        <button type="button" className="btn colour-done" onClick={onClose}>
          {picked.length ? `Done · ${picked.length} picked` : "Done"}
        </button>
      )}
    </dialog>
  );
}
