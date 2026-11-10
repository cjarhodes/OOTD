import { describe, expect, it } from "vitest";
import { ADD_ROUTES } from "./addroutes";

describe("the four ways to add pieces", () => {
  it("are named exactly, in this order", () => {
    expect(ADD_ROUTES.map((r) => r.name)).toEqual(["Quick add", "Type a list", "Swipe the basics", "Photos"]);
  });

  it("each have a one-line explanation, a way there and a unique id", () => {
    for (const r of ADD_ROUTES) {
      expect(r.note.length).toBeGreaterThan(0);
      expect(r.note).not.toMatch(/\n/);
      expect(r.href.startsWith("/")).toBe(true);
    }
    expect(new Set(ADD_ROUTES.map((r) => r.id)).size).toBe(4);
    expect(new Set(ADD_ROUTES.map((r) => r.href)).size).toBe(4);
  });

  it("use the app's words: piece and type, never item, kind or category", () => {
    for (const r of ADD_ROUTES) expect(`${r.name} ${r.note}`).not.toMatch(/\b(item|kind|category)\b/i);
  });
});
