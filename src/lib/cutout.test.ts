import { describe, expect, it } from "vitest";
import { analysePixels } from "./analyse-core";
import { removeBackground } from "./cutout";
import { nearestColor } from "./palette";
import type { Pixels } from "./pixels";

/** A seeded random, so noise is the same on every run. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

type RGB = [number, number, number];

/**
 * A synthetic garment photo: a T-shaped "tee" (body plus sleeves) on a
 * background, with sensor noise and a soft light falloff like a phone shot.
 */
function photo(opts: { w?: number; h?: number; bg: (x: number, y: number) => RGB; garment: RGB; scale?: number; offsetY?: number }): Pixels {
  const w = opts.w ?? 360;
  const h = opts.h ?? 300;
  const k = opts.scale ?? 1;
  const cx = w / 2;
  const top = h * 0.18 + (opts.offsetY ?? 0);
  const bodyW = w * 0.34 * k;
  const bodyH = h * 0.62 * k;
  const sleeveW = w * 0.2 * k;
  const sleeveH = h * 0.2 * k;
  const rand = rng(7);
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const inBody = Math.abs(x - cx) < bodyW / 2 && y > top && y < top + bodyH;
      const inSleeves = Math.abs(x - cx) < bodyW / 2 + sleeveW && y > top && y < top + sleeveH;
      const base = inBody || inSleeves ? opts.garment : opts.bg(x, y);
      const light = 1 - 0.08 * (Math.hypot(x - cx, y - h / 2) / Math.hypot(cx, h / 2));
      const i = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) data[i + c] = base[c]! * light + (rand() - 0.5) * 10;
      data[i + 3] = 255;
    }
  }
  return { data, width: w, height: h };
}

const plain =
  (c: RGB): ((x: number, y: number) => RGB) =>
  () =>
    c;

function maskShare(alpha: Uint8ClampedArray) {
  let on = 0;
  for (const a of alpha) if (a > 128) on++;
  return on / alpha.length;
}

describe("background removal", () => {
  it("lifts a garment off a plain floor", () => {
    const r = removeBackground(photo({ bg: plain([196, 190, 178]), garment: [40, 70, 150] }));
    expect("alpha" in r).toBe(true);
    if (!("alpha" in r)) return;
    // The tee covers about 26% of the frame.
    expect(maskShare(r.alpha)).toBeGreaterThan(0.2);
    expect(maskShare(r.alpha)).toBeLessThan(0.32);
    // Corners are background, the middle is garment.
    expect(r.alpha[0]).toBe(0);
    expect(r.alpha[150 * 360 + 180]).toBe(255);
  });

  it("separates a white piece from a slightly warmer white wall", () => {
    const r = removeBackground(photo({ bg: plain([228, 222, 210]), garment: [250, 250, 250] }));
    expect("alpha" in r).toBe(true);
  });

  it("follows a wall with uneven light", () => {
    const r = removeBackground(photo({ bg: (x) => [150 + (x / 360) * 60, 145 + (x / 360) * 60, 138 + (x / 360) * 60], garment: [120, 30, 35] }));
    expect("alpha" in r).toBe(true);
    if ("alpha" in r) expect(maskShare(r.alpha)).toBeLessThan(0.35);
  });

  it("keeps a garment that runs off the bottom of the frame", () => {
    const r = removeBackground(photo({ bg: plain([235, 230, 220]), garment: [30, 60, 140], scale: 1.25, offsetY: 30 }));
    expect("alpha" in r).toBe(true);
    if ("alpha" in r) expect(maskShare(r.alpha)).toBeGreaterThan(0.3);
  });

  it("lifts a pair of shoes, side by side", () => {
    const w = 400;
    const h = 300;
    const rand = rng(5);
    const data = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const shoe = y > 150 && y < 205 && ((x > 60 && x < 180) || (x > 220 && x < 340));
        const c = shoe ? [240, 238, 232] : [150, 150, 146];
        const i = (y * w + x) * 4;
        for (let k = 0; k < 3; k++) data[i + k] = c[k]! + (rand() - 0.5) * 12;
        data[i + 3] = 255;
      }
    }
    const r = removeBackground({ data, width: w, height: h });
    expect("alpha" in r).toBe(true);
  });

  it("refuses a close-up where the garment fills the photo", () => {
    const r = removeBackground(photo({ bg: plain([60, 62, 66]), garment: [60, 62, 66] }));
    expect("failure" in r).toBe(true);
  });

  it("refuses a busy background", () => {
    const rand = rng(3);
    const r = removeBackground(photo({ bg: () => [rand() * 255, rand() * 255, rand() * 255], garment: [90, 90, 90] }));
    expect("failure" in r).toBe(true);
  });

  it("reads the colour of the garment, not the floor", () => {
    const a = analysePixels(photo({ bg: plain([196, 190, 178]), garment: [178, 32, 38], scale: 0.7 }));
    expect(a.cutoutColor).toBe("Red");
  });
});

describe("colour names", () => {
  it("matches photographed colours to the nearest swatch by eye", () => {
    expect(nearestColor("#3b3c3e")).toBe("Charcoal");
    expect(nearestColor("#202020")).toBe("Black");
    expect(nearestColor("#ece6d6")).toBe("Ecru");
    expect(nearestColor("#6d6f73")).toBe("Grey");
    expect(nearestColor("#3a4a6a")).toBe("Indigo");
    expect(nearestColor("#4a1f22")).toBe("Burgundy");
    expect(nearestColor("#b51f24")).toBe("Red");
    // A grey never turns sage just for being close in brightness.
    expect(nearestColor("#8a8d90")).toBe("Grey");
  });
});
