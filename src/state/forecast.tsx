"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchForecast } from "@/lib/forecast";
import { sampleWeather } from "@/lib/engine/weather";
import type { DayWeather } from "@/lib/types";
import { useWardrobe } from "./wardrobe";

export interface ForecastState {
  /** Weather for a date: live when the city is set and the date is in range, otherwise a labelled sample. */
  weatherFor: (date: string) => DayWeather;
  status: "sample" | "loading" | "live" | "error";
  cityName: string | null;
}

export function useForecast(): ForecastState {
  const { city, ready } = useWardrobe();
  const [days, setDays] = useState<Record<string, DayWeather>>({});
  const [status, setStatus] = useState<ForecastState["status"]>("sample");

  useEffect(() => {
    if (!ready || !city) {
      setDays({});
      setStatus("sample");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    fetchForecast(city)
      .then((d) => {
        if (cancelled) return;
        setDays(d);
        setStatus("live");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [ready, city]);

  return useMemo(
    () => ({ weatherFor: (date: string) => days[date] ?? sampleWeather(date), status, cityName: city?.name ?? null }),
    [days, status, city],
  );
}

export function forecastLabel(w: DayWeather, state: ForecastState): string {
  if (w.source === "live") return `Live forecast · ${state.cityName}`;
  if (w.source === "history") return "Last year’s weather on this date · a guide";
  if (state.status === "loading") return "Loading the forecast…";
  if (state.status === "error") return "Forecast unavailable · showing a sample";
  if (state.status === "live") return "Beyond the 16-day forecast · sample";
  return "Sample forecast · set your city in Settings";
}
