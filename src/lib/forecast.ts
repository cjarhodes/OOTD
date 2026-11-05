import type { DayWeather } from "./types";

/** Open-Meteo: free, no key, intended for non-commercial use. Only coordinates are sent. */
const GEOCODE = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST = "https://api.open-meteo.com/v1/forecast";
const ARCHIVE = "https://archive-api.open-meteo.com/v1/archive";

export interface City {
  name: string;
  admin?: string;
  country?: string;
  latitude: number;
  longitude: number;
}

export interface HourlyResponse {
  hourly?: {
    time?: string[];
    apparent_temperature?: (number | null)[];
    precipitation_probability?: (number | null)[];
    wind_speed_10m?: (number | null)[];
  };
}

const WINDOWS = { morning: "08:00", midday: "13:00", evening: "18:00" } as const;

/**
 * Turn an hourly Open-Meteo response (timezone=auto, so times are local) into
 * morning / midday / evening windows per date. Days missing any window are
 * skipped rather than guessed.
 */
export function parseForecast(json: HourlyResponse): Record<string, DayWeather> {
  const h = json.hourly;
  const out: Record<string, DayWeather> = {};
  if (!h?.time || !h.apparent_temperature) return out;
  const index = new Map(h.time.map((t, i) => [t, i]));
  const dates = [...new Set(h.time.map((t) => t.slice(0, 10)))];
  for (const date of dates) {
    const windows = {} as Record<keyof typeof WINDOWS, DayWeather["morning"]>;
    let complete = true;
    for (const [key, hour] of Object.entries(WINDOWS) as [keyof typeof WINDOWS, string][]) {
      const i = index.get(`${date}T${hour}`);
      const feels = i === undefined ? null : h.apparent_temperature[i];
      if (i === undefined || feels === null || feels === undefined) {
        complete = false;
        break;
      }
      windows[key] = {
        feels: Math.round(feels),
        rain: Math.round(h.precipitation_probability?.[i] ?? 0),
        wind: Math.round(h.wind_speed_10m?.[i] ?? 0),
      };
    }
    if (complete) out[date] = { date, source: "live", ...windows };
  }
  return out;
}

async function getJson(url: string, timeoutMs = 8000): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`Weather service returned ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function searchCities(query: string): Promise<City[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const json = (await getJson(`${GEOCODE}?name=${encodeURIComponent(q)}&count=6&language=en&format=json`)) as {
    results?: { name: string; admin1?: string; country?: string; latitude: number; longitude: number }[];
  };
  return (json.results ?? []).map((r) => ({
    name: r.name,
    admin: r.admin1,
    country: r.country,
    latitude: r.latitude,
    longitude: r.longitude,
  }));
}

const CACHE_MS = 30 * 60 * 1000;

/** 16 days of hourly weather, cached for 30 minutes per location in this tab. */
export async function fetchForecast(city: City): Promise<Record<string, DayWeather>> {
  const key = `ootd.forecast.${city.latitude.toFixed(2)},${city.longitude.toFixed(2)}`;
  try {
    const cached = JSON.parse(sessionStorage.getItem(key) ?? "null") as { at: number; days: Record<string, DayWeather> } | null;
    if (cached && Date.now() - cached.at < CACHE_MS) return cached.days;
  } catch {
    // Ignore unreadable cache.
  }
  const url =
    `${FORECAST}?latitude=${city.latitude}&longitude=${city.longitude}` +
    "&hourly=apparent_temperature,precipitation_probability,wind_speed_10m&forecast_days=16&timezone=auto";
  const days = parseForecast((await getJson(url)) as HourlyResponse);
  try {
    sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), days }));
  } catch {
    // Storage full or unavailable: the forecast still works for this view.
  }
  return days;
}

export interface ArchiveResponse {
  hourly?: {
    time?: string[];
    apparent_temperature?: (number | null)[];
    precipitation?: (number | null)[];
    wind_speed_10m?: (number | null)[];
  };
}

/**
 * Turn last year's observed hourly weather into windows, shifted forward one
 * year. Rain probability isn't observed, so an hour with measurable rain counts
 * as likely (70%), otherwise unlikely (10%).
 */
export function parseArchive(json: ArchiveResponse): Record<string, DayWeather> {
  const h = json.hourly;
  if (!h?.time) return {};
  const shifted = parseForecast({
    hourly: {
      time: h.time,
      apparent_temperature: h.apparent_temperature,
      precipitation_probability: (h.precipitation ?? []).map((mm) => (mm !== null && mm !== undefined && mm >= 0.2 ? 70 : 10)),
      wind_speed_10m: h.wind_speed_10m,
    },
  });
  const out: Record<string, DayWeather> = {};
  for (const [date, day] of Object.entries(shifted)) {
    const next = `${Number(date.slice(0, 4)) + 1}${date.slice(4)}`;
    out[next] = { ...day, date: next, source: "history" };
  }
  return out;
}

export type TripWeatherSource = "forecast" | "last-year" | "mixed" | "sample";

/**
 * Weather for each day of a trip: the live forecast where it reaches, then the
 * same dates last year as a guide. Days neither source covers are left out.
 */
export async function fetchTripWeather(
  city: City,
  dates: string[],
): Promise<{ days: Record<string, DayWeather>; source: TripWeatherSource }> {
  const days: Record<string, DayWeather> = {};
  let forecastDays: Record<string, DayWeather> = {};
  try {
    forecastDays = await fetchForecast(city);
  } catch {
    forecastDays = {};
  }
  for (const d of dates) if (forecastDays[d]) days[d] = forecastDays[d]!;
  const missing = dates.filter((d) => !days[d]);
  if (missing.length) {
    const lastYear = (d: string) => `${Number(d.slice(0, 4)) - 1}${d.slice(4)}`;
    const url =
      `${ARCHIVE}?latitude=${city.latitude}&longitude=${city.longitude}` +
      `&start_date=${lastYear(missing[0]!)}&end_date=${lastYear(missing[missing.length - 1]!)}` +
      "&hourly=apparent_temperature,precipitation,wind_speed_10m&timezone=auto";
    try {
      const past = parseArchive((await getJson(url)) as ArchiveResponse);
      for (const d of missing) if (past[d]) days[d] = past[d]!;
    } catch {
      // Leave those days to the caller's fallback.
    }
  }
  const fromForecast = dates.filter((d) => days[d]?.source === "live").length;
  const fromHistory = dates.filter((d) => days[d]?.source === "history").length;
  const source: TripWeatherSource =
    fromForecast === 0 && fromHistory === 0 ? "sample" : fromHistory === 0 ? "forecast" : fromForecast === 0 ? "last-year" : "mixed";
  return { days, source };
}

export function cityLabel(c: City): string {
  return [c.name, c.admin && c.admin !== c.name ? c.admin : null, c.country].filter(Boolean).join(", ");
}
