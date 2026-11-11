import { fitOf, KINDS } from "../kinds";
import type { Item, Pieces } from "../types";
import { COLD_CEILING, COOL_SLACK, WARM_SLACK, type DayNeeds } from "./weather";

/** Upper-body layers from the inside out. */
export function upperLayers(p: Pieces): Item[] {
  return [p.base, p.mid, p.outer].filter((i): i is Item => Boolean(i));
}

export function warmthOf(layers: Item[]): number {
  return layers.reduce((sum, i) => sum + i.warmth, 0);
}

/**
 * Can `inner` be worn directly under `over`, judged by necklines?
 * Open fronts and lapels accept anything. A hood only works under something open.
 * A closed crew, v or zip neck takes a crew or a collar (collar out) underneath.
 */
export function necklinesWork(inner: Item, over: Item): boolean {
  // A camp collar is cut to lie flat and open, so it only goes under open layers.
  if (inner.kind === "camp-shirt") return over.front === "open";
  if (inner.neckline === "hood") return over.front === "open" || over.neckline === "lapel";
  if (over.front === "open" || over.neckline === "lapel") return true;
  if (over.neckline === "turtle" || over.neckline === "mock") return false;
  if (over.neckline === "hood") return inner.neckline === "crew" || inner.neckline === "collar";
  if (over.neckline === "crew" || over.neckline === "v" || over.neckline === "zip") {
    return inner.neckline === "crew" || inner.neckline === "collar";
  }
  return true;
}

/**
 * Structural layering rules that make a stack physically sensible:
 * thicker towards the outside, a sensible length order, compatible necklines,
 * and no more than one busy pattern.
 */
export function stackIsValid(p: Pieces): boolean {
  return layersAreValid(p) && patternsWork(p);
}

/** The upper-body rules alone: thickness order, hem lengths, necklines. */
export function layersAreValid(p: Pick<Pieces, "base" | "mid" | "outer">): boolean {
  const layers = [p.base, p.mid, p.outer].filter((i): i is Item => Boolean(i));
  for (let i = 1; i < layers.length; i++) {
    const inner = layers[i - 1]!;
    const over = layers[i]!;
    // A rain shell is cut roomy to go over a knit, so it's the one layer that may be thinner than what's under it.
    const shellOverKnit = over.kind === "rain-shell" && inner.thickness <= 4;
    if (inner.thickness > over.thickness && !shellOverKnit) return false;
    // A layer may hang a little below the next (a shirt hem peeking), but not by much,
    // unless the layer over it is cut cropped and boxy to show off a light shirt or tee.
    const croppedOver = fitOf(over) === "boxy" && over.length <= 2 && inner.thickness <= 1;
    if (inner.length - over.length > (croppedOver ? 2 : 1)) return false;
    if (!necklinesWork(inner, over)) return false;
  }
  // A turtleneck or mock neck is only ever the base layer.
  if (p.mid && (p.mid.neckline === "turtle" || p.mid.neckline === "mock")) return false;
  return true;
}

/** No two patterns of the same type in one look (stripe on stripe clashes). */
export function patternsWork(p: Pieces): boolean {
  const patterned = [...upperLayers(p), p.bottom].filter((i) => i.pattern !== "solid");
  if (patterned.length > 1) {
    const kinds = new Set(patterned.map((i) => i.pattern));
    // Two patterns of the same type (stripe on stripe) clash; different types are allowed but scored down.
    if (kinds.size < patterned.length) return false;
  }
  return true;
}

export interface WeatherFit {
  ok: boolean;
  /** The layer to take off when the day warms up, if one is needed. */
  shed?: Item;
  backOn: boolean;
}

/**
 * Warmth budget across the day. Everything on must cover the coldest window.
 * If that is too warm for the warmest window, one removable layer must come off
 * and what remains (the strip test) must still suit the warmest window.
 */
export function weatherFit(p: Pieces, needs: DayNeeds, rainLayerAvailable: boolean): WeatherFit {
  if (!lowerFitsWeather(p, needs)) return { ok: false, backOn: false };
  return layersFitWeather(p, needs, rainLayerAvailable);
}

/** Trousers and shoes against the day: no shorts when it's cool, no delicate shoes in rain. */
export function lowerFitsWeather(p: Pick<Pieces, "bottom" | "shoes">, needs: DayNeeds): boolean {
  if (p.bottom.kind === "shorts" && !needs.shortsOk) return false;
  if (needs.wet && p.shoes.delicate) return false;
  // Sandals are for warm, dry days: the same warmth as shorts.
  if (KINDS[p.shoes.kind]?.warmOnly && !needs.shortsOk) return false;
  return true;
}

/** The upper layers against the day's warmth and rain. Independent of trousers and shoes. */
export function layersFitWeather(
  p: Pick<Pieces, "base" | "mid" | "outer">,
  needs: DayNeeds,
  rainLayerAvailable: boolean,
  /** Somewhere smart to be: a wool overcoat does for the rain, where a technical shell would look wrong. */
  coatForRain = false,
): WeatherFit {
  const layers = [p.base, p.mid, p.outer].filter((i): i is Item => Boolean(i));
  const fail: WeatherFit = { ok: false, backOn: false };
  if (needs.wet) {
    const woolCoat = coatForRain && p.outer?.kind === "overcoat" && p.outer.material === "wool";
    if (rainLayerAvailable && !p.outer?.waterproof && !woolCoat) return fail;
    if (p.outer && p.outer.delicate) return fail;
  }

  const all = warmthOf(layers);
  if (all < needs.needCold - COOL_SLACK) return fail;
  // Even the coldest part of the day shouldn't feel overdressed. A shell on a wet day is exempt.
  const extraForRain = needs.wet && p.outer?.waterproof ? p.outer.warmth : 0;
  if (all - extraForRain > needs.needCold + COLD_CEILING) return fail;
  if (all <= needs.needWarm + WARM_SLACK) return { ok: true, backOn: false };

  // Too warm at the warmest point with everything on: find one removable layer.
  const removable = p.outer ?? (p.mid && p.mid.front === "open" ? p.mid : undefined);
  if (!removable) return fail;
  const remaining = all - removable.warmth;
  if (remaining > needs.needWarm + WARM_SLACK) return fail;
  if (remaining < needs.needWarm - COOL_SLACK) return fail;
  return { ok: true, shed: removable, backOn: remaining < needs.needEvening - COOL_SLACK / 2 };
}
