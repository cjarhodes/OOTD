"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cleanTrip, parseBackup, type Backup } from "@/lib/backup";
import { isDateKey, todayKey } from "@/lib/dates";
import { deleteImage, emptyPersonal, getImages, loadPersonal, putImage, replaceAll, requestPersistence, savePersonal, type PersonalState } from "@/lib/db";
import type { City } from "@/lib/forecast";
import { blobToDataUrl, dataUrlToBlob } from "@/lib/photo";
import { SAMPLE_ITEMS, sampleWears } from "@/lib/sample";
import type { Comfort, FeedbackValue, Item, Occasion, Plan, Tier, Trip, TripDay, Wear } from "@/lib/types";

/**
 * Two wardrobes. The sample wardrobe is fixed illustrations plus whatever you
 * do with it (kept in localStorage). Your wardrobe is photos and history kept
 * in IndexedDB on this device only.
 */
export type Mode = "sample" | "personal";

interface SampleSaved {
  version: 1;
  wears: Wear[];
  plans: Record<string, Plan>;
  feedback: Record<string, FeedbackValue>;
  comfort: Comfort;
  trips: Trip[];
}

interface Prefs {
  mode: Mode;
  city: City | null;
}

const SAMPLE_KEY = "ootd.sample.v1";
const PREFS_KEY = "ootd.prefs.v1";
const EMPTY_SAMPLE: SampleSaved = { version: 1, wears: [], plans: {}, feedback: {}, comfort: "neutral", trips: [] };

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable (private mode, blocked site data). The session still works.
  }
}

function loadSample(): SampleSaved {
  const parsed = readJson<Partial<SampleSaved>>(SAMPLE_KEY);
  if (!parsed || parsed.version !== 1) return EMPTY_SAMPLE;
  return {
    version: 1,
    wears: Array.isArray(parsed.wears) ? parsed.wears.filter((w) => isDateKey(w?.date) && Array.isArray(w.itemIds)) : [],
    plans: parsed.plans && typeof parsed.plans === "object" ? parsed.plans : {},
    feedback: parsed.feedback && typeof parsed.feedback === "object" ? parsed.feedback : {},
    comfort: parsed.comfort === "runs-cold" || parsed.comfort === "runs-warm" ? parsed.comfort : "neutral",
    trips: Array.isArray(parsed.trips)
      ? parsed.trips.map((t) => cleanTrip(t, SAMPLE_IDS)).filter((t): t is Trip => t !== null)
      : [],
  };
}

const SAMPLE_IDS = new Set(SAMPLE_ITEMS.map((i) => i.id));

function loadPrefs(): Prefs {
  const p = readJson<Partial<Prefs>>(PREFS_KEY);
  const city = p?.city;
  return {
    mode: p?.mode === "personal" ? "personal" : "sample",
    city:
      city && typeof city.name === "string" && Number.isFinite(city.latitude) && Number.isFinite(city.longitude) ? city : null,
  };
}

export interface NewPiece {
  item: Item;
  blob: Blob;
}

interface WardrobeContext {
  ready: boolean;
  today: string;
  mode: Mode;
  setMode: (mode: Mode) => void;
  city: City | null;
  setCity: (city: City | null) => void;
  items: Item[];
  wears: Wear[];
  plans: Record<string, Plan>;
  feedback: Record<string, FeedbackValue>;
  comfort: Comfort;
  trips: Trip[];
  /** The trip day covering a date, if any. */
  tripDayFor: (date: string) => { trip: Trip; day: TripDay } | null;
  saveTrip: (trip: Trip) => void;
  deleteTrip: (id: string) => void;
  personalCount: number;
  /** Set when the personal wardrobe couldn't be read or saved. */
  storageError: string | null;
  wear: (date: string, itemIds: string[], occasion: Occasion) => void;
  savePlan: (plan: Plan) => void;
  removePlan: (date: string) => void;
  setFeedback: (signature: string, value: FeedbackValue | null) => void;
  setComfort: (comfort: Comfort) => void;
  addPieces: (pieces: NewPiece[]) => Promise<void>;
  updateItem: (item: Item) => void;
  removeItem: (id: string) => Promise<void>;
  exportBackup: () => Promise<Blob>;
  importBackup: (file: File) => Promise<{ ok: true; count: number } | { ok: false; error: string }>;
}

const Ctx = createContext<WardrobeContext | null>(null);

export function WardrobeProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [today, setToday] = useState("2026-01-01");
  const [prefs, setPrefs] = useState<Prefs>({ mode: "sample", city: null });
  const [sample, setSample] = useState<SampleSaved>(EMPTY_SAMPLE);
  const [personal, setPersonal] = useState<PersonalState>(emptyPersonal());
  const [imageUrls, setImageUrls] = useState<Map<string, string>>(new Map());
  const [storageError, setStorageError] = useState<string | null>(null);
  const personalLoaded = useRef(false);

  useEffect(() => {
    setToday(todayKey());
    setSample(loadSample());
    setPrefs(loadPrefs());
    let cancelled = false;
    (async () => {
      try {
        const state = await loadPersonal();
        const blobs = await getImages(state.items.map((i) => i.id));
        if (cancelled) return;
        setPersonal(state);
        setImageUrls(new Map([...blobs].map(([id, b]) => [id, URL.createObjectURL(b)])));
        personalLoaded.current = true;
      } catch {
        if (!cancelled) setStorageError("Your wardrobe couldn’t be opened on this device. Changes to it are paused.");
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Revoke object URLs that are no longer used.
  const urlsRef = useRef(imageUrls);
  useEffect(() => {
    const previous = urlsRef.current;
    for (const [id, url] of previous) if (imageUrls.get(id) !== url) URL.revokeObjectURL(url);
    urlsRef.current = imageUrls;
  }, [imageUrls]);

  const updatePrefs = useCallback((fn: (p: Prefs) => Prefs) => {
    setPrefs((prev) => {
      const next = fn(prev);
      writeJson(PREFS_KEY, next);
      return next;
    });
  }, []);

  const updateSample = useCallback((fn: (s: SampleSaved) => SampleSaved) => {
    setSample((prev) => {
      const next = fn(prev);
      writeJson(SAMPLE_KEY, next);
      return next;
    });
  }, []);

  const updatePersonal = useCallback((fn: (s: PersonalState) => PersonalState) => {
    if (!personalLoaded.current) return;
    setPersonal((prev) => {
      const next = fn(prev);
      savePersonal(next).catch(() => setStorageError("The last change couldn’t be saved on this device. Export a backup."));
      return next;
    });
  }, []);

  const value = useMemo<WardrobeContext>(() => {
    const isPersonal = prefs.mode === "personal";
    // History-style actions apply to whichever wardrobe is showing.
    const apply = (fn: (s: { wears: Wear[]; plans: Record<string, Plan>; feedback: Record<string, FeedbackValue>; comfort: Comfort; trips: Trip[] }) => Partial<SampleSaved>) => {
      if (isPersonal) updatePersonal((s) => ({ ...s, ...fn({ ...s, trips: s.trips ?? [] }) }));
      else updateSample((s) => ({ ...s, ...fn(s) }));
    };
    const personalItems = personal.items.map((i) => (imageUrls.has(i.id) ? { ...i, image: imageUrls.get(i.id) } : i));
    const active = isPersonal ? personal : sample;
    const trips = (isPersonal ? personal.trips : sample.trips) ?? [];

    return {
      ready,
      today,
      mode: prefs.mode,
      setMode: (mode) => updatePrefs((p) => ({ ...p, mode })),
      city: prefs.city,
      setCity: (city) => updatePrefs((p) => ({ ...p, city })),
      items: isPersonal ? personalItems : SAMPLE_ITEMS,
      wears: isPersonal ? personal.wears : [...(ready ? sampleWears(today) : []), ...sample.wears],
      plans: active.plans,
      feedback: active.feedback,
      comfort: active.comfort,
      trips,
      tripDayFor: (date) => {
        for (const trip of trips) {
          if (date < trip.start || date > trip.end) continue;
          const day = trip.days.find((d) => d.date === date && d.itemIds.length > 0);
          if (day) return { trip, day };
        }
        return null;
      },
      saveTrip: (trip) => apply((s) => ({ trips: [...s.trips.filter((t) => t.id !== trip.id), trip] })),
      deleteTrip: (id) => apply((s) => ({ trips: s.trips.filter((t) => t.id !== id) })),
      personalCount: personal.items.length,
      storageError,
      wear: (date, itemIds, occasion) => apply((s) => ({ wears: [...s.wears.filter((w) => w.date !== date), { date, itemIds, occasion }] })),
      savePlan: (plan) => apply((s) => ({ plans: { ...s.plans, [plan.date]: plan } })),
      removePlan: (date) =>
        apply((s) => {
          const plans = { ...s.plans };
          delete plans[date];
          return { plans };
        }),
      setFeedback: (signature, v) =>
        apply((s) => {
          const feedback = { ...s.feedback };
          if (v) feedback[signature] = v;
          else delete feedback[signature];
          return { feedback };
        }),
      setComfort: (comfort) => apply(() => ({ comfort })),

      addPieces: async (pieces) => {
        if (!personalLoaded.current) throw new Error("Your wardrobe isn’t available on this device.");
        for (const p of pieces) await putImage(p.item.id, p.blob);
        setImageUrls((prev) => {
          const next = new Map(prev);
          for (const p of pieces) next.set(p.item.id, URL.createObjectURL(p.blob));
          return next;
        });
        updatePersonal((s) => ({ ...s, items: [...s.items, ...pieces.map(({ item: { image: _i, ...rest } }) => rest as Item)] }));
        void requestPersistence();
      },
      updateItem: (item) => {
        const { image: _i, ...rest } = item;
        updatePersonal((s) => ({ ...s, items: s.items.map((i) => (i.id === item.id ? (rest as Item) : i)) }));
      },
      removeItem: async (id) => {
        await deleteImage(id);
        setImageUrls((prev) => {
          const next = new Map(prev);
          next.delete(id);
          return next;
        });
        updatePersonal((s) => {
          const plans: Record<string, Plan> = {};
          for (const [d, p] of Object.entries(s.plans)) if (!p.itemIds.includes(id)) plans[d] = p;
          const drop = (list: string[]) => list.filter((x) => x !== id);
          const trips = (s.trips ?? []).map((t) => ({
            ...t,
            capsule: drop(t.capsule),
            journey: drop(t.journey),
            packed: drop(t.packed),
            days: t.days.map((d) => (d.itemIds.includes(id) ? { ...d, itemIds: [] } : d)),
          }));
          return { ...s, items: s.items.filter((i) => i.id !== id), plans, trips };
        });
      },

      exportBackup: async () => {
        const images: Record<string, string> = {};
        const blobs = await getImages(personal.items.map((i) => i.id));
        for (const [id, blob] of blobs) images[id] = await blobToDataUrl(blob);
        const backup: Backup = { app: "ootd", version: 1, exportedAt: new Date().toISOString(), state: personal, images };
        return new Blob([JSON.stringify(backup)], { type: "application/json" });
      },
      importBackup: async (file) => {
        let json: unknown;
        try {
          json = JSON.parse(await file.text());
        } catch {
          return { ok: false, error: "That file isn’t readable JSON." };
        }
        const parsed = parseBackup(json);
        if (!parsed.ok) return parsed;
        const blobs = new Map<string, Blob>();
        for (const [id, url] of Object.entries(parsed.backup.images)) blobs.set(id, await dataUrlToBlob(url));
        await replaceAll(parsed.backup.state, blobs);
        personalLoaded.current = true;
        setPersonal(parsed.backup.state);
        setImageUrls(new Map([...blobs].map(([id, b]) => [id, URL.createObjectURL(b)])));
        setStorageError(null);
        return { ok: true, count: parsed.backup.state.items.length };
      },
    };
  }, [ready, today, prefs, sample, personal, imageUrls, storageError, updatePrefs, updateSample, updatePersonal]);

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

export function newId(): string {
  return `i-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
