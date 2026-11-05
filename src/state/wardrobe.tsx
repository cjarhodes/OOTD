"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { buildArchive, readArchive, type Photo } from "@/lib/archive";
import { cleanTrip } from "@/lib/backup";
import { isDateKey, todayKey } from "@/lib/dates";
import {
  accountDbName,
  deleteImage,
  emptyPersonal,
  getImages,
  loadPersonal,
  putImage,
  readLegacy,
  replaceAll,
  requestPersistence,
  savePersonal,
  selectDatabase,
  type PersonalState,
} from "@/lib/db";
import type { City } from "@/lib/forecast";
import { hashBlob } from "@/lib/photo";
import { SAMPLE_ITEMS, sampleWears } from "@/lib/sample";
import { useAuth } from "./auth";
import type { Comfort, FeedbackValue, Item, Occasion, Plan, Tier, Trip, TripDay, Wear } from "@/lib/types";

/**
 * Two wardrobes. The sample wardrobe is fixed illustrations plus whatever you
 * do with it (kept in localStorage). Your wardrobe belongs to your account:
 * src/state/cloud.tsx keeps it saved there, IndexedDB holds this device's
 * copy (one database per account), and it exports as a plain ZIP.
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
const EXPORT_KEY = "ootd.exported.v1";
const LEGACY_KEY = "ootd.legacy-moved.v1";

function legacyMoved(): boolean {
  return readJson<string>(LEGACY_KEY) !== null;
}

function markLegacyMoved(userId: string) {
  writeJson(LEGACY_KEY, userId);
}
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
  /** A ZIP of everything: CSV, JSON and the photos as ordinary files. */
  exportBackup: () => Promise<Blob>;
  /** Restore from an export ZIP or an older JSON backup. */
  importBackup: (file: File) => Promise<{ ok: true; count: number } | { ok: false; error: string }>;
  /** The personal wardrobe as stored (for cloud backup). Null until it has loaded. */
  personalState: PersonalState | null;
  /** Photo blobs for the given piece ids. */
  photoBlobs: (ids: string[]) => Promise<Map<string, Blob>>;
  /** Replace the personal wardrobe wholesale (cloud restore). */
  replacePersonal: (state: PersonalState, photos: Map<string, Blob>) => Promise<void>;
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
  const [personalReady, setPersonalReady] = useState(false);
  const personalLoaded = useRef(false);

  useEffect(() => {
    setToday(todayKey());
    setSample(loadSample());
    setPrefs(loadPrefs());
  }, []);

  // Load the signed-in account's wardrobe from this device, and reload when
  // someone else signs in. Signed out, there is no personal wardrobe.
  const { ready: authReady, user } = useAuth();
  const userId = user?.id ?? null;
  useEffect(() => {
    if (!authReady) return;
    personalLoaded.current = false;
    setPersonalReady(false);
    setPersonal(emptyPersonal());
    setImageUrls(new Map());
    setStorageError(null);
    if (!userId) {
      setReady(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        selectDatabase(accountDbName(userId));
        let state = await loadPersonal();
        let blobs = await getImages(state.items.map((i) => i.id));
        // The first account to sign in on a device takes the wardrobe that was
        // kept here before accounts existed (it is then backed up to the account).
        if (state.items.length === 0 && !legacyMoved()) {
          const legacy = await readLegacy();
          if (legacy && !cancelled) {
            await replaceAll(legacy.state, legacy.images);
            markLegacyMoved(userId);
            state = legacy.state;
            blobs = legacy.images;
          }
        }
        if (cancelled) return;
        setPersonal(state);
        setImageUrls(new Map([...blobs].map(([id, b]) => [id, URL.createObjectURL(b)])));
        personalLoaded.current = true;
        setPersonalReady(true);
        // Pieces added before photos were hashed get their hash now.
        const missing = state.items.filter((i) => !i.photoHash && blobs.has(i.id));
        if (missing.length) {
          const hashes = new Map<string, string>();
          for (const i of missing) hashes.set(i.id, await hashBlob(blobs.get(i.id)!));
          if (cancelled) return;
          setPersonal((prev) => {
            const next = { ...prev, items: prev.items.map((i) => (hashes.has(i.id) && !i.photoHash ? { ...i, photoHash: hashes.get(i.id) } : i)) };
            void savePersonal(next).catch(() => undefined);
            return next;
          });
        }
      } catch {
        if (!cancelled) setStorageError("Your wardrobe couldn’t be opened on this device. Changes to it are paused.");
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authReady, userId]);

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

  const replacePersonal = useCallback(async (state: PersonalState, photos: Map<string, Blob>) => {
    await replaceAll(state, photos);
    personalLoaded.current = true;
    setPersonalReady(true);
    setPersonal(state);
    setImageUrls(new Map([...photos].map(([id, b]) => [id, URL.createObjectURL(b)])));
    setStorageError(null);
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
        const hashes = new Map<string, string>();
        for (const p of pieces) {
          await putImage(p.item.id, p.blob);
          hashes.set(p.item.id, await hashBlob(p.blob));
        }
        setImageUrls((prev) => {
          const next = new Map(prev);
          for (const p of pieces) next.set(p.item.id, URL.createObjectURL(p.blob));
          return next;
        });
        updatePersonal((s) => ({
          ...s,
          items: [...s.items, ...pieces.map(({ item: { image: _i, ...rest } }) => ({ ...rest, photoHash: hashes.get(rest.id) }) as Item)],
        }));
        void requestPersistence();
      },
      updateItem: (item) => {
        const { image: _i, ...rest } = item;
        // Editing details never changes the photo, so keep its hash.
        updatePersonal((s) => ({ ...s, items: s.items.map((i) => (i.id === item.id ? ({ ...rest, photoHash: i.photoHash } as Item) : i)) }));
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
        const blobs = await getImages(personal.items.map((i) => i.id));
        const photos = new Map<string, Photo>();
        for (const [id, blob] of blobs) photos.set(id, { bytes: new Uint8Array(await blob.arrayBuffer()), type: blob.type });
        const zip = buildArchive(personal, photos);
        writeJson(EXPORT_KEY, { at: new Date().toISOString(), pieces: personal.items.length });
        return new Blob([zip as Uint8Array<ArrayBuffer>], { type: "application/zip" });
      },
      importBackup: async (file) => {
        if (!personalLoaded.current) return { ok: false, error: "Sign in first, so the restored wardrobe is saved to your account." };
        const read = readArchive(new Uint8Array(await file.arrayBuffer()));
        if (!read.ok) return read;
        const blobs = new Map<string, Blob>();
        const items: Item[] = [];
        for (const item of read.state.items) {
          const photo = read.photos.get(item.id);
          if (!photo) {
            items.push(item);
            continue;
          }
          const blob = new Blob([photo.bytes as Uint8Array<ArrayBuffer>], { type: photo.type });
          blobs.set(item.id, blob);
          items.push({ ...item, photoHash: await hashBlob(blob) });
        }
        await replacePersonal({ ...read.state, items }, blobs);
        return { ok: true, count: items.length };
      },
      personalState: personalReady ? personal : null,
      photoBlobs: getImages,
      replacePersonal,
    };
  }, [ready, today, prefs, sample, personal, personalReady, imageUrls, storageError, updatePrefs, updateSample, updatePersonal, replacePersonal]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWardrobe(): WardrobeContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWardrobe must be used inside WardrobeProvider");
  return ctx;
}

/** When this device last downloaded an export, and how many pieces it held. */
export function lastExport(): { at: string; pieces: number } | null {
  const v = readJson<{ at?: unknown; pieces?: unknown }>(EXPORT_KEY);
  return v && typeof v.at === "string" && typeof v.pieces === "number" ? { at: v.at, pieces: v.pieces } : null;
}

export function defaultOccasion(date: string): Occasion {
  const day = new Date(`${date}T12:00:00`).getDay();
  return day === 0 || day === 6 ? "weekend" : "office";
}

export const TIER_LABEL: Record<Tier, string> = { easy: "Easy", fresh: "Fresh", bold: "Bold" };

export function newId(): string {
  return `i-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
