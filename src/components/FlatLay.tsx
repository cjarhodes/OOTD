import { GarmentArt } from "./art/Garment";
import type { Pieces } from "@/lib/types";

/**
 * An editorial flat-lay of a look. Layers are drawn in true order: the outer
 * layer behind, then the base, then the mid layer over it, then the base
 * collar on top so it sits "collar out". Bottoms and shoes sit to the side.
 */
export function FlatLay({ pieces, label, compact = false }: { pieces: Pieces; label: string; compact?: boolean }) {
  const { base, mid, outer, bottom, shoes } = pieces;
  return (
    <svg
      viewBox={compact ? "30 6 270 252" : "20 0 290 260"}
      role="img"
      aria-label={label}
      className="flatlay"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Each piece casts its own shadow so neighbouring layers stay distinct. */}
      {outer && (
        <g className="cutout">
          <GarmentArt item={outer} />
        </g>
      )}
      <g className="cutout">
        <GarmentArt item={base} />
      </g>
      {mid && (
        <g className="cutout">
          <GarmentArt item={mid} />
        </g>
      )}
      {/* Collar out over a crew or v-neck, or under an open layer. A zip neck keeps it tucked inside. */}
      {mid && (mid.front === "open" || mid.neckline === "crew" || mid.neckline === "v") && (
        <g className="cutout">
          <GarmentArt item={base} part="top" />
        </g>
      )}
      <g className="cutout">
        <GarmentArt item={bottom} />
      </g>
      <g className="cutout">
        <GarmentArt item={shoes} />
      </g>
    </svg>
  );
}
