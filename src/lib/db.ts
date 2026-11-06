import { deleteDB, openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Comfort, FeedbackValue, Item, Plan, Trip, Wear } from "./types";

/**
 * This device's copy of a signed-in person's wardrobe, in IndexedDB: one
 * database per account, so people sharing a device never see each other's
 * pieces. The copy saved to the account is the one that lasts (see
 * src/state/cloud.tsx); this one makes the app fast and work offline.
 * Photos are Blobs keyed by item id; the wardrobe state is one record.
 */
export interface PersonalState {
  version: 1;
  /** Items are stored without their runtime image URL. */
  items: Item[];
  wears: Wear[];
  plans: Record<string, Plan>;
  feedback: Record<string, FeedbackValue>;
  comfort: Comfort;
  /** Added after v1 shipped; older records simply have none. */
  trips?: Trip[];
}

interface Schema extends DBSchema {
  state: { key: string; value: PersonalState };
  images: { key: string; value: Blob };
}

/** Before accounts, the one wardrobe on a device lived here. */
export const LEGACY_DB = "ootd";
const STATE_KEY = "personal";

export function accountDbName(userId: string): string {
  return `ootd-u-${userId}`;
}

function open(name: string) {
  return openDB<Schema>(name, 1, {
    upgrade(d) {
      d.createObjectStore("state");
      d.createObjectStore("images");
    },
  });
}

let dbName = LEGACY_DB;
let dbPromise: Promise<IDBPDatabase<Schema>> | null = null;
function db() {
  dbPromise ??= open(dbName);
  return dbPromise;
}

/** Point every call below at one account's database. */
export function selectDatabase(name: string): void {
  if (name === dbName && dbPromise) return;
  const previous = dbPromise;
  dbName = name;
  dbPromise = null;
  void previous?.then((d) => d.close()).catch(() => undefined);
}

/** Remove an account's copy from this device (after it is safely in the account). */
export async function deleteAccountCopy(userId: string): Promise<void> {
  const name = accountDbName(userId);
  if (name === dbName) {
    const previous = dbPromise;
    dbPromise = null;
    dbName = LEGACY_DB;
    await previous?.then((d) => d.close()).catch(() => undefined);
  }
  await deleteDB(name);
}

/** The wardrobe kept on this device before accounts, if any, with its photos. */
export async function readLegacy(): Promise<{ state: PersonalState; images: Map<string, Blob> } | null> {
  try {
    if (typeof indexedDB === "undefined") return null;
    const names = (await indexedDB.databases?.())?.map((d) => d.name) ?? null;
    if (names && !names.includes(LEGACY_DB)) return null;
    const d = await open(LEGACY_DB);
    try {
      const state = await d.get("state", STATE_KEY);
      if (!state || state.version !== 1 || state.items.length === 0) return null;
      const images = new Map<string, Blob>();
      for (const item of state.items) {
        const blob = await d.get("images", item.id);
        if (blob) images.set(item.id, blob);
      }
      return { state, images };
    } finally {
      d.close();
    }
  } catch {
    return null;
  }
}

export function emptyPersonal(): PersonalState {
  return { version: 1, items: [], wears: [], plans: {}, feedback: {}, comfort: "neutral", trips: [] };
}

export async function loadPersonal(): Promise<PersonalState> {
  const s = await (await db()).get("state", STATE_KEY);
  return s && s.version === 1 ? s : emptyPersonal();
}

export async function savePersonal(state: PersonalState): Promise<void> {
  const clean = { ...state, items: state.items.map(({ image: _image, ...rest }) => rest as Item) };
  await (await db()).put("state", clean, STATE_KEY);
}

export async function putImage(id: string, blob: Blob): Promise<void> {
  await (await db()).put("images", blob, id);
}

export async function getImages(ids: string[]): Promise<Map<string, Blob>> {
  const d = await db();
  const out = new Map<string, Blob>();
  await Promise.all(
    ids.map(async (id) => {
      const blob = await d.get("images", id);
      if (blob) out.set(id, blob);
    }),
  );
  return out;
}

export async function deleteImage(id: string): Promise<void> {
  await (await db()).delete("images", id);
}

/** Replace everything (used by backup restore). */
export async function replaceAll(state: PersonalState, images: Map<string, Blob>): Promise<void> {
  const d = await db();
  const tx = d.transaction(["state", "images"], "readwrite");
  await tx.objectStore("images").clear();
  for (const [id, blob] of images) await tx.objectStore("images").put(blob, id);
  await tx.objectStore("state").put({ ...state, items: state.items.map(({ image: _i, ...r }) => r as Item) }, STATE_KEY);
  await tx.done;
}

/** Ask the browser not to evict this site's storage (Safari may still clear it; keep backups). */
export async function requestPersistence(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
