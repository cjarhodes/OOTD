"use client";

import Link from "next/link";
import { useMemo } from "react";
import { FlatLay } from "@/components/FlatLay";
import { addDays, dayOfMonth, weekday } from "@/lib/dates";
import { OCCASION_LABEL } from "@/lib/engine/describe";
import { planWeek, type WeekDay } from "@/lib/engine/generate";
import { useForecast } from "@/state/forecast";
import { defaultOccasion, useWardrobe } from "@/state/wardrobe";

export default function WeekPage() {
  const { ready, today, items, wears, plans, feedback, comfort, tripDayFor, trips } = useWardrobe();
  const forecast = useForecast();

  const days: WeekDay[] = useMemo(
    () =>
      Array.from({ length: 7 }, (_, n) => {
        const date = addDays(today, n);
        const plan = plans[date];
        const trip = tripDayFor(date);
        if (!plan && trip) return { date, occasion: trip.day.occasion, weather: trip.day.weather, planned: trip.day.itemIds };
        return { date, occasion: plan?.occasion ?? defaultOccasion(date), weather: forecast.weatherFor(date), planned: plan?.itemIds };
      }),
    [today, plans, forecast, tripDayFor],
  );
  const looks = useMemo(
    () => (ready ? planWeek(days, { items, wears, feedback, comfort }) : []),
    [ready, days, items, wears, feedback, comfort],
  );

  return (
    <>
      <div className="page-head">
        <span className="eyebrow">Next 7 days · {forecast.status === "live" ? `live forecast, ${forecast.cityName}` : "sample forecast"}</span>
        <h1 className="display page-title">The week</h1>
        <div className="head-actions">
          <Link href={trips.length ? "/trips" : "/trips?new=1"} className="chip chip-add">
            {trips.length ? `Trips · ${trips.filter((t) => t.end >= today).length} coming up` : "+ Plan a trip"}
          </Link>
        </div>
      </div>
      <div className="week">
        {ready &&
          days.map((d, i) => {
            const look = looks[i];
            const trip = !plans[d.date] ? tripDayFor(d.date)?.trip : undefined;
            const temps = [d.weather.morning.feels, d.weather.midday.feels, d.weather.evening.feels];
            const wet = Math.max(d.weather.morning.rain, d.weather.midday.rain, d.weather.evening.rain) >= 50;
            return (
              <Link key={d.date} href={i === 0 ? "/" : `/?date=${d.date}`} className="week-row">
                <span className="week-day label">
                  {i === 0 ? "Today" : weekday(d.date)}
                  <b>{dayOfMonth(d.date)}</b>
                </span>
                <span className="week-thumb plinth">{look && <FlatLay pieces={look.pieces} label={look.name} compact />}</span>
                <span className="week-text">
                  <span className="week-name">{look?.name ?? "No complete look"}</span>
                  <span className="week-sub">
                    {OCCASION_LABEL[d.occasion]} · {Math.min(...temps)}°→{Math.max(...temps)}°
                    {wet && <span className="wet"> · rain</span>}
                  </span>
                </span>
                <span className={`pill${d.planned ? " saved" : ""}`}>{trip ? trip.city.name : d.planned ? "Saved" : "Suggested"}</span>
              </Link>
            );
          })}
      </div>
      <p className="footer-note">Suggestions avoid repeating pieces from the day before. Open a day to change it or save it.</p>
    </>
  );
}
