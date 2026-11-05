import type { DayWeather } from "./types";

/** Open-Meteo: free, no key, intended for non-commercial use. Only coordinates are sent. */
const GEOCODE = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST = "https://api.open-meteo.com/v1/forecast";

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

export function cityLabel(c: City): string {
  return [c.name, c.admin && c.admin !== c.name ? c.admin : null, c.country].filter(Boolean).join(", ");
}
