import { describe, expect, it } from "vitest";
import { makeItem } from "../kinds";
import { SAMPLE_ITEMS, sampleWears } from "../sample";
import { STARTER_DECK, starterItem } from "../starter";
import type { DayWeather, Item, Pieces } from "../types";
import { lookName, lookNotes, recipeOf, tonalFamily, aOrAn } from "./describe";
import { generateLooks, lookFromIds, planWeek, swapPiece } from "./generate";
import { necklinesWork, stackIsValid, upperLayers, weatherFit } from "./rules";
import { signatureOf } from "./score";
import { dayNeeds, sampleWeather, warmthNeeded } from "./weather";

const day = (morning: number, midday: number, evening: number, rain = 10, wind = 10): DayWeather => ({
  date: "2026-11-05",
  source: "sample",
  morning: { feels: morning, rain, wind },
  midday: { feels: midday, rain, wind },
  evening: { feels: evening, rain, wind },
});

const oxford = makeItem({ id: "ox", name: "Sky oxford", kind: "oxford", color: "Sky" });
const tee = makeItem({ id: "tee", name: "White tee", kind: "tee", color: "White" });
const crew = makeItem({ id: "crew", name: "Oatmeal crewneck", kind: "crewneck", color: "Oatmeal", material: "wool" });
const hoodie = makeItem({ id: "hood", name: "Grey hoodie", kind: "hoodie", color: "Grey" });
const overshirt = makeItem({ id: "os", name: "Olive overshirt", kind: "overshirt", color: "Olive" });
const waxed = makeItem({ id: "wax", name: "Loden waxed jacket", kind: "waxed-jacket", color: "Loden" });
const bomber = makeItem({ id: "bomb", name: "Black bomber", kind: "bomber", color: "Black" });
const blazer = makeItem({ id: "blz", name: "Navy blazer", kind: "blazer", color: "Navy" });
const turtle = makeItem({ id: "turt", name: "Black turtleneck", kind: "turtleneck", color: "Black" });
const jeans = makeItem({ id: "jeans", name: "Indigo jeans", kind: "jeans", color: "Indigo" });
const chinos = makeItem({ id: "chinos", name: "Khaki chinos", kind: "chinos", color: "Khaki" });
const shorts = makeItem({ id: "shorts", name: "Navy shorts", kind: "shorts", color: "Navy" });
const sneakers = makeItem({ id: "snk", name: "White sneakers", kind: "sneakers", color: "White" });
const loafers = makeItem({ id: "loaf", name: "Brown loafers", kind: "loafers", color: "Brown" });

const look = (p: Partial<Pieces>): Pieces => ({ base: tee, bottom: jeans, shoes: sneakers, ...p });

describe("weather", () => {
  it("needs more warmth as it gets colder", () => {
    expect(warmthNeeded(25)).toBeLessThan(warmthNeeded(15));
    expect(warmthNeeded(15)).toBeLessThan(warmthNeeded(5));
  });

  it("shifts for people who run cold or warm", () => {
    expect(warmthNeeded(12, "runs-cold")).toBe(warmthNeeded(12) + 1);
    expect(warmthNeeded(12, "runs-warm")).toBe(warmthNeeded(12) - 1);
  });

  it("flags wet days from any window", () => {
    expect(dayNeeds({ ...day(10, 14, 12), midday: { feels: 14, rain: 70, wind: 10 } }).wet).toBe(true);
    expect(dayNeeds(day(10, 14, 12, 20)).wet).toBe(false);
  });

  it("produces a stable sample forecast per date", () => {
    expect(sampleWeather("2026-11-05")).toEqual(sampleWeather("2026-11-05"));
    expect(sampleWeather("2026-11-05").source).toBe("sample");
  });
});

describe("layering rules", () => {
  it("wears a collar out over a crewneck but not a turtleneck under one", () => {
    expect(necklinesWork(oxford, crew)).toBe(true);
    expect(necklinesWork(turtle, crew)).toBe(false);
  });

  it("only puts a hood under something open", () => {
    expect(necklinesWork(hoodie, waxed)).toBe(true);
    expect(necklinesWork(hoodie, crew)).toBe(false);
  });

  it("keeps thicker layers on the outside", () => {
    expect(stackIsValid(look({ base: oxford, mid: crew, outer: waxed }))).toBe(true);
    const thickBase = { ...tee, id: "thick", thickness: 4 };
    expect(stackIsValid(look({ base: thickBase, mid: crew }))).toBe(false);
  });

  it("rejects a long overshirt hanging out of a cropped bomber", () => {
    expect(stackIsValid(look({ mid: overshirt, outer: bomber }))).toBe(false);
    expect(stackIsValid(look({ mid: crew, outer: bomber }))).toBe(true);
  });

  it("only puts a camp collar under open layers", () => {
    const camp = makeItem({ id: "camp", name: "Camp shirt", kind: "camp-shirt", color: "Forest" });
    expect(necklinesWork(camp, crew)).toBe(false);
    expect(necklinesWork(camp, overshirt)).toBe(true);
  });

  it("rejects stripe on stripe", () => {
    const stripeTee = { ...tee, id: "st", pattern: "stripe" as const };
    const stripeOvershirt = { ...overshirt, id: "so", pattern: "stripe" as const };
    expect(stackIsValid(look({ base: stripeTee, mid: stripeOvershirt }))).toBe(false);
  });
});

describe("warmth budget and the strip test", () => {
  it("asks for the jacket to come off at midday when the day warms up", () => {
    const fit = weatherFit(look({ base: oxford, mid: crew, outer: waxed }), dayNeeds(day(8, 16, 9)), false);
    expect(fit.ok).toBe(true);
    expect(fit.shed?.id).toBe("wax");
    expect(fit.backOn).toBe(true);
  });

  it("fails when even everything on is too cold", () => {
    expect(weatherFit(look({ base: tee }), dayNeeds(day(4, 7, 5)), false).ok).toBe(false);
  });

  it("fails when the outfit is too warm and nothing can come off", () => {
    expect(weatherFit(look({ base: oxford, mid: crew }), dayNeeds(day(22, 27, 24)), false).ok).toBe(false);
  });

  it("requires the rain layer on wet days when one exists", () => {
    const wet = dayNeeds(day(9, 13, 11, 80));
    expect(weatherFit(look({ base: oxford, mid: crew, outer: waxed }), wet, true).ok).toBe(true);
    expect(weatherFit(look({ base: oxford, mid: crew, outer: blazer }), wet, true).ok).toBe(false);
  });

  it("keeps suede and shorts off when they don't suit the day", () => {
    expect(weatherFit(look({ shoes: loafers, outer: waxed, mid: crew }), dayNeeds(day(9, 13, 11, 80)), true).ok).toBe(false);
    expect(weatherFit(look({ bottom: shorts }), dayNeeds(day(12, 19, 15)), false).ok).toBe(false);
  });
});

describe("recipes and names", () => {
  it("recognises the layering recipes", () => {
    expect(recipeOf(look({ base: oxford, mid: crew }))).toBe("collar-out");
    expect(recipeOf(look({ mid: overshirt }))).toBe("open-overshirt");
    expect(recipeOf(look({ mid: hoodie, outer: waxed }))).toBe("high-low");
    expect(recipeOf(look({ mid: hoodie, outer: { ...waxed, kind: "bomber" } }))).not.toBe("high-low");
    expect(recipeOf(look({ base: turtle, outer: blazer }))).toBe("roll-neck");
    expect(recipeOf(look({ base: tee, mid: crew, outer: waxed }))).toBe("three-layer");
    expect(recipeOf(look({}))).toBe("single");
  });

  it("uses a or an by sound", () => {
    expect(aOrAn({ ...crew, name: "Indigo chore coat" })).toBe("an indigo chore coat");
    expect(aOrAn({ ...crew, name: "Oatmeal henley" })).toBe("an oatmeal henley");
    expect(aOrAn({ ...crew, name: "Navy blazer" })).toBe("a navy blazer");
    expect(aOrAn({ ...crew, name: "Utility jacket" })).toBe("a utility jacket");
  });

  it("names looks from the recipe and occasion", () => {
    expect(lookName(look({ base: oxford, mid: crew }), "client")).toBe("Collar out, client day");
  });

  it("spots tonal stacks", () => {
    const sage = makeItem({ id: "sage", name: "Sage tee", kind: "tee", color: "Sage" });
    expect(tonalFamily(look({ base: sage, mid: overshirt }))).toBe("green");
    expect(lookName(look({ base: sage, mid: overshirt }), "weekend")).toBe("Tonal olive, weekend");
    expect(tonalFamily(look({ base: oxford, mid: crew }))).toBeNull();
    const navyCrew = makeItem({ id: "nc", name: "Navy crew", kind: "crewneck", color: "Navy" });
    const navyBlazer = makeItem({ id: "nb", name: "Navy blazer", kind: "blazer", color: "Navy" });
    expect(tonalFamily(look({ base: oxford, mid: navyCrew, outer: navyBlazer }))).toBeNull();
  });

  it("leads the notes with when to take a layer off", () => {
    const notes = lookNotes(look({ base: oxford, mid: crew, outer: waxed }), { layer: waxed, backOn: true });
    expect(notes[0]).toBe("Take the loden waxed jacket off around midday and put it back on after 5.");
    expect(notes.length).toBeLessThanOrEqual(3);
  });
});

describe("generateLooks", () => {
  const items: Item[] = SAMPLE_ITEMS;
  const base = { items, occasion: "client" as const, date: "2026-11-05", weather: day(8, 15, 11) };

  it("returns three distinct looks that pass every rule", () => {
    const looks = generateLooks({ ...base, wears: sampleWears("2026-11-05") });
    const all = [looks.easy, looks.fresh, looks.bold];
    expect(all.every(Boolean)).toBe(true);
    const sigs = new Set(all.map((l) => l!.signature));
    expect(sigs.size).toBe(3);
    for (const l of all) {
      expect(stackIsValid(l!.pieces)).toBe(true);
      expect(l!.name.length).toBeGreaterThan(0);
      expect(l!.notes.length).toBeGreaterThan(0);
    }
  });

  it("layers up on a cold day and drops layers on a hot one", () => {
    const cold = generateLooks({ ...base, weather: day(1, 4, 2) });
    expect(upperLayers(cold.fresh!.pieces).length).toBeGreaterThanOrEqual(2);
    expect(cold.fresh!.pieces.outer).toBeDefined();
    const hot = generateLooks({ ...base, occasion: "weekend", weather: day(22, 28, 24) });
    expect(hot.fresh!.pieces.outer).toBeUndefined();
  });

  it("uses the rain shell or waxed jacket on a wet day", () => {
    const wet = generateLooks({ ...base, weather: day(9, 13, 11, 85) });
    expect(wet.fresh!.pieces.outer?.waterproof).toBe(true);
    expect(wet.fresh!.pieces.shoes.delicate).toBe(false);
  });

  it("never picks unavailable pieces and always includes a pin", () => {
    const washing = items.map((i) => (i.id === "b-oxford-sky" ? { ...i, status: "laundry" as const } : i));
    const looks = generateLooks({ ...base, items: washing, pin: "m-crew-rust" });
    for (const l of [looks.easy, looks.fresh, looks.bold]) {
      if (!l) continue;
      expect(signatureOf(l.pieces)).not.toContain("b-oxford-sky");
      expect(signatureOf(l.pieces)).toContain("m-crew-rust");
    }
  });

  it("is stable for the same inputs and changes with shuffle", () => {
    const a = generateLooks(base);
    const b = generateLooks(base);
    expect(a.fresh!.signature).toBe(b.fresh!.signature);
    const shuffled = [1, 2, 3, 4].map((shuffle) => generateLooks({ ...base, shuffle }).fresh!.signature);
    expect(shuffled.some((s) => s !== a.fresh!.signature)).toBe(true);
  });

  it("shows the closest look with a warning when nothing is warm enough", () => {
    const looks = generateLooks({ ...base, items: [tee, crew, jeans, sneakers], weather: day(2, 6, 3) });
    expect(looks.easy).toBeNull();
    expect(looks.fresh!.pieces.mid?.id).toBe("crew");
    expect(looks.fresh!.warning).toMatch(/Add a jacket or coat/);
  });

  it("fills every tier a small swiped wardrobe can, each a different look", () => {
    const card = (id: string) => STARTER_DECK.find((c) => c.id === id)!;
    const small = ["tee", "jeans", "sneakers", "oxford", "crew", "hoodie", "overcoat", "chinos", "chukka"].map((id) => starterItem(card(id)));
    for (const weather of [day(18, 24, 20), day(10, 15, 12), day(1, 5, 2)]) {
      const looks = generateLooks({ ...base, items: small, occasion: "weekend", weather });
      const all = [looks.easy, looks.fresh, looks.bold];
      expect(all.every(Boolean)).toBe(true);
      expect(new Set(all.map((l) => l!.signature)).size).toBe(3);
    }
  });

  it("keeps every fallback look as warm as the wardrobe allows", () => {
    const card = (id: string) => STARTER_DECK.find((c) => c.id === id)!;
    const noCoat = ["tee", "jeans", "sneakers", "oxford", "crew", "chinos"].map((id) => starterItem(card(id)));
    const looks = generateLooks({ ...base, items: noCoat, occasion: "weekend", weather: day(1, 5, 2) });
    const all = [looks.easy, looks.fresh, looks.bold].filter(Boolean);
    expect(all.length).toBeGreaterThan(1);
    const warmths = all.map((l) => upperLayers(l!.pieces).reduce((s, i) => s + i.warmth, 0));
    expect(new Set(warmths).size).toBe(1);
    for (const l of all) expect(l!.warning).toMatch(/Add a jacket or coat/);
  });

  it("dresses the weekend in the casual pieces, and keeps sweatpants off work and dinner", () => {
    const deck = STARTER_DECK.map((c) => starterItem(c));
    const casual = new Set(["long-sleeve", "flannel", "rugby", "fleece", "denim-jacket", "cargos", "sweatpants", "canvas", "high-tops", "trail", "sandals", "clogs"]);
    const days = [day(18, 24, 20), day(10, 15, 12), day(1, 5, 2), day(8, 11, 9, 85)];
    let casualPieces = 0;
    for (const weather of days) {
      const weekend = generateLooks({ ...base, items: deck, occasion: "weekend", weather });
      for (const l of [weekend.easy, weekend.fresh, weekend.bold]) {
        const ps = [...upperLayers(l!.pieces), l!.pieces.bottom, l!.pieces.shoes];
        casualPieces += ps.filter((i) => casual.has(i.kind)).length;
        // Sweatpants go with trainers, never boots or loafers.
        if (l!.pieces.bottom.kind === "sweatpants") expect(["sneakers", "runners", "canvas"]).toContain(l!.pieces.shoes.kind);
      }
      for (const occasion of ["office", "client", "dinner"] as const) {
        const looks = generateLooks({ ...base, items: deck, occasion, weather });
        for (const l of [looks.easy, looks.fresh, looks.bold]) if (l) expect(l.pieces.bottom.kind).not.toBe("sweatpants");
      }
    }
    expect(casualPieces).toBeGreaterThanOrEqual(8);
  });

  it("keeps sandals to warm, dry days off work, and suede clogs out of the rain", () => {
    const deck = STARTER_DECK.map((c) => starterItem(c));
    const shoesOn = (occasion: "weekend" | "office", weather: DayWeather) => {
      const l = generateLooks({ ...base, items: deck, occasion, weather });
      return [l.easy, l.fresh, l.bold].filter(Boolean).map((x) => x!.pieces.shoes.kind);
    };
    for (const weather of [day(10, 15, 12), day(1, 5, 2), day(20, 26, 22, 85)]) expect(shoesOn("weekend", weather)).not.toContain("sandals");
    expect(shoesOn("office", day(20, 27, 23))).not.toContain("sandals");
    expect(shoesOn("weekend", day(8, 11, 9, 85))).not.toContain("clogs");
    // On a hot, dry weekend with only sandals and boots to choose from, the best look wears sandals.
    const pick = ["tee", "shorts", "sandals", "chukka"].map((id) => starterItem(STARTER_DECK.find((c) => c.id === id)!));
    const hot = generateLooks({ ...base, items: pick, occasion: "weekend", weather: day(22, 29, 24) });
    const best = [hot.easy, hot.fresh, hot.bold].filter(Boolean).sort((a, b) => b!.score - a!.score)[0]!;
    expect(best.pieces.shoes.kind).toBe("sandals");
  });

  it("returns nulls rather than inventing pieces for an incomplete wardrobe", () => {
    const looks = generateLooks({ ...base, items: [tee, jeans] });
    expect(looks.easy).toBeNull();
  });

  it("swaps one piece and keeps the rest", () => {
    const fresh = generateLooks(base).fresh!;
    const swapped = swapPiece(fresh, "bottom", { ...base });
    expect(swapped).not.toBeNull();
    expect(swapped!.pieces.bottom.id).not.toBe(fresh.pieces.bottom.id);
    expect(swapped!.pieces.base.id).toBe(fresh.pieces.base.id);
  });

  it("varies a planned week instead of repeating one look", () => {
    const days = [0, 1, 2, 3, 4].map((n) => {
      const date = `2026-11-1${n}`;
      return { date, occasion: "office" as const, weather: day(7, 12, 9) };
    });
    const week = planWeek(days, { items });
    const sigs = new Set(week.map((l) => l?.signature));
    expect(sigs.size).toBe(5);
  });

  it("rebuilds a saved plan from item ids", () => {
    const rebuilt = lookFromIds([oxford.id, crew.id, chinos.id, loafers.id], [oxford, crew, chinos, loafers], base);
    expect(rebuilt?.recipe).toBe("collar-out");
  });
});
