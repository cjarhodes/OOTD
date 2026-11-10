import type { Choice } from "./deck";

/** Pixels of travel that commit a swipe on release. */
export const THRESHOLD = 90;
/** Pixels of lean before the stamp shows which way the card is going. */
export const LEAN = 40;

/** Which way a card at (dx, dy) is leaning, for the stamp on it. Up wins only when it is the larger movement. */
export function leanOf(dx: number, dy: number): Choice | null {
  if (dy < -LEAN && Math.abs(dy) > Math.abs(dx)) return "want";
  if (dx > LEAN) return "have";
  if (dx < -LEAN) return "skip";
  return null;
}

/** A pointer position at a moment, in milliseconds and pixels. */
export interface Sample {
  t: number;
  x: number;
  y: number;
}
/** Only the last stretch of movement counts as speed: a pause before letting go means no flick. */
export const VELOCITY_WINDOW_MS = 80;
/** Pixels per millisecond that make a quick flick. */
export const FLICK_SPEED = 0.5;
/** Pixels a flick must have travelled in its direction to count. */
export const FLICK_TRAVEL = 24;

/** Pointer velocity (px per ms) over the samples inside the last 80 ms before `now`. Fewer than two samples is no speed. */
export function velocityOf(samples: readonly Sample[], now: number): { vx: number; vy: number } {
  const recent = samples.filter((s) => now - s.t <= VELOCITY_WINDOW_MS);
  if (recent.length < 2) return { vx: 0, vy: 0 };
  const first = recent[0]!;
  const last = recent[recent.length - 1]!;
  const dt = last.t - first.t;
  if (dt <= 0) return { vx: 0, vy: 0 };
  return { vx: (last.x - first.x) / dt, vy: (last.y - first.y) / dt };
}

/** Pixels of travel that commit a swipe on this width of card: 90, or a quarter of the width when that is less. */
export function thresholdFor(width: number): number {
  return Math.min(THRESHOLD, width * 0.25);
}

/**
 * Does movement `d` (positive is the direction being tested) with speed `v` reach a decision? Far enough
 * counts, and so does a quick flick that has gone at least 24 px. A fast pull back towards the centre
 * cancels it, however far the card had come.
 */
function reaches(d: number, v: number, threshold: number): boolean {
  if (v < -FLICK_SPEED) return false;
  return d > threshold || (v > FLICK_SPEED && d >= FLICK_TRAVEL);
}

/**
 * The choice made by letting go at (dx, dy) with release velocity (vx, vy) on a card `width` wide, or null
 * when the card hasn't gone far enough or is being pulled back. Up wins only when it is the larger movement.
 */
export function choiceOf(dx: number, dy: number, vx = 0, vy = 0, width = Infinity): Choice | null {
  const threshold = thresholdFor(width);
  if (-dy > Math.abs(dx) && reaches(-dy, -vy, threshold)) return "want";
  if (reaches(dx, vx, threshold)) return "have";
  if (reaches(-dx, -vx, threshold)) return "skip";
  return null;
}

/** How far the card is towards committing, from 0 (still) to 1 (past the threshold). */
export function strengthOf(dx: number, dy: number, width = Infinity): number {
  return Math.min(1, Math.max(Math.abs(dx), -dy) / thresholdFor(width));
}
