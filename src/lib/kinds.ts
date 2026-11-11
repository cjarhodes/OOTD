import type { Fit, Item, Kind, Material, Neckline, Occasion, Slot } from "./types";

interface KindInfo {
  slot: Slot;
  label: string;
  neckline: Neckline;
  front: "closed" | "open";
  length: number;
  thickness: number;
  warmth: number;
  formality: number;
  material: Material;
  fit: Fit;
  waterproof?: boolean;
  delicate?: boolean;
  /** Only for weekends and travel days: never suggested for work or dinner. */
  casualOnly?: boolean;
  /** Open shoes: warm, dry days only. */
  warmOnly?: boolean;
}

/**
 * Sensible defaults per garment type. New pieces start from these, and the
 * review step (or AI tagging) only needs to correct what is different.
 */
export const KINDS: Record<Kind, KindInfo> = {
  tee: { slot: "base", label: "tee", neckline: "crew", front: "closed", length: 3, thickness: 1, warmth: 1, formality: 1, material: "jersey", fit: "regular" },
  polo: { slot: "base", label: "polo", neckline: "collar", front: "closed", length: 3, thickness: 1, warmth: 1.5, formality: 2, material: "jersey", fit: "regular" },
  oxford: { slot: "base", label: "oxford shirt", neckline: "collar", front: "closed", length: 4, thickness: 1, warmth: 2, formality: 3, material: "cotton", fit: "regular" },
  "camp-shirt": { slot: "base", label: "camp-collar shirt", neckline: "collar", front: "closed", length: 3, thickness: 1, warmth: 1, formality: 2, material: "cotton", fit: "boxy" },
  henley: { slot: "base", label: "henley", neckline: "crew", front: "closed", length: 3, thickness: 1, warmth: 1.5, formality: 1, material: "jersey", fit: "slim" },
  turtleneck: { slot: "base", label: "turtleneck", neckline: "turtle", front: "closed", length: 3, thickness: 2, warmth: 3, formality: 3, material: "knit", fit: "slim" },
  "mock-neck": { slot: "base", label: "mock neck", neckline: "mock", front: "closed", length: 3, thickness: 1, warmth: 2, formality: 3, material: "knit", fit: "slim" },
  "long-sleeve": { slot: "base", label: "long-sleeve tee", neckline: "crew", front: "closed", length: 3, thickness: 1, warmth: 1.5, formality: 1, material: "jersey", fit: "regular" },
  flannel: { slot: "base", label: "flannel shirt", neckline: "collar", front: "closed", length: 4, thickness: 2, warmth: 2.5, formality: 1, material: "cotton", fit: "relaxed" },
  rugby: { slot: "base", label: "rugby shirt", neckline: "collar", front: "closed", length: 3, thickness: 2, warmth: 2, formality: 1, material: "cotton", fit: "relaxed" },

  crewneck: { slot: "mid", label: "crewneck", neckline: "crew", front: "closed", length: 3, thickness: 3, warmth: 3, formality: 2, material: "knit", fit: "regular" },
  "v-neck": { slot: "mid", label: "v-neck", neckline: "v", front: "closed", length: 3, thickness: 2, warmth: 2.5, formality: 3, material: "knit", fit: "regular" },
  cardigan: { slot: "mid", label: "cardigan", neckline: "v", front: "open", length: 3, thickness: 3, warmth: 3, formality: 2, material: "knit", fit: "relaxed" },
  "quarter-zip": { slot: "mid", label: "quarter-zip", neckline: "zip", front: "closed", length: 3, thickness: 3, warmth: 3, formality: 2, material: "knit", fit: "regular" },
  hoodie: { slot: "mid", label: "hoodie", neckline: "hood", front: "closed", length: 3, thickness: 3, warmth: 3, formality: 1, material: "fleece", fit: "relaxed" },
  sweatshirt: { slot: "mid", label: "sweatshirt", neckline: "crew", front: "closed", length: 3, thickness: 3, warmth: 3, formality: 1, material: "fleece", fit: "relaxed" },
  overshirt: { slot: "mid", label: "overshirt", neckline: "collar", front: "open", length: 4, thickness: 2, warmth: 2.5, formality: 2, material: "canvas", fit: "relaxed" },
  gilet: { slot: "mid", label: "gilet", neckline: "zip", front: "open", length: 3, thickness: 2, warmth: 2, formality: 2, material: "technical", fit: "regular" },
  fleece: { slot: "mid", label: "zip fleece", neckline: "zip", front: "closed", length: 3, thickness: 3, warmth: 3.5, formality: 1, material: "fleece", fit: "relaxed" },

  "chore-coat": { slot: "outer", label: "chore coat", neckline: "lapel", front: "open", length: 4, thickness: 3, warmth: 3, formality: 2, material: "canvas", fit: "boxy" },
  "waxed-jacket": { slot: "outer", label: "waxed jacket", neckline: "collar", front: "open", length: 4, thickness: 4, warmth: 4, formality: 2, material: "waxed", waterproof: true, fit: "regular" },
  blazer: { slot: "outer", label: "blazer", neckline: "lapel", front: "open", length: 4, thickness: 3, warmth: 2.5, formality: 4, material: "wool", fit: "regular" },
  bomber: { slot: "outer", label: "bomber", neckline: "zip", front: "open", length: 2, thickness: 3, warmth: 4, formality: 1, material: "technical", fit: "boxy" },
  "rain-shell": { slot: "outer", label: "rain shell", neckline: "zip", front: "open", length: 4, thickness: 2, warmth: 2, formality: 1, material: "technical", waterproof: true, fit: "relaxed" },
  overcoat: { slot: "outer", label: "overcoat", neckline: "lapel", front: "open", length: 5, thickness: 5, warmth: 6, formality: 4, material: "wool", fit: "relaxed" },
  puffer: { slot: "outer", label: "puffer", neckline: "zip", front: "open", length: 3, thickness: 5, warmth: 7, formality: 1, material: "technical", waterproof: true, fit: "boxy" },
  // Cropped and thick enough to go over a hoodie.
  "denim-jacket": { slot: "outer", label: "denim jacket", neckline: "collar", front: "open", length: 2, thickness: 3, warmth: 2.5, formality: 1, material: "denim", fit: "boxy" },

  jeans: { slot: "bottom", label: "jeans", neckline: "crew", front: "closed", length: 5, thickness: 2, warmth: 0, formality: 1, material: "denim", fit: "regular" },
  chinos: { slot: "bottom", label: "chinos", neckline: "crew", front: "closed", length: 5, thickness: 2, warmth: 0, formality: 2, material: "cotton", fit: "regular" },
  trousers: { slot: "bottom", label: "trousers", neckline: "crew", front: "closed", length: 5, thickness: 2, warmth: 0, formality: 4, material: "wool", fit: "regular" },
  shorts: { slot: "bottom", label: "shorts", neckline: "crew", front: "closed", length: 2, thickness: 1, warmth: 0, formality: 1, material: "cotton", fit: "regular" },
  cargos: { slot: "bottom", label: "cargo trousers", neckline: "crew", front: "closed", length: 5, thickness: 2, warmth: 0, formality: 1, material: "cotton", fit: "relaxed" },
  sweatpants: { slot: "bottom", label: "sweatpants", neckline: "crew", front: "closed", length: 5, thickness: 2, warmth: 0, formality: 1, material: "fleece", fit: "relaxed", casualOnly: true },

  sneakers: { slot: "shoes", label: "sneakers", neckline: "crew", front: "closed", length: 1, thickness: 1, warmth: 0, formality: 2, material: "leather", fit: "regular" },
  runners: { slot: "shoes", label: "runners", neckline: "crew", front: "closed", length: 1, thickness: 1, warmth: 0, formality: 1, material: "technical", fit: "regular" },
  loafers: { slot: "shoes", label: "loafers", neckline: "crew", front: "closed", length: 1, thickness: 1, warmth: 0, formality: 4, material: "suede", delicate: true, fit: "regular" },
  boots: { slot: "shoes", label: "boots", neckline: "crew", front: "closed", length: 1, thickness: 1, warmth: 0, formality: 3, material: "leather", waterproof: true, fit: "regular" },
  canvas: { slot: "shoes", label: "canvas sneakers", neckline: "crew", front: "closed", length: 1, thickness: 1, warmth: 0, formality: 1, material: "canvas", fit: "regular" },
  "high-tops": { slot: "shoes", label: "high-tops", neckline: "crew", front: "closed", length: 1, thickness: 1, warmth: 0, formality: 1, material: "canvas", fit: "regular" },
  trail: { slot: "shoes", label: "trail shoes", neckline: "crew", front: "closed", length: 1, thickness: 1, warmth: 0, formality: 1, material: "technical", fit: "regular" },
  sandals: { slot: "shoes", label: "sandals", neckline: "crew", front: "closed", length: 1, thickness: 1, warmth: 0, formality: 1, material: "leather", fit: "regular", casualOnly: true, warmOnly: true, delicate: true },
  clogs: { slot: "shoes", label: "clogs", neckline: "crew", front: "closed", length: 1, thickness: 1, warmth: 0, formality: 2, material: "suede", fit: "regular", delicate: true },
};

export const SLOT_LABEL: Record<Slot, string> = {
  base: "Base",
  mid: "Mid",
  outer: "Outer",
  bottom: "Bottoms",
  shoes: "Shoes",
};

export const MATERIAL_LABEL: Record<Material, string> = {
  cotton: "Cotton",
  linen: "Linen",
  denim: "Denim",
  jersey: "Jersey",
  knit: "Knit",
  wool: "Wool",
  fleece: "Fleece",
  corduroy: "Corduroy",
  suede: "Suede",
  leather: "Leather",
  waxed: "Waxed cotton",
  technical: "Technical",
  canvas: "Canvas",
};

/** Build a complete item from a kind plus the fields that differ from its defaults. */
export function makeItem(
  fields: Pick<Item, "id" | "name" | "kind" | "color"> & Partial<Omit<Item, "id" | "name" | "kind" | "color">>,
): Item {
  const info = KINDS[fields.kind];
  return {
    slot: info.slot,
    material: info.material,
    pattern: "solid",
    neckline: info.neckline,
    front: info.front,
    length: info.length,
    thickness: info.thickness,
    warmth: info.warmth,
    formality: info.formality,
    boldness: 0,
    fit: info.fit,
    waterproof: info.waterproof ?? false,
    delicate: info.delicate ?? false,
    status: "available",
    ...fields,
  };
}

/** Loungewear (sweatpants) is for weekends and travel days only. */
export function suitsOccasion(item: Pick<Item, "kind">, occasion: Occasion): boolean {
  return !KINDS[item.kind]?.casualOnly || occasion === "weekend" || occasion === "travel";
}

/** Pieces in use in the wardrobe: everything but the archive. */
export function isOwned(item: Pick<Item, "status">): boolean {
  return item.status !== "archived";
}

/** A piece's cut: its own, or its kind's default for pieces saved before fit existed. */
export function fitOf(item: Pick<Item, "kind" | "fit">): Fit {
  return item.fit ?? KINDS[item.kind].fit;
}

export const FIT_LABEL: Record<Fit, string> = { slim: "Slim", regular: "Regular", relaxed: "Relaxed", boxy: "Boxy", wide: "Wide" };

/** The fits that make sense for a slot. */
export function fitsFor(slot: Slot): Fit[] {
  if (slot === "shoes") return [];
  if (slot === "bottom") return ["slim", "regular", "relaxed", "wide"];
  return ["slim", "regular", "relaxed", "boxy"];
}

/** An early starter deck saved names like "White white leather sneakers"; read them as "White leather sneakers". */
export function tidyName(name: string): string {
  return name.replace(/^(\p{L}+) \1\b/iu, "$1");
}
