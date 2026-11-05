import { GarmentArt } from "./art/Garment";
import type { Pieces } from "@/lib/types";

type Box = [number, number, number, number];

/**
 * Photo cut-outs can't be traced like the illustrations, so photo layers are
 * fanned out like a styled collage: outer behind, base peeking top-left, mid
 * in front, each still readable.
 */
function photoBoxes(p: Pieces): { outer?: Box; base?: Box; mid?: Box } {
  if (p.outer && p.mid) return { outer: [22, 14, 160, 222], base: [34, 8, 116, 150], mid: [96, 62, 128, 164] };
  if (p.outer) return { outer: [22, 14, 168, 226], base: [92, 52, 126, 168] };
  if (p.mid) return { base: [30, 14, 132, 170], mid: [92, 58, 132, 172] };
  return {};
}

/**
 * An editorial flat-lay of a look. Layers are drawn in true order: the outer
 * layer behind, then the base, then the mid layer over it, then the base
 * collar on top so it sits "collar out". Bottoms and shoes sit to the side.
 */
export function FlatLay({ pieces, label, compact = false }: { pieces: Pieces; label: string; compact?: boolean }) {
  const { base, mid, outer, bottom, shoes } = pieces;
  const boxes = photoBoxes(pieces);
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
          <GarmentArt item={outer} box={boxes.outer} />
        </g>
      )}
      <g className="cutout">
        <GarmentArt item={base} box={boxes.base} />
      </g>
      {mid && (
        <g className="cutout">
          <GarmentArt item={mid} box={boxes.mid} />
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
