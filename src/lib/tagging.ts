import { KINDS } from "./kinds";
import { COLOR_NAMES, type ColorName } from "./palette";
import type { Fit, Item, Kind, Material, Pattern } from "./types";

/** What AI tagging (or the review form) fills in for one garment. */
export interface Tags {
  name: string;
  kind: Kind;
  color: ColorName;
  material: Material;
  pattern: Pattern;
  fit: Fit;
  formality: number;
  boldness: number;
}

export const KIND_LIST = Object.keys(KINDS) as Kind[];
export const MATERIALS: Material[] = [
  "cotton",
  "linen",
  "denim",
  "jersey",
  "knit",
  "wool",
  "fleece",
  "corduroy",
  "suede",
  "leather",
  "waxed",
  "technical",
  "canvas",
];
export const PATTERNS: Pattern[] = ["solid", "stripe", "check", "print"];
export const FITS: Fit[] = ["slim", "regular", "relaxed", "boxy", "wide"];

/** JSON schema for structured outputs. Every field is required and closed. */
export const TAG_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["name", "kind", "color", "material", "pattern", "fit", "formality", "boldness"],
  properties: {
    name: { type: "string", description: "Short garment name, colour first, e.g. 'Navy lambswool crewneck'. Max 40 characters." },
    kind: { type: "string", enum: KIND_LIST },
    color: { type: "string", enum: COLOR_NAMES, description: "Closest colour from the list." },
    material: { type: "string", enum: MATERIALS },
    pattern: { type: "string", enum: PATTERNS },
    fit: {
      type: "string",
      enum: FITS,
      description: "How it's cut. Tops: slim, regular, relaxed or boxy (wide and cropped). Bottoms: slim, regular, relaxed or wide. Shoes: regular.",
    },
    formality: { type: "integer", enum: [1, 2, 3, 4, 5], description: "1 very casual … 5 formal." },
    boldness: { type: "integer", enum: [0, 1, 2], description: "0 classic, 1 a little interesting, 2 statement piece." },
  },
} as const;

/** Validate untrusted tag JSON (from the model or a client) into Tags, or null. */
export function validateTags(value: unknown): Tags | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.kind !== "string" || !(KIND_LIST as string[]).includes(v.kind)) return null;
  if (typeof v.color !== "string" || !(COLOR_NAMES as string[]).includes(v.color)) return null;
  const kind = v.kind as Kind;
  const material = typeof v.material === "string" && (MATERIALS as string[]).includes(v.material) ? (v.material as Material) : KINDS[kind].material;
  const pattern = typeof v.pattern === "string" && (PATTERNS as string[]).includes(v.pattern) ? (v.pattern as Pattern) : "solid";
  const fit = typeof v.fit === "string" && (FITS as string[]).includes(v.fit) ? fitForSlot(v.fit as Fit, kind) : KINDS[kind].fit;
  const formality = clampInt(v.formality, 1, 5, KINDS[kind].formality);
  const boldness = clampInt(v.boldness, 0, 2, 0);
  const rawName = typeof v.name === "string" ? v.name.replace(/\s+/g, " ").trim().slice(0, 60) : "";
  const name = rawName || defaultName(v.color as ColorName, kind);
  return { name, kind, color: v.color as ColorName, material, pattern, fit, formality, boldness };
}

/** Keep a fit that suits the slot: "wide" is for bottoms, "boxy" for tops. */
export function fitForSlot(fit: Fit, kind: Kind): Fit {
  const slot = KINDS[kind].slot;
  if (slot === "shoes") return "regular";
  if (slot === "bottom" && fit === "boxy") return "wide";
  if (slot !== "bottom" && fit === "wide") return "boxy";
  return fit;
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" ? Math.round(value) : Number.NaN;
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

export function defaultName(color: ColorName, kind: Kind): string {
  return `${color} ${KINDS[kind].label}`;
}

/** Apply tags to an item, resetting kind-derived defaults when the kind changes. */
export function applyTags(item: Item, tags: Tags): Item {
  const info = KINDS[tags.kind];
  const kindChanged = item.kind !== tags.kind;
  return {
    ...item,
    ...tags,
    slot: info.slot,
    ...(kindChanged
      ? {
          neckline: info.neckline,
          front: info.front,
          length: info.length,
          thickness: info.thickness,
          warmth: info.warmth,
          waterproof: info.waterproof ?? false,
          delicate: info.delicate ?? tags.material === "suede",
        }
      : {}),
  };
}
