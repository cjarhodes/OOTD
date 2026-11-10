import { describe, expect, it } from "vitest";
import { choiceOf, leanOf, strengthOf, thresholdFor, velocityOf } from "./swipe";

describe("swipe gestures", () => {
  it("leans past 40 px in each direction", () => {
    expect(leanOf(41, 0)).toBe("have");
    expect(leanOf(-41, 0)).toBe("skip");
    expect(leanOf(0, -41)).toBe("want");
  });

  it("has a dead zone up to 40 px, and downwards never leans", () => {
    expect(leanOf(0, 0)).toBeNull();
    expect(leanOf(40, 0)).toBeNull();
    expect(leanOf(-40, 0)).toBeNull();
    expect(leanOf(0, -40)).toBeNull();
    expect(leanOf(10, 200)).toBeNull();
  });

  it("lets up win a lean only when it is the larger movement", () => {
    expect(leanOf(30, -60)).toBe("want");
    expect(leanOf(60, -50)).toBe("have");
    expect(leanOf(-60, -50)).toBe("skip");
    // An exact tie is not larger: sideways wins.
    expect(leanOf(50, -50)).toBe("have");
    // Up past 40 but sideways under it, with sideways larger, is no lean.
    expect(leanOf(0, -41)).toBe("want");
  });

  it("commits past 90 px in each direction", () => {
    expect(choiceOf(91, 0)).toBe("have");
    expect(choiceOf(-91, 0)).toBe("skip");
    expect(choiceOf(0, -91)).toBe("want");
  });

  it("does nothing up to 90 px", () => {
    expect(choiceOf(90, 0)).toBeNull();
    expect(choiceOf(-90, 0)).toBeNull();
    expect(choiceOf(0, -90)).toBeNull();
    expect(choiceOf(0, 0)).toBeNull();
    expect(choiceOf(0, 150)).toBeNull();
  });

  it("decides diagonals by the larger movement", () => {
    expect(choiceOf(60, -120)).toBe("want");
    expect(choiceOf(120, -100)).toBe("have");
    expect(choiceOf(-120, -100)).toBe("skip");
    // Up beyond the threshold but sideways larger and beyond it: sideways.
    expect(choiceOf(100, -95)).toBe("have");
    // Up not beyond the threshold while sideways is: sideways.
    expect(choiceOf(95, -80)).toBe("have");
    // Equal up and sideways: sideways.
    expect(choiceOf(100, -100)).toBe("have");
    // Up beyond the threshold, sideways too small to count: up.
    expect(choiceOf(89, -91)).toBe("want");
    // Dragged down and across: sideways still counts.
    expect(choiceOf(120, 80)).toBe("have");
  });

  it("measures strength from 0 to 1", () => {
    expect(strengthOf(0, 0)).toBe(0);
    expect(strengthOf(45, 0)).toBeCloseTo(0.5);
    expect(strengthOf(-45, 0)).toBeCloseTo(0.5);
    expect(strengthOf(0, -45)).toBeCloseTo(0.5);
    expect(strengthOf(90, 0)).toBe(1);
    expect(strengthOf(300, 0)).toBe(1);
    expect(strengthOf(0, -300)).toBe(1);
  });

  it("ignores a downward drag when measuring strength", () => {
    expect(strengthOf(0, 80)).toBe(0);
    expect(strengthOf(30, 80)).toBeCloseTo(1 / 3);
  });

  it("scales the distance threshold to a narrow card", () => {
    expect(thresholdFor(1000)).toBe(90);
    expect(thresholdFor(360)).toBe(90);
    expect(thresholdFor(280)).toBe(70);
    expect(choiceOf(75, 0, 0, 0, 280)).toBe("have");
    expect(choiceOf(75, 0, 0, 0, 1000)).toBeNull();
    expect(strengthOf(35, 0, 280)).toBeCloseTo(0.5);
  });
});

describe("velocityOf", () => {
  it("measures speed over the samples in the last 80 ms", () => {
    const samples = [
      { t: 0, x: 0, y: 0 },
      { t: 40, x: 20, y: 0 },
      { t: 60, x: 40, y: -10 },
      { t: 100, x: 80, y: -30 },
    ];
    // At t = 100 the window starts at 20, so the sample at 0 is ignored: 60 px across and 30 px up in 60 ms.
    const v = velocityOf(samples, 100);
    expect(v.vx).toBeCloseTo(60 / 60);
    expect(v.vy).toBeCloseTo(-30 / 60);
  });

  it("is zero with fewer than two recent samples", () => {
    expect(velocityOf([], 100)).toEqual({ vx: 0, vy: 0 });
    expect(velocityOf([{ t: 90, x: 10, y: 10 }], 100)).toEqual({ vx: 0, vy: 0 });
    // The finger stopped before letting go: everything is older than 80 ms.
    expect(velocityOf([{ t: 0, x: 0, y: 0 }, { t: 30, x: 90, y: 0 }], 200)).toEqual({ vx: 0, vy: 0 });
  });

  it("is zero when two samples share a time", () => {
    expect(velocityOf([{ t: 50, x: 0, y: 0 }, { t: 50, x: 30, y: 0 }], 60)).toEqual({ vx: 0, vy: 0 });
  });
});

describe("a flick", () => {
  it("counts when short and fast in each direction", () => {
    expect(choiceOf(30, 0, 0.8, 0, 360)).toBe("have");
    expect(choiceOf(-30, 0, -0.8, 0, 360)).toBe("skip");
    expect(choiceOf(0, -30, 0, -0.8, 360)).toBe("want");
  });

  it("needs at least 24 px of travel and more than 0.5 px/ms", () => {
    expect(choiceOf(23, 0, 2, 0, 360)).toBeNull();
    expect(choiceOf(24, 0, 0.8, 0, 360)).toBe("have");
    expect(choiceOf(60, 0, 0.5, 0, 360)).toBeNull();
    expect(choiceOf(60, 0, 0.51, 0, 360)).toBe("have");
  });

  it("is not needed for a slow, long drag", () => {
    expect(choiceOf(120, 0, 0.05, 0, 360)).toBe("have");
    expect(choiceOf(-120, 0, -0.05, 0, 360)).toBe("skip");
    expect(choiceOf(0, -120, 0, -0.05, 360)).toBe("want");
    // A slow, short drag still does nothing.
    expect(choiceOf(60, 0, 0.1, 0, 360)).toBeNull();
  });

  it("is cancelled by a fast flick back towards the centre", () => {
    expect(choiceOf(120, 0, -0.9, 0, 360)).toBeNull();
    expect(choiceOf(-120, 0, 0.9, 0, 360)).toBeNull();
    expect(choiceOf(0, -120, 0, 0.9, 360)).toBeNull();
    // A gentle drift back does not cancel.
    expect(choiceOf(120, 0, -0.3, 0, 360)).toBe("have");
  });

  it("lets up win a flick only when it is the larger movement", () => {
    expect(choiceOf(30, -60, 0.6, -0.9, 360)).toBe("want");
    expect(choiceOf(60, -30, 0.9, -0.6, 360)).toBe("have");
  });
});
