"use client";

import { useEffect, useRef, useState } from "react";
import { GarmentTile } from "@/components/art/Garment";
import { ColourSheet } from "@/components/ColourSheet";
import type { ColorName } from "@/lib/palette";
import type { Item } from "@/lib/types";

/**
 * A piece just added from the swipe: change its colour (one pick, from the
 * same colour sheet as everywhere) or take it back out. Both close the sheet.
 */
export function FixPiece({
  piece,
  hide,
  onColour,
  onRemove,
  onClose,
}: {
  piece: Item;
  /** Colours of this card already in the wardrobe, which can't be picked again. */
  hide: ColorName[];
  onColour: (c: ColorName) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [picking, setPicking] = useState(false);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby="fix-piece-title"
      onClose={(e) => {
        e.stopPropagation();
        onClose();
      }}
      onCancel={(e) => e.stopPropagation()}
    >
      <div className="sheet-head">
        <h2 id="fix-piece-title" className="display" style={{ fontSize: 24 }}>
          {piece.name}
        </h2>
        <button type="button" className="text-link" onClick={() => ref.current?.close()}>
          Close
        </button>
      </div>
      <div className="sheet-photo plinth">
        <GarmentTile item={piece} decorative />
      </div>
      <div className="actions">
        <button type="button" className="btn" aria-haspopup="dialog" onClick={() => setPicking(true)}>
          Change colour
        </button>
        <button type="button" className="btn alt" onClick={onRemove}>
          Remove
        </button>
      </div>
      {picking && (
        <ColourSheet title={`${piece.name}: colour`} single picked={[piece.color]} hide={hide} onToggle={onColour} onClose={() => setPicking(false)} />
      )}
    </dialog>
  );
}
