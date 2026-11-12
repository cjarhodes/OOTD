import type { Comfort, DayWeather } from "../types";

/**
 * Upper-body warmth a person typically wants at a feels-like temperature.
 * Rough scale: tee 1, oxford 2, knit 3, waxed jacket 4, overcoat 6, puffer 7.
 */
export function warmthNeeded(feels: number, comfort: Comfort = "neutral"): number {
  const shift = comfort === "runs-cold" ? 1 : comfort === "runs-warm" ? -1 : 0;
  let need: number;
  if (feels >= 24) need = 1;
  else if (feels >= 20) need = 1.5;
  else if (feels >= 17) need = 2.5;
  else if (feels >= 14) need = 4;
  else if (feels >= 11) need = 5.5;
  else if (feels >= 8) need = 7;
  else if (feels >= 4) need = 8.5;
  else need = 10;
  return Math.max(1, need + shift);
}

/** How far over the ideal warmth still feels fine before a layer should come off. */
export const WARM_SLACK = 2.5;
/** Maximum warmth above the ideal at the coldest point of the day. */
export const COLD_CEILING = 3;
/**
 * How far under the ideal warmth is tolerable. Two points is a knit: a cool
 * first hour in a tee and an overshirt is how people dress on a mild day.
 * The score still prefers the warmer look (see warmthScore).
 */
export const COOL_SLACK = 2;
/** With the coat off you're mostly indoors, so what's under it can be a layer lighter still. */
export const SHED_SLACK = 3;

export interface DayNeeds {
  coldest: number;
  warmest: number;
  needCold: number;
  needWarm: number;
  needEvening: number;
  wet: boolean;
  windy: boolean;
  shortsOk: boolean;
}

export function dayNeeds(day: DayWeather, comfort: Comfort = "neutral"): DayNeeds {
  const temps = [day.morning.feels, day.midday.feels, day.evening.feels];
  const coldest = Math.min(...temps);
  const warmest = Math.max(...temps);
  return {
    coldest,
    warmest,
    needCold: warmthNeeded(coldest, comfort),
    needWarm: warmthNeeded(warmest, comfort),
    needEvening: warmthNeeded(day.evening.feels, comfort),
    wet: Math.max(day.morning.rain, day.midday.rain, day.evening.rain) >= 50,
    windy: Math.max(day.morning.wind, day.midday.wind, day.evening.wind) >= 30,
    shortsOk: coldest >= 18,
  };
}

/**
 * Deterministic stand-in forecast for the sample wardrobe. Always labelled as
 * sample in the UI; it is never presented as a real forecast.
 */
export function sampleWeather(date: string): DayWeather {
  const month = Number(date.slice(5, 7));
  // Rough temperate-climate seasonal midday temperature by month.
  const seasonal = [6, 7, 10, 13, 17, 20, 23, 23, 20, 15, 11, 7][month - 1] ?? 14;
  const h = hash(date);
  const swing = ((h % 7) - 3) * 1.2;
  const midday = Math.round(seasonal + swing);
  const morning = midday - 4 - (h % 3);
  const evening = midday - 2 - ((h >> 3) % 3);
  const rainy = (h >> 5) % 4 === 0;
  const rain = rainy ? 60 + ((h >> 7) % 30) : (h >> 7) % 30;
  const wind = 8 + ((h >> 9) % 24);
  return {
    date,
    source: "sample",
    morning: { feels: morning, rain: rainy ? rain - 10 : rain, wind },
    midday: { feels: midday, rain, wind: wind + 4 },
    evening: { feels: evening, rain: rainy ? rain - 5 : rain, wind },
  };
}

export function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
