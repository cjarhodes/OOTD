"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { isDateKey, todayKey } from "@/lib/dates";
import { SAMPLE_ITEMS, sampleWears } from "@/lib/sample";
import type { Comfort, FeedbackValue, Item, Occasion, Plan, Tier, Wear } from "@/lib/types";

/**
 * Sample-mode state. The sample wardrobe itself is fixed; what you do with it
 * (wears, plans, feedback) is kept in this browser only. The personal wardrobe
 * (photos in IndexedDB) arrives in the next milestone.
 */
interface Saved {
  version: 1;
  wears: Wear[];
  plans: Record<string, Plan>;
  feedback: Record<string, FeedbackValue>;
  comfort: Comfort;
}

const KEY = "ootd.sample.v1";
const EMPTY: Saved = { version: 1, wears: [], plans: {}, feedback: {}, comfort: "neutral" };

function load(): Saved {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<Saved>;
    if (parsed.version !== 1) return EMPTY;
    return {
      version: 1,
      wears: Array.isArray(parsed.wears) ? parsed.wears.filter((w) => isDateKey(w?.date) && Array.isArray(w.itemIds)) : [],
      plans: parsed.plans && typeof parsed.plans === "object" ? parsed.plans : {},
      feedback: parsed.feedback && typeof parsed.feedback === "object" ? parsed.feedback : {},
      comfort: parsed.comfort === "runs-cold" || parsed.comfort === "runs-warm" ? parsed.comfort : "neutral",
    };
  } catch {
    return EMPTY;
  }
}

function persist(saved: Saved) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(saved));
  } catch {
    // Storage can be unavailable (private mode, blocked site data). The session still works.
  }
}

interface WardrobeContext {
  ready: boolean;
  today: string;
  items: Item[];
  /** Sample history plus anything recorded in this browser. */
  wears: Wear[];
  plans: Record<string, Plan>;
  feedback: Record<string, FeedbackValue>;
  comfort: Comfort;
  wear: (date: string, itemIds: string[], occasion: Occasion) => void;
  savePlan: (plan: Plan) => void;
  removePlan: (date: string) => void;
  setFeedback: (signature: string, value: FeedbackValue | null) => void;
  setComfort: (comfort: Comfort) => void;
}

const Ctx = createContext<WardrobeContext | null>(null);

export function WardrobeProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [today, setToday] = useState("2026-01-01");
  const [saved, setSaved] = useState<Saved>(EMPTY);

  useEffect(() => {
    setToday(todayKey());
    setSaved(load());
    setReady(true);
  }, []);

  const update = useCallback((fn: (s: Saved) => Saved) => {
    setSaved((prev) => {
      const next = fn(prev);
      persist(next);
      return next;
    });
  }, []);

  const value = useMemo<WardrobeContext>(() => {
    const history = ready ? sampleWears(today) : [];
    return {
      ready,
      today,
      items: SAMPLE_ITEMS,
      wears: [...history, ...saved.wears],
      plans: saved.plans,
      feedback: saved.feedback,
      comfort: saved.comfort,
      wear: (date, itemIds, occasion) =>
        update((s) => ({ ...s, wears: [...s.wears.filter((w) => w.date !== date), { date, itemIds, occasion }] })),
      savePlan: (plan) => update((s) => ({ ...s, plans: { ...s.plans, [plan.date]: plan } })),
      removePlan: (date) =>
        update((s) => {
          const plans = { ...s.plans };
          delete plans[date];
          return { ...s, plans };
        }),
      setFeedback: (signature, v) =>
        update((s) => {
          const feedback = { ...s.feedback };
          if (v) feedback[signature] = v;
          else delete feedback[signature];
          return { ...s, feedback };
        }),
      setComfort: (comfort) => update((s) => ({ ...s, comfort })),
    };
  }, [ready, today, saved, update]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWardrobe(): WardrobeContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWardrobe must be used inside WardrobeProvider");
  return ctx;
}

export function defaultOccasion(date: string): Occasion {
  const day = new Date(`${date}T12:00:00`).getDay();
  return day === 0 || day === 6 ? "weekend" : "office";
}

export const TIER_LABEL: Record<Tier, string> = { easy: "Easy", fresh: "Fresh", bold: "Bold" };
