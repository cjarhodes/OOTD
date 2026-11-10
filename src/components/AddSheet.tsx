"use client";

import { useEffect, useRef } from "react";
import { AddRoutes } from "@/components/AddRoutes";
import type { AddRouteId } from "@/lib/addroutes";

/** What "+ Add" opens on Wardrobe: the four ways to add pieces. */
export function AddSheet({ onClose, onPick }: { onClose: () => void; onPick: Partial<Record<AddRouteId, () => void>> }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      className="sheet add-sheet"
      aria-labelledby="add-sheet-title"
      onClose={(e) => {
        e.stopPropagation();
        onClose();
      }}
      onCancel={(e) => e.stopPropagation()}
    >
      <div className="sheet-head">
        <h2 id="add-sheet-title" className="display" style={{ fontSize: 26 }}>
          Add pieces
        </h2>
        <button type="button" className="text-link" onClick={() => ref.current?.close()}>
          Close
        </button>
      </div>
      <AddRoutes onPick={onPick} />
    </dialog>
  );
}
