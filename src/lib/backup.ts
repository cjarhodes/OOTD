import { isDateKey } from "./dates";
import type { PersonalState } from "./db";
import { KINDS } from "./kinds";
import { COLOR_NAMES } from "./palette";
import { MATERIALS, PATTERNS } from "./tagging";
import type { FeedbackValue, Item, Kind, Occasion, Plan, Status, Tier, Wear } from "./types";

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
    (STATUSES as string[]).includes(i.status)
  );
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
      },
      images,
    },
  };
}
