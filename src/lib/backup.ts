import { isDateKey } from "./dates";
import type { PersonalState } from "./db";
import { KINDS } from "./kinds";
import { COLOR_NAMES } from "./palette";
import { MATERIALS, PATTERNS } from "./tagging";
import type { DayWeather, FeedbackValue, Item, Kind, Occasion, Plan, Status, Tier, Trip, TripKind, Wear } from "./types";

export interface Backup {
  app: "ootd";
  version: 1;
  exportedAt: string;
  state: PersonalState;
  /** Photo data URLs keyed by item id. */
  images: Record<string, string>;
}

const OCCASIONS: Occasion[] = ["office", "client", "weekend", "dinner", "travel"];
const TIERS: Tier[] = ["easy", "fresh", "bold"];
const STATUSES: Status[] = ["available", "laundry", "archived"];
const IMAGE_URL = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;

const num = (v: unknown, min: number, max: number) => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;

export function validItem(v: unknown): v is Item {
  if (!v || typeof v !== "object") return false;
  const i = v as Record<string, unknown>;
  return (
    typeof i.id === "string" &&
    i.id.length > 0 &&
    i.id.length <= 80 &&
    typeof i.name === "string" &&
    i.name.length <= 80 &&
    typeof i.kind === "string" &&
    i.kind in KINDS &&
    i.slot === KINDS[i.kind as Kind].slot &&
    typeof i.color === "string" &&
    (COLOR_NAMES as string[]).includes(i.color) &&
    typeof i.material === "string" &&
    (MATERIALS as string[]).includes(i.material) &&
    typeof i.pattern === "string" &&
    (PATTERNS as string[]).includes(i.pattern) &&
    typeof i.neckline === "string" &&
    (i.front === "open" || i.front === "closed") &&
    num(i.length, 1, 5) &&
    num(i.thickness, 1, 5) &&
    num(i.warmth, 0, 10) &&
    num(i.formality, 1, 5) &&
    num(i.boldness, 0, 2) &&
    typeof i.waterproof === "boolean" &&
    typeof i.delicate === "boolean" &&
    typeof i.status === "string" &&
    (STATUSES as string[]).includes(i.status) &&
    (i.photoHash === undefined || (typeof i.photoHash === "string" && /^[a-f0-9]{64}$/.test(i.photoHash)))
  );
}

const KINDS_OF_TRIP: TripKind[] = ["work", "leisure", "mixed"];

function validWindow(w: unknown): boolean {
  if (!w || typeof w !== "object") return false;
  const x = w as Record<string, unknown>;
  return num(x.feels, -60, 60) && num(x.rain, 0, 100) && num(x.wind, 0, 300);
}

function validWeather(w: unknown): w is DayWeather {
  if (!w || typeof w !== "object") return false;
  const x = w as Record<string, unknown>;
  return isDateKey(x.date) && (x.source === "live" || x.source === "sample" || x.source === "history") && validWindow(x.morning) && validWindow(x.midday) && validWindow(x.evening);
}

/**
 * Clean a stored trip against the pieces that exist. Returns null for anything
 * malformed; references to deleted pieces are dropped.
 */
export function cleanTrip(v: unknown, ids: Set<string>): Trip | null {
  if (!v || typeof v !== "object") return null;
  const t = v as Partial<Trip>;
  const c = t.city as Partial<Trip["city"]> | undefined;
  if (
    typeof t.id !== "string" ||
    typeof t.name !== "string" ||
    t.name.length > 80 ||
    !isDateKey(t.start) ||
    !isDateKey(t.end) ||
    t.end < t.start ||
    !KINDS_OF_TRIP.includes(t.kind as TripKind) ||
    !c ||
    typeof c.name !== "string" ||
    !num(c.latitude, -90, 90) ||
    !num(c.longitude, -180, 180) ||
    !Array.isArray(t.days)
  ) {
    return null;
  }
  const keep = (list: unknown) => (Array.isArray(list) ? list.filter((id): id is string => typeof id === "string" && ids.has(id)) : []);
  const days = t.days
    .filter((d) => d && isDateKey(d.date) && OCCASIONS.includes(d.occasion) && validWeather(d.weather))
    .map((d) => ({ date: d.date, occasion: d.occasion, weather: d.weather, itemIds: keep(d.itemIds) }));
  return {
    id: t.id,
    name: t.name,
    city: { name: c.name, admin: typeof c.admin === "string" ? c.admin : undefined, country: typeof c.country === "string" ? c.country : undefined, latitude: c.latitude!, longitude: c.longitude! },
    start: t.start,
    end: t.end,
    kind: t.kind as TripKind,
    days,
    capsule: keep(t.capsule),
    journey: keep(t.journey),
    packed: keep(t.packed),
    looksPossible: num(t.looksPossible, 0, 100000) ? t.looksPossible! : 0,
    warnings: Array.isArray(t.warnings) ? t.warnings.filter((x): x is string => typeof x === "string").slice(0, 20) : [],
    createdAt: typeof t.createdAt === "string" ? t.createdAt : new Date().toISOString(),
  };
}

/**
 * Check a backup file before it replaces anything. Returns a clean copy, or an
 * error message that says what is wrong.
 */
export function parseBackup(value: unknown): { ok: true; backup: Backup } | { ok: false; error: string } {
  if (!value || typeof value !== "object") return { ok: false, error: "This isn’t an OOTD backup file." };
  const b = value as Partial<Backup>;
  if (b.app !== "ootd" || b.version !== 1 || !b.state || typeof b.state !== "object") {
    return { ok: false, error: "This isn’t an OOTD backup file, or it’s from a newer version." };
  }
  const s = b.state as Partial<PersonalState>;
  if (!Array.isArray(s.items) || !s.items.every(validItem)) return { ok: false, error: "Some pieces in this backup are damaged." };
  const ids = new Set(s.items.map((i) => i.id));
  if (ids.size !== s.items.length) return { ok: false, error: "This backup lists the same piece twice." };

  const images: Record<string, string> = {};
  for (const [id, url] of Object.entries(b.images ?? {})) {
    if (!ids.has(id)) continue;
    if (typeof url !== "string" || !IMAGE_URL.test(url)) return { ok: false, error: "A photo in this backup is damaged." };
    images[id] = url;
  }

  const wears: Wear[] = (Array.isArray(s.wears) ? s.wears : [])
    .filter((w): w is Wear => isDateKey(w?.date) && Array.isArray(w.itemIds))
    .map((w) => ({ date: w.date, itemIds: w.itemIds.filter((id) => ids.has(id)), occasion: OCCASIONS.includes(w.occasion!) ? w.occasion : undefined }))
    .filter((w) => w.itemIds.length > 0);

  const plans: Record<string, Plan> = {};
  for (const [date, p] of Object.entries(s.plans ?? {})) {
    if (!isDateKey(date) || !p || !Array.isArray(p.itemIds) || !p.itemIds.every((id) => ids.has(id))) continue;
    plans[date] = { date, itemIds: p.itemIds, occasion: OCCASIONS.includes(p.occasion) ? p.occasion : "office", tier: TIERS.includes(p.tier) ? p.tier : "fresh" };
  }

  const feedback: Record<string, FeedbackValue> = {};
  for (const [sig, v] of Object.entries(s.feedback ?? {})) if (v === "love" || v === "skip") feedback[sig] = v;

  return {
    ok: true,
    backup: {
      app: "ootd",
      version: 1,
      exportedAt: typeof b.exportedAt === "string" ? b.exportedAt : new Date().toISOString(),
      state: {
        version: 1,
        items: s.items.map(({ image: _i, ...rest }) => rest as Item),
        wears,
        plans,
        feedback,
        comfort: s.comfort === "runs-cold" || s.comfort === "runs-warm" ? s.comfort : "neutral",
        trips: (Array.isArray(s.trips) ? s.trips : []).map((t) => cleanTrip(t, ids)).filter((t): t is Trip => t !== null),
      },
      images,
    },
  };
}
