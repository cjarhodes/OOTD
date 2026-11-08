"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { FirstRun, missingEssentials } from "./FirstRun";
import { FlatLay } from "./FlatLay";
import { MuseumLabel } from "./MuseumLabel";
import { isDateKey, longWeekday, shortDate } from "@/lib/dates";
import { OCCASION_LABEL } from "@/lib/engine/describe";
import { idsOf, lookFromIds, swapPiece, TIERS, type GenerateInput } from "@/lib/engine/generate";
import { SLOT_LABEL } from "@/lib/kinds";
import type { Look, Occasion, Slot, Tier } from "@/lib/types";
import { useLooks } from "@/state/engine";
import { forecastLabel, useForecast } from "@/state/forecast";
import { defaultOccasion, TIER_LABEL, useWardrobe } from "@/state/wardrobe";

const OCCASIONS = Object.keys(OCCASION_LABEL) as Occasion[];
type View = Tier | "saved";

function Heart() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"
        fill="currentColor"
        fillOpacity="var(--heart-fill, 0)"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Today's frame before the wardrobe has loaded: rendered on the server, so the
 * page shows its heading and layout at once instead of a blank screen.
 */
export function TodaySkeleton() {
  return (
    <div className="today" aria-busy="true">
      <section className="today-stage" aria-labelledby="today-title">
        <div className="page-head">
          <span className="eyebrow">{"\u00a0"}</span>
          <h1 id="today-title" className="display page-title">
            Today’s look
          </h1>
        </div>
        <div className="chips" aria-hidden="true">
          {OCCASIONS.map((o) => (
            <span key={o} className="chip">
              {OCCASION_LABEL[o]}
            </span>
          ))}
        </div>
        <div className="plinth stage stage-wait" />
      </section>
    </div>
  );
}

export function TodayView() {
  const store = useWardrobe();
  const { ready, today, items, wears, plans, feedback, comfort, mode, tripDayFor } = store;
  const forecast = useForecast();
  const params = useSearchParams();
  const router = useRouter();

  const requested = params.get("date");
  const date = isDateKey(requested) && requested >= today ? requested : today;
  const pin = params.get("pin") ?? undefined;
  const pinnedItem = pin ? items.find((i) => i.id === pin) : undefined;
  const tripDay = tripDayFor(date);
  // A saved plan wins; otherwise a trip day's look counts as the plan.
  const plan = plans[date] ?? (tripDay ? { date, itemIds: tripDay.day.itemIds, occasion: tripDay.day.occasion, tier: "fresh" as const } : undefined);
  const fromTrip = !plans[date] && Boolean(tripDay);

  const [occasionChoice, setOccasionChoice] = useState<Occasion | null>(null);
  const occasion = occasionChoice ?? plan?.occasion ?? defaultOccasion(date);
  const tripWeather = tripDay?.day.weather;
  const [view, setView] = useState<View>("fresh");
  const [shuffle, setShuffle] = useState(0);
  const [override, setOverride] = useState<Look | null>(null);
  const [swapOpen, setSwapOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const shown = useRef(new Set<string>());

  // Open on the saved plan when there is one; reset when the day changes.
  useEffect(() => {
    setView(plans[date] || tripDayFor(date) ? "saved" : "fresh");
    setOccasionChoice(null);
    setOverride(null);
    setShuffle(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, ready]);

  useEffect(() => {
    if (!toast) return;
    // Long enough to read: about a second per dozen words.
    const t = window.setTimeout(() => setToast(null), Math.max(2600, toast.length * 45));
    return () => window.clearTimeout(t);
  }, [toast]);

  const weather = useMemo(() => tripWeather ?? forecast.weatherFor(date), [tripWeather, forecast, date]);
  const input: GenerateInput = useMemo(
    () => ({ items, weather, occasion, date, wears, feedback, comfort, pin, shuffle }),
    [items, weather, occasion, date, wears, feedback, comfort, pin, shuffle],
  );
  const looks = useLooks(ready ? input : null);
  const saved = useMemo(() => (plan ? lookFromIds(plan.itemIds, items, input) : null), [plan, items, input]);

  // If the chosen tier has no look (a small wardrobe), show one that does.
  const shownView: View = view === "saved" || looks?.[view] || !looks ? view : (["fresh", "easy", "bold"] as const).find((t) => looks[t]) ?? view;
  const look: Look | null = override ?? (shownView === "saved" ? saved : (looks?.[shownView] ?? null));
  useEffect(() => {
    if (look) shown.current.add(look.signature);
  }, [look]);

  if (!ready) return <TodaySkeleton />;

  const temps = {
    low: Math.min(weather.morning.feels, weather.midday.feels, weather.evening.feels),
    high: Math.max(weather.morning.feels, weather.midday.feels, weather.evening.feels),
  };
  const isToday = date === today;
  const wornToday = isToday && look ? wears.some((w) => w.date === today && [...w.itemIds].sort().join("+") === look.signature) : false;
  const timesWorn = look
    ? wears.filter((w) => w.date < today && [...w.itemIds].sort().join("+") === look.signature).length
    : 0;
  const loved = look ? feedback[look.signature] === "love" : false;
  const isSavedLook = Boolean(look && plan && look.signature === [...plan.itemIds].sort().join("+"));

  const choose = (v: View) => {
    setView(v);
    setOverride(null);
    setSwapOpen(false);
  };

  const swap = (slot: Slot) => {
    if (!look) return;
    const next = swapPiece(look, slot, input, shown.current);
    if (next) setOverride(next);
    else setToast(`No other ${SLOT_LABEL[slot].toLowerCase()} works with this look.`);
  };

  const tabs: View[] = plan ? ["saved", ...TIERS] : TIERS;

  return (
    <div className="today">
      <section className="today-stage" aria-labelledby="today-title">
        <div className="page-head">
          <span className="eyebrow">
            {shortDate(date)} · {OCCASION_LABEL[occasion]}
          </span>
          <h1 id="today-title" className="display page-title">
            {isToday ? "Today’s look" : `${longWeekday(date)}’s look`}
          </h1>
        </div>

        <div className="chips" role="group" aria-label="Occasion">
          {OCCASIONS.map((o) => (
            <button
              key={o}
              type="button"
              className="chip"
              aria-pressed={o === occasion}
              onClick={() => {
                setOccasionChoice(o);
                setOverride(null);
                if (view === "saved") setView("fresh");
              }}
            >
              {OCCASION_LABEL[o]}
            </button>
          ))}
        </div>

        {pinnedItem && (
          <div className="banner">
            <span>
              Styling around the <strong>{pinnedItem.name.toLowerCase()}</strong>
            </span>
            <button type="button" className="text-link" onClick={() => router.replace(isToday ? "/" : `/?date=${date}`)}>
              Clear
            </button>
          </div>
        )}

        <div className="segmented" role="group" aria-label="How adventurous" style={{ ["--count" as string]: tabs.length }}>
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={shownView === t}
              // An empty tier says why when tapped, rather than doing nothing.
              aria-disabled={t !== "saved" && looks !== null && !looks[t] ? true : undefined}
              onClick={() => {
                if (t === "saved" || !looks || looks[t]) return choose(t);
                const count = TIERS.filter((x) => looks[x]).length;
                setToast(
                  count === 0
                    ? "There’s no look to show yet. Add a top, trousers and shoes."
                    : look?.warning
                      ? `Nothing else you own suits today’s weather, so there’s no ${TIER_LABEL[t]} look yet.`
                      : `Your pieces make ${count === 1 ? "one look" : `${count} looks`} for today, so there’s no ${TIER_LABEL[t]} one yet. Add a few more for more choice.`,
                );
              }}
            >
              {t === "saved" ? (fromTrip ? "Trip" : "Saved") : TIER_LABEL[t]}
            </button>
          ))}
        </div>

        {look?.warning && (
          <p className="banner" role="status">
            {look.warning}
          </p>
        )}
        {look ? (
          <div className="plinth stage">
            {override && <span className="label stage-tag">Swapped</span>}
            <FlatLay pieces={look.pieces} label={`Flat-lay: ${look.name}`} />
          </div>
        ) : !looks && view !== "saved" && !(mode === "personal" && missingEssentials(items).length > 0) ? (
          // Looks are being worked out (a moment, off the main thread).
          <div className="plinth stage stage-wait" aria-busy="true">
            <span className="sr-only">Putting today’s looks together</span>
          </div>
        ) : (
          <div className="plinth empty">
            {mode === "personal" && missingEssentials(items).length > 0 ? (
              <FirstRun />
            ) : (
              <>
                <p>This wardrobe can’t make a complete look for these conditions yet.</p>
                <p>It needs at least a top, bottoms and shoes, plus a warm layer for cold days.</p>
                {mode === "personal" && (
                  <Link href="/add" className="btn alt">
                    Add pieces
                  </Link>
                )}
              </>
            )}
          </div>
        )}
      </section>

      {look && (
        <aside className="today-side" aria-label="About this look">
          <MuseumLabel look={look} temps={temps} worn={timesWorn} />

          <div className="actions">
            {isToday ? (
              <button
                type="button"
                className="btn"
                disabled={wornToday}
                onClick={() => {
                  store.wear(date, idsOf(look.pieces), occasion);
                  setToast("Logged as today’s outfit.");
                }}
              >
                {wornToday ? "Worn today" : "Wear this"}
              </button>
            ) : (
              <button
                type="button"
                className="btn"
                disabled={isSavedLook}
                onClick={() => {
                  store.savePlan({ date, itemIds: idsOf(look.pieces), occasion, tier: view === "saved" ? "fresh" : view });
                  setToast(`Saved for ${shortDate(date)}.`);
                }}
              >
                {isSavedLook ? `Saved for ${shortDate(date).split(" ")[0]}` : `Save for ${shortDate(date).split(" ")[0]}`}
              </button>
            )}
            <button type="button" className="btn alt" aria-expanded={swapOpen} onClick={() => setSwapOpen((o) => !o)}>
              Swap a piece
            </button>
            <button
              type="button"
              className="icon-btn"
              aria-pressed={loved}
              aria-label={loved ? "Remove from favourites" : "Add to favourites"}
              style={{ ["--heart-fill" as string]: loved ? 1 : 0 }}
              onClick={() => {
                store.setFeedback(look.signature, loved ? null : "love");
                if (!loved) setToast("Kept in your lookbook.");
              }}
            >
              <Heart />
            </button>
          </div>

          {swapOpen && (
            <div className="swap-row" role="group" aria-label="Swap one piece">
              {(["base", "mid", "outer", "bottom", "shoes"] as Slot[]).map((slot) => (
                <button key={slot} type="button" className="chip" onClick={() => swap(slot)}>
                  {look.pieces[slot] ? SLOT_LABEL[slot] : `Add ${SLOT_LABEL[slot].toLowerCase()}`}
                </button>
              ))}
            </div>
          )}

          <div>
            <p className="eyebrow" style={{ marginBottom: 10 }}>
              Why it works
            </p>
            <ul className="notes">
              {look.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </div>

          <div>
            <p className="eyebrow" style={{ marginBottom: 6 }}>
              {tripDay ? `${tripDay.trip.city.name} · ${weather.source === "live" ? "forecast" : weather.source === "history" ? "last year’s weather, a guide" : "sample weather"}` : forecastLabel(weather, forecast)}
            </p>
            <div className="weather">
              {(["morning", "midday", "evening"] as const).map((w) => (
                <div key={w}>
                  <span className="label">{w === "morning" ? "8am" : w === "midday" ? "1pm" : "6pm"}</span>
                  <strong>{weather[w].feels}°</strong>
                  <small className={weather[w].rain >= 50 ? "wet" : undefined}>
                    {weather[w].rain >= 50 ? `Rain ${weather[w].rain}%` : `${weather[w].wind} km/h wind`}
                  </small>
                </div>
              ))}
            </div>
          </div>

          <div className="actions">
            <button
              type="button"
              className="btn quiet"
              onClick={() => {
                setShuffle((s) => s + 1);
                setOverride(null);
                if (view === "saved") setView("fresh");
              }}
            >
              Fresh ideas
            </button>
            <button
              type="button"
              className="btn quiet"
              onClick={() => {
                store.setFeedback(look.signature, "skip");
                setOverride(null);
                setToast("Got it. You won’t see that one again.");
              }}
            >
              Not for me
            </button>
            {plan && view === "saved" && !fromTrip && (
              <button
                type="button"
                className="btn quiet"
                onClick={() => {
                  store.removePlan(date);
                  setView("fresh");
                }}
              >
                Remove plan
              </button>
            )}
          </div>
          {!isToday && (
            <Link href="/" className="text-link">
              Back to today
            </Link>
          )}
        </aside>
      )}

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
