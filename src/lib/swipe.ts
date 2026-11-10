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

/** The choice made by letting go at (dx, dy), or null when the card hasn't gone far enough. */
export function choiceOf(dx: number, dy: number): Choice | null {
  if (dy < -THRESHOLD && Math.abs(dy) > Math.abs(dx)) return "want";
  if (dx > THRESHOLD) return "have";
  if (dx < -THRESHOLD) return "skip";
  return null;
}

/** How far the card is towards committing, from 0 (still) to 1 (past the threshold). */
export function strengthOf(dx: number, dy: number): number {
  return Math.min(1, Math.max(Math.abs(dx), -dy) / THRESHOLD);
}
