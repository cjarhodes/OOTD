import type { ColorName } from "./palette";
import type { Item } from "./types";

/**
 * "Add another colour" on a piece without a photo: the same piece in more
 * colours. Pure helpers for which colours to offer and what the copies are.
 */

/** The name without its leading colour: "Navy merino crewneck" to "merino crewneck". A name that doesn't start with its colour is kept whole. */
function pattern(name: string, color: ColorName): string {
  const n = name.trim().toLowerCase();
  const c = color.toLowerCase();
  return n === c ? "" : n.startsWith(`${c} `) ? n.slice(c.length + 1).trim() : n;
}

/** The colours the wardrobe already has for this piece: the same type with the same name apart from its colour, the piece itself included. */
export function takenColours(item: Item, items: readonly Item[]): ColorName[] {
  const want = pattern(item.name, item.color);
  const colours = new Set<ColorName>([item.color]);
  for (const i of items) if (i.kind === item.kind && pattern(i.name, i.color) === want) colours.add(i.color);
  return [...colours];
}

/** The name in its new colour when it starts with the old one ("Navy crewneck" to "Grey crewneck"); any other name is unchanged. */
export function renamedFor(name: string, from: ColorName, to: ColorName): string {
  const trimmed = name.trim();
  const rest = pattern(trimmed, from);
  const starts = trimmed.toLowerCase() === from.toLowerCase() || trimmed.toLowerCase().startsWith(`${from.toLowerCase()} `);
  return starts ? (rest ? `${to} ${rest}` : to) : name;
}

/** One copy of the piece per colour, each with a new id from `makeId`: the same details, not in the wash, in its own colour. Colours the wardrobe already has are skipped. */
export function copiesInColours(item: Item, colours: readonly ColorName[], items: readonly Item[], makeId: () => string): Item[] {
  const taken = new Set(takenColours(item, items));
  const out: Item[] = [];
  for (const c of colours) {
    if (taken.has(c)) continue;
    taken.add(c);
    const { image: _image, photoHash: _hash, ...rest } = item;
    void _image;
    void _hash;
    out.push({ ...rest, id: makeId(), color: c, name: renamedFor(item.name, item.color, c), status: "available" });
  }
  return out;
}
