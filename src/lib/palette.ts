/**
 * The colour vocabulary for garments. Photos are matched to the nearest swatch,
 * so styling logic works on families and lightness instead of raw pixels.
 */
export type ColorFamily =
  | "white"
  | "brown"
  | "green"
  | "blue"
  | "grey"
  | "black"
  | "red"
  | "yellow"
  | "pink";

export interface Swatch {
  hex: string;
  family: ColorFamily;
  /** Reads as a menswear neutral: it pairs with almost anything. */
  neutral: boolean;
  /** 0 = black, 1 = white. Used for light-to-dark layering. */
  lightness: number;
}

export const PALETTE = {
  White: { hex: "#f4f2ec", family: "white", neutral: true, lightness: 0.96 },
  Ecru: { hex: "#e6dfcf", family: "white", neutral: true, lightness: 0.88 },
  Oatmeal: { hex: "#d8d0c0", family: "brown", neutral: true, lightness: 0.82 },
  Stone: { hex: "#c3bba9", family: "grey", neutral: true, lightness: 0.74 },
  Khaki: { hex: "#b8a582", family: "brown", neutral: true, lightness: 0.66 },
  Camel: { hex: "#a8834a", family: "brown", neutral: true, lightness: 0.55 },
  Brown: { hex: "#6b4a35", family: "brown", neutral: true, lightness: 0.34 },
  Chocolate: { hex: "#4a3226", family: "brown", neutral: true, lightness: 0.24 },
  Sage: { hex: "#8f9a7c", family: "green", neutral: false, lightness: 0.6 },
  Olive: { hex: "#5b6b4e", family: "green", neutral: true, lightness: 0.42 },
  Loden: { hex: "#2f3a2e", family: "green", neutral: true, lightness: 0.24 },
  Forest: { hex: "#2e4a3a", family: "green", neutral: false, lightness: 0.3 },
  Sky: { hex: "#a9bcd0", family: "blue", neutral: true, lightness: 0.76 },
  Denim: { hex: "#4d6a8c", family: "blue", neutral: true, lightness: 0.46 },
  Indigo: { hex: "#2f4466", family: "blue", neutral: true, lightness: 0.3 },
  Navy: { hex: "#1f2a3a", family: "blue", neutral: true, lightness: 0.18 },
  Cobalt: { hex: "#2335c8", family: "blue", neutral: false, lightness: 0.36 },
  Grey: { hex: "#8d929c", family: "grey", neutral: true, lightness: 0.58 },
  Charcoal: { hex: "#3d3f44", family: "grey", neutral: true, lightness: 0.25 },
  Black: { hex: "#1d1d1d", family: "black", neutral: true, lightness: 0.1 },
  Burgundy: { hex: "#6e2d35", family: "red", neutral: false, lightness: 0.27 },
  Rust: { hex: "#9a4a2e", family: "red", neutral: false, lightness: 0.4 },
  Mustard: { hex: "#c39a3a", family: "yellow", neutral: false, lightness: 0.62 },
  Pink: { hex: "#d9a7a4", family: "pink", neutral: false, lightness: 0.74 },
} as const satisfies Record<string, Swatch>;

export type ColorName = keyof typeof PALETTE;

export const COLOR_NAMES = Object.keys(PALETTE) as ColorName[];

export function swatch(name: ColorName): Swatch {
  return PALETTE[name];
}

/** Nearest palette colour to an sRGB hex, by simple Euclidean distance. */
export function nearestColor(hex: string): ColorName {
  const target = hexToRgb(hex);
  let best: ColorName = "Grey";
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const name of COLOR_NAMES) {
    const [r, g, b] = hexToRgb(PALETTE[name].hex);
    const d = (r - target[0]) ** 2 + (g - target[1]) ** 2 + (b - target[2]) ** 2;
    if (d < bestDistance) {
      bestDistance = d;
      best = name;
    }
  }
  return best;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const value = Number.parseInt(clean.length === 3 ? clean.replace(/./g, "$&$&") : clean, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}
