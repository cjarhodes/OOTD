import { rgbToLab } from "./palette";
import type { Pixels } from "./pixels";

/**
 * Background removal for garment photos, on this device, with no model to
 * download. It is built for how people actually photograph clothes: one piece
 * laid on a floor, bed or table, or hung against a wall. The background is
 * learned from the photo's edges, then grown inwards from them; whatever the
 * edges can't reach is the garment.
 *
 * It refuses (returns a reason) rather than guess when the photo doesn't look
 * like that: the garment fills the frame, or the background is too busy.
 */

export interface CutoutResult {
  /** One alpha value per pixel of the input, 0 = background. */
  alpha: Uint8ClampedArray;
  /** Share of the frame that is garment. */
  coverage: number;
}

export type CutoutFailure = "fills-frame" | "busy-background" | "no-subject";

type Lab = [number, number, number];

/** Box blur of one channel, separable, edges clamped. */
function blur(src: Float32Array, w: number, h: number, r: number): Float32Array {
  if (r < 1) return src;
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  const span = r * 2 + 1;
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let sum = 0;
    for (let i = -r; i <= r; i++) sum += src[row + Math.min(w - 1, Math.max(0, i))]!;
    for (let x = 0; x < w; x++) {
      tmp[row + x] = sum / span;
      sum += src[row + Math.min(w - 1, x + r + 1)]! - src[row + Math.max(0, x - r)]!;
    }
  }
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let i = -r; i <= r; i++) sum += tmp[Math.min(h - 1, Math.max(0, i)) * w + x]!;
    for (let y = 0; y < h; y++) {
      out[y * w + x] = sum / span;
      sum += tmp[Math.min(h - 1, y + r + 1) * w + x]! - tmp[Math.max(0, y - r) * w + x]!;
    }
  }
  return out;
}

/** City-block distance from each pixel to the nearest pixel outside the mask (0 outside, -1 if there is none). */
function distanceToOutside(mask: Uint8Array, w: number, h: number, queue: Int32Array): Int32Array {
  const n = w * h;
  const depth = new Int32Array(n).fill(-1);
  let head = 0;
  let tail = 0;
  for (let i = 0; i < n; i++) {
    if (!mask[i]) {
      depth[i] = 0;
      queue[tail++] = i;
    }
  }
  while (head < tail) {
    const i = queue[head++]!;
    const x = i % w;
    const y = (i - x) / w;
    const neighbours = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1];
    for (const j of neighbours) {
      if (j >= 0 && depth[j]! < 0) {
        depth[j] = depth[i]! + 1;
        queue[tail++] = j;
      }
    }
  }
  return depth;
}

function kmeans(samples: Lab[], k: number): { centres: Lab[]; counts: number[] } {
  let centres: Lab[] = Array.from({ length: k }, (_, i) => samples[Math.floor(((i + 0.5) * samples.length) / k)]!);
  let counts = new Array<number>(k).fill(0);
  for (let iter = 0; iter < 10; iter++) {
    const sums = Array.from({ length: k }, () => [0, 0, 0]);
    counts = new Array<number>(k).fill(0);
    for (const s of samples) {
      const c = nearest(s, centres).index;
      counts[c]!++;
      sums[c]![0]! += s[0];
      sums[c]![1]! += s[1];
      sums[c]![2]! += s[2];
    }
    centres = centres.map((c, i) => (counts[i] ? [sums[i]![0]! / counts[i]!, sums[i]![1]! / counts[i]!, sums[i]![2]! / counts[i]!] : c));
  }
  return { centres, counts };
}

function nearest(p: Lab, centres: Lab[]): { index: number; distance: number } {
  let index = 0;
  let best = Infinity;
  for (let i = 0; i < centres.length; i++) {
    const c = centres[i]!;
    const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2;
    if (d < best) {
      best = d;
      index = i;
    }
  }
  return { index, distance: Math.sqrt(best) };
}

function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]!;
}

/**
 * Separate the garment from its background. Expects a modest image (about
 * 400-600px on the long side); the caller scales the mask up to the photo.
 */
export function removeBackground(px: Pixels, debug?: (info: Record<string, unknown>) => void): CutoutResult | { failure: CutoutFailure } {
  const { width: w, height: h, data } = px;
  const n = w * h;
  // Blur first so carpet, wood grain and fabric weave read as flat colour.
  const radius = Math.max(1, Math.round(Math.max(w, h) / 160));
  const ch = [new Float32Array(n), new Float32Array(n), new Float32Array(n)];
  for (let i = 0; i < n; i++) {
    const [L, a, b] = rgbToLab(data[i * 4]!, data[i * 4 + 1]!, data[i * 4 + 2]!);
    ch[0]![i] = L;
    ch[1]![i] = a;
    ch[2]![i] = b;
  }
  const [L, A, B] = ch.map((c) => blur(c, w, h, radius)) as [Float32Array, Float32Array, Float32Array];
  // Grain: how far each pixel's lightness strays from its blurred neighbourhood.
  const grain = new Float32Array(n);
  for (let i = 0; i < n; i++) grain[i] = Math.abs(ch[0]![i]! - L[i]!);
  const lab = (i: number): Lab => [L[i]!, A[i]!, B[i]!];

  // Learn the background from a band around the edges.
  const band = Math.max(2, Math.round(Math.min(w, h) * 0.025));
  const border: number[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x < band || y < band || x >= w - band || y >= h - band) border.push(y * w + x);
    }
  }
  const step = Math.max(1, Math.floor(border.length / 3000));
  const samples: Lab[] = [];
  for (let i = 0; i < border.length; i += step) samples.push(lab(border[i]!));
  const { centres, counts } = kmeans(samples, 6);
  const total = counts.reduce((s, c) => s + c, 0);
  // Background shows in the corners; a garment running off the frame touches an
  // edge but rarely fills two corners. A colour is background if it holds at
  // least two corners, or one corner and a good share of the edges.
  const c = Math.max(2, Math.round(Math.min(w, h) * 0.06));
  const corners: [number, number][] = [
    [0, 0],
    [w - c, 0],
    [0, h - c],
    [w - c, h - c],
  ];
  const cornerWins = new Array<number>(centres.length).fill(0);
  const vote = (x0: number, y0: number, size: number, sizeY = size) => {
    const votes = new Array<number>(centres.length).fill(0);
    for (let y = y0; y < y0 + sizeY; y++) for (let x = x0; x < x0 + size; x++) votes[nearest(lab(y * w + x), centres).index]!++;
    return votes.indexOf(Math.max(...votes));
  };
  for (const [cx, cy] of corners) cornerWins[vote(cx, cy, c)]!++;
  // The garment is almost always in the middle of the photo. The colour that
  // holds the middle is the garment, even where it runs off an edge, unless it
  // also holds three corners (an off-centre piece on a plain ground).
  const centre = vote(Math.round(w * 0.4), Math.round(h * 0.4), Math.max(1, Math.round(w * 0.2)), Math.max(1, Math.round(h * 0.2)));
  const candidate = centres.map((_, i) => counts[i]! / total >= 0.04 && (i !== centre || cornerWins[i]! >= 3));
  const anchored = centres.map((_, i) => candidate[i]! && (cornerWins[i]! >= 1 || counts[i]! / total >= 0.15));
  // A shade of a corner colour (the shadowed side of the same table) counts too.
  const near = (a: Lab, b: Lab) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < 14;
  let models = centres.filter((c, i) => anchored[i] || (candidate[i] && centres.some((o, j) => anchored[j] && near(c, o))));
  debug?.({ centres: centres.map((c) => c.map(Math.round)), share: counts.map((c) => +(c / total).toFixed(2)), cornerWins, centre });
  if (!models.length) return { failure: "fills-frame" };

  // Each background colour gets its own tolerance from how much it varies along
  // the edge: a plain wall is tight, a patterned rug is loose. A pixel's score is
  // its distance to the nearest background colour in units of that tolerance.
  const assigned: number[][] = models.map(() => []);
  for (const s of samples) {
    // Only edge pixels that belong to a background colour say how much it varies.
    const own = nearest(s, centres);
    const m = models.indexOf(centres[own.index]!);
    if (m >= 0) assigned[m]!.push(own.distance);
  }
  let spreads = assigned.map((d) => percentile(d, 0.85));
  // Drop a background colour that varies wildly (a busy print, a brick wall):
  // it can't be told apart from a garment. Too much of that and we give up.
  const busyShare = assigned.reduce((sum, d, m) => sum + (spreads[m]! > 22 ? d.length : 0), 0) / samples.length;
  if (busyShare > 0.3) return { failure: "busy-background" };
  const calm = spreads.map((sp) => sp <= 22);
  models = models.filter((_, m) => calm[m]);
  spreads = spreads.filter((_, m) => calm[m]);
  if (!models.length) return { failure: "busy-background" };
  const tolerance = spreads.map((sp) => Math.min(24, Math.max(8, sp * 1.6 + 5)));
  const score = (p: Lab) => {
    let best = Infinity;
    for (let m = 0; m < models.length; m++) {
      const c = models[m]!;
      const d = Math.sqrt((p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2) / tolerance[m]!;
      if (d < best) best = d;
    }
    return best;
  };
  const distance = new Float32Array(n);
  for (let i = 0; i < n; i++) distance[i] = score(lab(i));
  const edgeBg = samples.filter((s) => score(s) < 1).length / samples.length;
  debug?.({ spreads: spreads.map((v) => +v.toFixed(1)), edgeBg: +edgeBg.toFixed(2) });
  // Too little of the edge is background: the garment fills the photo.
  if (edgeBg < 0.35) return { failure: "fills-frame" };

  // Grow the background inwards from the edges. A pixel joins if it is close
  // to a background colour, or (for shadows and uneven light) close to the
  // background pixel next to it and not far off a background colour.
  const bg = new Uint8Array(n);
  const queue = new Int32Array(n);
  let head = 0;
  let tail = 0;
  for (const i of border) {
    if (distance[i]! < 1 && !bg[i]) {
      bg[i] = 1;
      queue[tail++] = i;
    }
  }
  const local = 1.6;
  const SHADE = 1.5;
  while (head < tail) {
    const i = queue[head++]!;
    const x = i % w;
    const y = (i - x) / w;
    const neighbours = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1];
    for (const j of neighbours) {
      if (j < 0 || bg[j]) continue;
      const d = distance[j]!;
      let join = d < 1;
      if (!join && d < SHADE) {
        const step = Math.hypot(L[j]! - L[i]!, A[j]! - A[i]!, B[j]! - B[i]!);
        join = step < local;
      }
      if (join) {
        bg[j] = 1;
        queue[tail++] = j;
      }
    }
  }

  // Keep the garment: the largest solid region, plus any large enough to be part of it.
  const label = new Int32Array(n).fill(-1);
  const sizes: number[] = [];
  for (let s = 0; s < n; s++) {
    if (bg[s] || label[s]! >= 0) continue;
    const id = sizes.length;
    let size = 0;
    head = 0;
    tail = 0;
    queue[tail++] = s;
    label[s] = id;
    while (head < tail) {
      const i = queue[head++]!;
      size++;
      const x = i % w;
      const y = (i - x) / w;
      const neighbours = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1];
      for (const j of neighbours) {
        if (j >= 0 && !bg[j] && label[j]! < 0) {
          label[j] = id;
          queue[tail++] = j;
        }
      }
    }
    sizes.push(size);
  }
  if (!sizes.length) return { failure: "no-subject" };
  const largest = Math.max(...sizes);
  const keep = sizes.map((s) => s >= largest * 0.2);
  const mask = new Uint8Array(n);
  let area = 0;
  for (let i = 0; i < n; i++) {
    if (label[i]! >= 0 && keep[label[i]!]) {
      mask[i] = 1;
      area++;
    }
  }
  const depth = distanceToOutside(mask, w, h, queue);
  // Background showing through inside the garment (between an arm and the
  // body, through an open front) is enclosed, so the edge flood can't reach
  // it. Find background-coloured pockets inside the garment.
  const pocket = new Int32Array(n).fill(-1);
  const pockets: { size: number; score: number; pixels: number[]; near: number; grain: number }[] = [];
  for (let s0 = 0; s0 < n; s0++) {
    if (!mask[s0] || distance[s0]! >= 1 || pocket[s0]! >= 0) continue;
    const id = pockets.length;
    const pixels: number[] = [];
    let sum = 0;
    head = 0;
    tail = 0;
    queue[tail++] = s0;
    pocket[s0] = id;
    while (head < tail) {
      const i = queue[head++]!;
      pixels.push(i);
      sum += distance[i]!;
      const x = i % w;
      const y = (i - x) / w;
      const neighbours = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1];
      for (const j of neighbours) {
        if (j >= 0 && mask[j] && distance[j]! < 1 && pocket[j]! < 0) {
          pocket[j] = id;
          queue[tail++] = j;
        }
      }
    }
    let nearest = Infinity;
    let g = 0;
    for (const i of pixels) {
      nearest = Math.min(nearest, depth[i]! < 0 ? Infinity : depth[i]!);
      g += grain[i]!;
    }
    g /= pixels.length;
    pockets.push({ size: pixels.length, score: sum / pixels.length, pixels, near: nearest / Math.min(w, h), grain: g });
  }
  let bgGrain = 0;
  let bgCount = 0;
  for (const i of border) {
    if (bg[i]) {
      bgGrain += grain[i]!;
      bgCount++;
    }
  }
  bgGrain /= Math.max(1, bgCount);
  // A pocket is background showing through when it matches the background in
  // colour and in grain: carpet through the gap under an arm reads as carpet.
  // A white print on a tee photographed on a white wall matches in colour but
  // not in grain (its letters have edges, the wall doesn't), so it stays.
  const grainRef = Math.max(bgGrain, 0.5);
  for (const p of pockets) {
    const ratio = p.grain / grainRef;
    if (p.size / n >= 0.0015 && p.score < 0.5 && ratio >= 0.4 && ratio <= 1.6) {
      for (const i of p.pixels) mask[i] = 0;
      area -= p.size;
    }
  }
  debug?.({ bgGrain: +bgGrain.toFixed(2), pockets: pockets.filter((p) => p.size / n > 0.001).length });
  const coverage = area / n;
  // What's kept should look like garment, not like the background around it.
  let bgLike = 0;
  for (let i = 0; i < n; i++) if (mask[i] && distance[i]! < 1.5) bgLike++;
  debug?.({ bgLike: +(bgLike / Math.max(1, area)).toFixed(2) });
  if (bgLike / Math.max(1, area) > 0.15) return { failure: "busy-background" };
  if (coverage < 0.06) return { failure: "no-subject" };
  // A garment is a solid shape that spans a fair part of the frame. A logo or
  // a stripe left over from a close-up isn't.
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  for (let i = 0; i < n; i++) {
    if (!mask[i]) continue;
    const x = i % w;
    const y = (i - x) / w;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const boxW = maxX - minX + 1;
  const boxH = maxY - minY + 1;
  debug?.({ coverage: +coverage.toFixed(2), box: [+(boxW / w).toFixed(2), +(boxH / h).toFixed(2)], solid: +(area / (boxW * boxH)).toFixed(2) });
  // (A pair of shoes is wide and short; a print left over from a close-up is a thin strip.)
  const spanW = boxW / w;
  const spanH = boxH / h;
  if (Math.max(spanW, spanH) < 0.4 || Math.min(spanW, spanH) < 0.15 || area / (boxW * boxH) < 0.35) return { failure: "no-subject" };
  if (coverage > 0.92) return { failure: "fills-frame" };
  // A garment cut off on several sides is too close to separate reliably.
  let edgeHits = 0;
  let edgeTotal = 0;
  for (let x = 0; x < w; x++) {
    edgeHits += mask[x]! + mask[(h - 1) * w + x]!;
    edgeTotal += 2;
  }
  for (let y = 0; y < h; y++) {
    edgeHits += mask[y * w]! + mask[y * w + w - 1]!;
    edgeTotal += 2;
  }
  if (edgeHits / edgeTotal > 0.45) return { failure: "fills-frame" };

  // The blur that flattened the background also smeared the garment's edge
  // outwards by its radius, so pull the edge back in by as much, then soften it.
  const eroded = new Float32Array(n);
  const finalDepth = distanceToOutside(mask, w, h, queue);
  for (let i = 0; i < n; i++) eroded[i] = finalDepth[i]! < 0 || finalDepth[i]! >= radius ? 1 : 0;
  const soft = blur(eroded, w, h, 1);
  const alpha = new Uint8ClampedArray(n);
  for (let i = 0; i < n; i++) alpha[i] = Math.round(Math.min(1, soft[i]! * 1.25) * 255);
  return { alpha, coverage };
}
