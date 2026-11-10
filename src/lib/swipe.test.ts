import { describe, expect, it } from "vitest";
import { choiceOf, leanOf, strengthOf } from "./swipe";

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
});
