import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Comfort, FeedbackValue, Item, Plan, Trip, Wear } from "./types";

/**
 * The personal wardrobe lives only on this device, in IndexedDB. Photos are
 * stored as Blobs keyed by item id; the wardrobe state is one record.
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

const DB = "ootd";
const STATE_KEY = "personal";

let dbPromise: Promise<IDBPDatabase<Schema>> | null = null;
function db() {
  dbPromise ??= openDB<Schema>(DB, 1, {
    upgrade(d) {
      d.createObjectStore("state");
      d.createObjectStore("images");
    },
  });
  return dbPromise;
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
