import { validDate } from "./core.js";
export async function searchCities(query) {
  if (query.trim().length < 2) return [];
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.search = new URLSearchParams({
    name: query.trim(),
    count: 5,
    language: "en",
    format: "json",
  });
  const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!r.ok)
    throw new Error("Location search is unavailable. Please try again.");
  const json = await r.json();
  return (json.results || []).map((c) => ({
    name: [c.name, c.admin1, c.country].filter(Boolean).join(", "),
    latitude: c.latitude,
    longitude: c.longitude,
    timezone: c.timezone,
  }));
}
export function dayWeather(data, date) {
  if (!validDate(date)) return null;
  const index = data?.daily?.time?.indexOf(date) ?? -1;
  if (index < 0) return null;
  const d = data.daily;
  if (
    !Number.isFinite(d.temperature_2m_max?.[index]) ||
    !Number.isFinite(d.temperature_2m_min?.[index])
  )
    return null;
  return {
    high: d.temperature_2m_max[index],
    low: d.temperature_2m_min[index],
    rain: d.precipitation_probability_max[index] ?? 0,
    wind: d.wind_speed_10m_max[index],
    code: d.weather_code[index],
    live: true,
  };
}
export function weatherLabel(w) {
  if (!w) return "Weather not set";
  if ((w.code >= 71 && w.code <= 77) || w.code === 85 || w.code === 86)
    return "Snow";
  if (w.code >= 95) return "Thunderstorms";
  if (
    w.rain >= 45 ||
    (w.code >= 51 && w.code <= 67) ||
    (w.code >= 80 && w.code <= 82)
  )
    return "Rain likely";
  if (w.wind >= 30) return "Windy";
  if (w.code >= 1 && w.code <= 3) return "Partly cloudy";
  if (w.code >= 45 && w.code <= 48) return "Foggy";
  return "Clear skies";
}
export async function forecast(city) {
  const key = `form-weather:${city.latitude},${city.longitude}`;
  try {
    const cached = JSON.parse(sessionStorage.getItem(key) || "null");
    if (cached && Date.now() - cached.at < 30 * 60 * 1000) return cached.data;
  } catch {
    /* Cache is optional. */
  }
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: city.latitude,
    longitude: city.longitude,
    daily:
      "temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,weather_code",
    timezone: "auto",
    forecast_days: 16,
  });
  const r = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!r.ok)
    throw new Error(
      "The forecast is unavailable. You can still plan an outfit.",
    );
  const data = await r.json();
  if (!Array.isArray(data.daily?.time))
    throw new Error("The forecast could not be read.");
  try {
    sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), data }));
  } catch {}
  return data;
}
