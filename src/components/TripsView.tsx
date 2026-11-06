"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { FlatLay } from "./FlatLay";
import { GarmentTile } from "./art/Garment";
import { addDays, isDateKey, shortDate, weekday, dayOfMonth } from "@/lib/dates";
import { buildCapsule, capsuleLimit, nextCapsuleLook, tripOccasions, tripWeatherSummary } from "@/lib/engine/capsule";
import { OCCASION_LABEL } from "@/lib/engine/describe";
import { lookFromIds } from "@/lib/engine/generate";
import { sampleWeather } from "@/lib/engine/weather";
import { cityLabel, fetchTripWeather, searchCities, type City } from "@/lib/forecast";
import { SLOT_LABEL } from "@/lib/kinds";
import type { Occasion, Slot, Trip, TripKind } from "@/lib/types";
import { newId, useWardrobe } from "@/state/wardrobe";

const KIND_LABEL: Record<TripKind, string> = { work: "Work trip", leisure: "Leisure", mixed: "Mixed" };
const OCCASIONS = Object.keys(OCCASION_LABEL) as Occasion[];
const SLOTS: Slot[] = ["outer", "mid", "base", "bottom", "shoes"];
const MAX_DAYS = 21;

function dateRange(start: string, end: string): string[] {
  const out: string[] = [];
  for (let d = start; d <= end && out.length < MAX_DAYS; d = addDays(d, 1)) out.push(d);
  return out;
}

function sourceNote(trip: Trip): string {
  const sources = new Set(trip.days.map((d) => d.weather.source));
  if (sources.size === 1 && sources.has("live")) return `Forecast for ${trip.city.name}`;
  if (sources.has("live") && sources.has("history")) return `Forecast where it reaches, then last year’s weather in ${trip.city.name} as a guide`;
  if (sources.has("history")) return `Last year’s weather in ${trip.city.name} on these dates, as a guide. Rebuild nearer the time for the forecast.`;
  return "Sample weather: the forecast wasn’t available";
}

/* ---------- plan a trip ---------- */

function TripForm({ onCreated }: { onCreated: (id: string) => void }) {
  const store = useWardrobe();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<City[] | null>(null);
  const [city, setCity] = useState<City | null>(null);
  const [start, setStart] = useState(addDays(store.today, 7));
  const [end, setEnd] = useState(addDays(store.today, 10));
  const [kind, setKind] = useState<TripKind>("work");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const days = isDateKey(start) && isDateKey(end) && end >= start ? dateRange(start, end).length : 0;
  const tooLong = isDateKey(start) && isDateKey(end) && addDays(start, MAX_DAYS - 1) < end;
  const valid = Boolean(city) && days > 0 && !tooLong && start >= store.today;

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!city || !valid) return;
    setError(null);
    setBusy("Checking the weather…");
    const dates = dateRange(start, end);
    const { days: weather } = await fetchTripWeather(city, dates);
    setBusy("Packing the capsule…");
    // Let the status paint before the (synchronous) capsule search.
    await new Promise((r) => setTimeout(r, 20));
    const plan = tripOccasions(start, end, kind).map((d) => ({ ...d, weather: weather[d.date] ?? sampleWeather(d.date) }));
    const result = buildCapsule(plan, { items: store.items, wears: store.wears, feedback: store.feedback, comfort: store.comfort });
    if (result.capsule.length === 0) {
      setBusy(null);
      setError("This wardrobe can’t make complete looks for that trip yet. Add a top, bottoms and shoes first.");
      return;
    }
    const trip: Trip = {
      id: newId(),
      name: `${city.name}, ${shortDate(start).replace(/^\w+ /, "")} – ${shortDate(end).replace(/^\w+ /, "")}`,
      city: { name: city.name, admin: city.admin, country: city.country, latitude: city.latitude, longitude: city.longitude },
      start,
      end,
      kind,
      ...result,
      packed: [],
      createdAt: new Date().toISOString(),
    };
    store.saveTrip(trip);
    setBusy(null);
    onCreated(trip.id);
  }

  return (
    <form className="trip-form" onSubmit={create}>
      <div className="field">
        <span className="label">Where to?</span>
        {city ? (
          <div className="setting-row">
            <strong>{cityLabel(city)}</strong>
            <button type="button" className="text-link" onClick={() => setCity(null)}>
              Change
            </button>
          </div>
        ) : (
          <>
            <div className="setting-row">
              <input
                id="trip-city"
                className="input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    setResults(await searchCities(query).catch(() => []));
                  }
                }}
                placeholder="Search for a city"
                aria-label="Destination"
              />
              <button type="button" className="btn alt" disabled={query.trim().length < 2} onClick={async () => setResults(await searchCities(query).catch(() => []))}>
                Search
              </button>
            </div>
            {results && (
              <ul className="results">
                {results.length === 0 && <li className="setting-note">No places found.</li>}
                {results.map((c) => (
                  <li key={`${c.latitude},${c.longitude}`}>
                    <button type="button" onClick={() => setCity(c)}>
                      {cityLabel(c)}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      <div className="field-row">
        <label className="field" htmlFor="trip-start">
          <span className="label">Leave</span>
          <input id="trip-start" className="input" type="date" value={start} min={store.today} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label className="field" htmlFor="trip-end">
          <span className="label">Return</span>
          <input id="trip-end" className="input" type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} />
        </label>
      </div>

      <div className="segmented" role="group" aria-label="Kind of trip" style={{ ["--count" as string]: 3 }}>
        {(Object.keys(KIND_LABEL) as TripKind[]).map((k) => (
          <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}>
            {KIND_LABEL[k]}
          </button>
        ))}
      </div>
      <p className="setting-note">
        {days > 0 && !tooLong
          ? `${days} ${days === 1 ? "day" : "days"}. Travel days at each end${kind === "work" ? ", customer meetings in between" : kind === "leisure" ? ", weekend dressing in between" : ", office days and dinners in between"}. You can change any day after. Up to ${capsuleLimit(days)} pieces.`
          : tooLong
            ? `Trips can be up to ${MAX_DAYS} days.`
            : "Choose your dates."}
      </p>
      {error && <p className="banner">{error}</p>}
      <button type="submit" className="btn" disabled={!valid || Boolean(busy)}>
        {busy ?? "Pack a capsule"}
      </button>
    </form>
  );
}

/* ---------- one trip ---------- */

function TripDetail({ trip }: { trip: Trip }) {
  const store = useWardrobe();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const capsuleItems = useMemo(() => store.items.filter((i) => trip.capsule.includes(i.id)), [store.items, trip.capsule]);
  const journey = new Set(trip.journey);
  const packed = new Set(trip.packed);
  const toPack = capsuleItems.filter((i) => !journey.has(i.id));
  const packedCount = toPack.filter((i) => packed.has(i.id)).length;
  const base = { wears: store.wears, feedback: store.feedback, comfort: store.comfort };

  const togglePacked = (id: string) =>
    store.saveTrip({ ...trip, packed: packed.has(id) ? trip.packed.filter((x) => x !== id) : [...trip.packed, id] });

  const anotherLook = (index: number, occasion?: Occasion) => {
    const day = { ...trip.days[index]!, occasion: occasion ?? trip.days[index]!.occasion };
    const current = [...day.itemIds].sort().join("+");
    const next = nextCapsuleLook(day, capsuleItems, base, occasion ? new Set() : new Set([current]));
    const days = trip.days.map((d, i) => (i === index ? { ...day, itemIds: next ? [next.pieces.base, next.pieces.mid, next.pieces.outer, next.pieces.bottom, next.pieces.shoes].filter(Boolean).map((p) => p!.id) : d.itemIds } : d));
    store.saveTrip({ ...trip, days });
  };

  async function rebuild() {
    setBusy(true);
    const dates = trip.days.map((d) => d.date);
    const { days: weather } = await fetchTripWeather(trip.city, dates);
    await new Promise((r) => setTimeout(r, 20));
    const plan = trip.days.map((d) => ({ date: d.date, occasion: d.occasion, weather: weather[d.date] ?? d.weather }));
    const result = buildCapsule(plan, { items: store.items, ...base });
    store.saveTrip({ ...trip, ...result, packed: trip.packed.filter((id) => result.capsule.includes(id)) });
    setBusy(false);
  }

  return (
    <>
      <div className="page-head">
        <span className="eyebrow">
          {KIND_LABEL[trip.kind]} · {shortDate(trip.start)} – {shortDate(trip.end)}
        </span>
        <h1 className="display page-title">{trip.city.name}</h1>
        <p className="setting-note">
          {tripWeatherSummary(trip.days)}. {sourceNote(trip)}
        </p>
      </div>

      <section className="trip-summary plinth">
        <div>
          <strong className="display trip-number">{trip.capsule.length}</strong>
          <span className="label">pieces</span>
        </div>
        <div>
          <strong className="display trip-number">{trip.looksPossible}</strong>
          <span className="label">looks possible</span>
        </div>
        <div>
          <strong className="display trip-number">{trip.days.length}</strong>
          <span className="label">{trip.days.length === 1 ? "day" : "days"}</span>
        </div>
      </section>

      {trip.warnings.length > 0 && (
        <div className="banner" role="status">
          <span>{trip.warnings[0]!.replace(/^\d{4}-\d{2}-\d{2}: /, "")}</span>
        </div>
      )}

      <section className="block" aria-labelledby="pack-title">
        <div className="p-row-head">
          <h2 id="pack-title" className="setting-title">
            Pack
          </h2>
          <span className="label">
            {packedCount} of {toPack.length} packed
          </span>
        </div>
        {trip.journey.length > 0 && (
          <p className="setting-note">
            Wear on the journey: {capsuleItems.filter((i) => journey.has(i.id)).map((i) => i.name.toLowerCase()).join(" and ")}. Bulky pieces travel on you, not in the bag.
          </p>
        )}
        <div className="wardrobe-grid">
          {SLOTS.flatMap((slot) => capsuleItems.filter((i) => i.slot === slot)).map((item) => {
            const onJourney = journey.has(item.id);
            const done = onJourney || packed.has(item.id);
            return (
              <button
                key={item.id}
                type="button"
                className={`tile pack-tile${done ? " is-packed" : ""}`}
                aria-pressed={done}
                disabled={onJourney}
                onClick={() => togglePacked(item.id)}
              >
                <GarmentTile item={item} decorative />
                <span className="tile-name">{item.name}</span>
                <span className={`tile-meta${done ? " new" : ""}`}>
                  {SLOT_LABEL[item.slot]} · {onJourney ? "Wear it" : done ? "Packed" : "Tap when packed"}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="block" aria-labelledby="days-title">
        <h2 id="days-title" className="setting-title">
          Day by day
        </h2>
        <div className="week">
          {trip.days.map((d, i) => {
            const look = d.itemIds.length ? lookFromIds(d.itemIds, store.items, { weather: d.weather, occasion: d.occasion, date: d.date, comfort: store.comfort }) : null;
            const temps = [d.weather.morning.feels, d.weather.midday.feels, d.weather.evening.feels];
            const wet = Math.max(d.weather.morning.rain, d.weather.midday.rain, d.weather.evening.rain) >= 50;
            return (
              <div key={d.date} className="week-row trip-row">
                <span className="week-day label">
                  {weekday(d.date)}
                  <b>{dayOfMonth(d.date)}</b>
                </span>
                <span className="week-thumb plinth">{look && <FlatLay pieces={look.pieces} label={look.name} compact />}</span>
                <span className="week-text">
                  <span className="week-name">{look?.name ?? "No complete look"}</span>
                  <span className="week-sub">
                    {Math.min(...temps)}°→{Math.max(...temps)}°{wet && <span className="wet"> · rain</span>}
                    {d.weather.source === "history" && " · last year"}
                  </span>
                  <span className="trip-controls">
                    <select
                      className="input input-small"
                      aria-label={`Occasion on ${shortDate(d.date)}`}
                      value={d.occasion}
                      onChange={(e) => anotherLook(i, e.target.value as Occasion)}
                    >
                      {OCCASIONS.map((o) => (
                        <option key={o} value={o}>
                          {OCCASION_LABEL[o]}
                        </option>
                      ))}
                    </select>
                    <button type="button" className="text-link" onClick={() => anotherLook(i)}>
                      Another look
                    </button>
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <div className="actions">
        <button type="button" className="btn alt" disabled={busy} onClick={() => void rebuild()}>
          {busy ? "Repacking…" : "Update weather and repack"}
        </button>
        <Link href="/trips" className="btn quiet">
          All trips
        </Link>
      </div>
      {confirmDelete ? (
        <div className="banner" role="alert">
          <span>Delete this trip? Your wardrobe isn’t affected.</span>
          <span className="actions">
            <button
              type="button"
              className="btn"
              onClick={() => {
                store.deleteTrip(trip.id);
                router.replace("/trips");
              }}
            >
              Delete trip
            </button>
            <button type="button" className="btn quiet" onClick={() => setConfirmDelete(false)}>
              Keep
            </button>
          </span>
        </div>
      ) : (
        <button type="button" className="text-link" onClick={() => setConfirmDelete(true)}>
          Delete trip
        </button>
      )}
    </>
  );
}

/* ---------- list ---------- */

export function TripsView() {
  const store = useWardrobe();
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get("id");
  const [planning, setPlanning] = useState(params.get("new") === "1");

  if (!store.ready) return <div className="empty" aria-busy="true" />;

  const trip = id ? store.trips.find((t) => t.id === id) : undefined;
  if (id && trip) return <TripDetail trip={trip} />;

  const upcoming = [...store.trips].filter((t) => t.end >= store.today).sort((a, b) => a.start.localeCompare(b.start));
  const past = [...store.trips].filter((t) => t.end < store.today).sort((a, b) => b.start.localeCompare(a.start));

  return (
    <>
      <div className="page-head">
        <span className="eyebrow">{store.mode === "personal" ? "Your wardrobe" : "Sample wardrobe"}</span>
        <h1 className="display page-title">Trips</h1>
        <p className="setting-note">A small capsule that dresses every day of the trip, packed for the weather where you’re going.</p>
      </div>

      {id && !trip && <p className="banner">That trip isn’t on this device.</p>}

      {planning || store.trips.length === 0 ? (
        <TripForm onCreated={(newTripId) => router.replace(`/trips?id=${newTripId}`)} />
      ) : (
        <button type="button" className="btn" onClick={() => setPlanning(true)}>
          Plan a trip
        </button>
      )}

      {[["Coming up", upcoming], ["Past trips", past]].map(([title, list]) =>
        (list as Trip[]).length ? (
          <section key={title as string} className="block">
            <h2 className="setting-title">{title as string}</h2>
            <div className="trip-list">
              {(list as Trip[]).map((t) => (
                <Link key={t.id} href={`/trips?id=${t.id}`} className="trip-card plinth">
                  <span className="label">
                    {shortDate(t.start)} – {shortDate(t.end)} · {KIND_LABEL[t.kind]}
                  </span>
                  <span className="week-name">{t.city.name}</span>
                  <span className="week-sub">
                    {t.capsule.length} pieces · {t.looksPossible} looks · {tripWeatherSummary(t.days)}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ) : null,
      )}
    </>
  );
}
