import { nearestColor, type ColorName } from "./palette";

/** RGBA pixel data, as from CanvasRenderingContext2D.getImageData. */
export interface Pixels {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface AlphaInfo {
  /** Share of pixels that are (nearly) fully transparent. */
  transparent: number;
  /** Bounding box of visible pixels, or null if the image is empty. */
  bounds: { x: number; y: number; width: number; height: number } | null;
}

/** Find how much of an image is transparent and where the visible subject sits. */
export function alphaInfo({ data, width, height }: Pixels, threshold = 16): AlphaInfo {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let clear = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = data[(y * width + x) * 4 + 3]!;
      if (a <= threshold) {
        clear++;
        continue;
      }
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  const total = width * height || 1;
  return {
    transparent: clear / total,
    bounds: maxX < 0 ? null : { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 },
  };
}

/** A cut-out has a meaningful transparent background around the subject. */
export function isCutout(info: AlphaInfo): boolean {
  return info.transparent >= 0.04 && info.bounds !== null;
}

/**
 * The garment's main colour: a small k-means over the visible pixels, taking
 * the largest cluster. Without transparency, only the centre of the frame is
 * sampled so a background is less likely to win.
 */
export function dominantColor(px: Pixels, useAlpha: boolean): { hex: string; name: ColorName } {
  const samples: [number, number, number][] = [];
  const step = Math.max(1, Math.floor(Math.sqrt((px.width * px.height) / 4000)));
  const x0 = useAlpha ? 0 : Math.floor(px.width * 0.25);
  const x1 = useAlpha ? px.width : Math.ceil(px.width * 0.75);
  const y0 = useAlpha ? 0 : Math.floor(px.height * 0.2);
  const y1 = useAlpha ? px.height : Math.ceil(px.height * 0.8);
  for (let y = y0; y < y1; y += step) {
    for (let x = x0; x < x1; x += step) {
      const i = (y * px.width + x) * 4;
      if (useAlpha && px.data[i + 3]! < 200) continue;
      samples.push([px.data[i]!, px.data[i + 1]!, px.data[i + 2]!]);
    }
  }
  if (samples.length === 0) return { hex: "#8d929c", name: "Grey" };

  const k = Math.min(3, samples.length);
  // Deterministic seeds spread across the sample list.
  let centres = Array.from({ length: k }, (_, i) => samples[Math.floor((i * samples.length) / k)]!);
  let counts = new Array<number>(k).fill(0);
  for (let iter = 0; iter < 8; iter++) {
    const sums = Array.from({ length: k }, () => [0, 0, 0]);
    counts = new Array<number>(k).fill(0);
    for (const s of samples) {
      let best = 0;
      let bestD = Infinity;
      for (let c = 0; c < k; c++) {
        const cc = centres[c]!;
        const d = (s[0] - cc[0]) ** 2 + (s[1] - cc[1]) ** 2 + (s[2] - cc[2]) ** 2;
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      counts[best]!++;
      const sum = sums[best]!;
      sum[0]! += s[0];
      sum[1]! += s[1];
      sum[2]! += s[2];
    }
    centres = centres.map((c, i) =>
      counts[i] ? ([sums[i]![0]! / counts[i]!, sums[i]![1]! / counts[i]!, sums[i]![2]! / counts[i]!] as [number, number, number]) : c,
    );
  }
  let largest = 0;
  for (let c = 1; c < k; c++) if (counts[c]! > counts[largest]!) largest = c;
  const [r, g, b] = centres[largest]!.map((v) => Math.round(v)) as [number, number, number];
  const hex = `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  return { hex, name: nearestColor(hex) };
}
