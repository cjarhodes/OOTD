import { MATERIAL_LABEL } from "@/lib/kinds";
import type { Look } from "@/lib/types";
import { upperLayers } from "@/lib/engine/rules";

/** The Gallery signature: every look captioned like an object in an exhibition. */
export function MuseumLabel({
  look,
  temps,
  worn,
}: {
  look: Look;
  temps?: { low: number; high: number };
  worn: number;
}) {
  const upper = upperLayers(look.pieces);
  const sentence = (names: string[]) =>
    names.map((n, i) => (i === 0 ? n : n.charAt(0).toLowerCase() + n.slice(1))).join(", ");
  const materials = [...new Set(upper.concat(look.pieces.bottom).map((i) => MATERIAL_LABEL[i.material]))];
  return (
    <figure className="museum">
      <figcaption>
        <h2 className="museum-title">{look.name}</h2>
        <p className="museum-pieces">
          {sentence(upper.map((i) => i.name))}. {sentence([look.pieces.bottom.name, look.pieces.shoes.name])}.
        </p>
        <p className="museum-meta">
          {/* Each part keeps together, and a dash travels with the part after it, so a wrap never leaves one dangling. */}
          <span>{materials.join(" · ")}</span>
          {temps && (
            <span className="museum-part">
              {"— "}
              {temps.low}°→{temps.high}°C
            </span>
          )}
          {worn > 0 && <span className="museum-part">{`— Worn ${worn}×`}</span>}
        </p>
      </figcaption>
    </figure>
  );
}
