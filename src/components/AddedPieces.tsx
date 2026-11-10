"use client";

import { GarmentTile } from "@/components/art/Garment";
import type { Added } from "@/lib/deck";

/**
 * The pieces just added, drawn, each a button that opens it to fix its colour
 * or remove it; then the wishes, each with Remove. `compact` is the small grid
 * on the end-of-round panel; otherwise the tiles look like Wardrobe's.
 */
export function AddedPieces({
  pieces,
  wishes,
  onPick,
  onRemoveWish,
  compact = false,
}: {
  pieces: Added[];
  wishes: Added[];
  onPick: (a: Added) => void;
  onRemoveWish: (a: Added) => void;
  compact?: boolean;
}) {
  if (!pieces.length && !wishes.length) return null;
  return (
    <div className={compact ? "added added-compact" : "added"}>
      {pieces.length > 0 && (
        <ul className="added-grid" aria-label="Pieces just added">
          {pieces.map((a) => (
            <li key={a.piece.id}>
              <button type="button" className="added-tile" onClick={() => onPick(a)} aria-label={`${a.piece.name}. Change colour or remove`} aria-haspopup="dialog">
                <GarmentTile item={a.piece} decorative />
                {!compact && <span className="tile-name">{a.piece.name}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {wishes.length > 0 && (
        <ul className="added-wishes" aria-label="On your wishlist">
          {wishes.map((a) => (
            <li key={a.piece.id}>
              <span>{a.piece.name}</span>
              <button type="button" className="text-link" onClick={() => onRemoveWish(a)} aria-label={`Remove ${a.piece.name} from your wishlist`}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
