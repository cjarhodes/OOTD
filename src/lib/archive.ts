import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from "fflate";
import { parseBackup } from "./backup";
import type { PersonalState } from "./db";
import { KINDS } from "./kinds";
import type { Item } from "./types";

/**
 * The portable export: a plain ZIP anyone can open without OOTD.
 *
 *   README.txt      what each file is
 *   wardrobe.csv    one row per piece, opens in Numbers, Excel or Sheets
 *   wears.csv       one row per day worn
 *   wardrobe.json   everything, in the documented format below; OOTD imports it
 *   photos/         each piece's photo as an ordinary PNG or JPEG
 *
 * wardrobe.json is { app: "ootd", format: "ootd-archive", version: 1,
 * exportedAt, state, photos } where photos maps a piece id to its file in
 * photos/. Fields are described in README.txt so the data stays usable.
 */
export const ARCHIVE_FORMAT = "ootd-archive";

export interface Photo {
  bytes: Uint8Array;
  type: string;
}

export interface ArchiveJson {
  app: "ootd";
  format: typeof ARCHIVE_FORMAT;
  version: 1;
  exportedAt: string;
  state: PersonalState;
  photos: Record<string, string>;
}

const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
const TYPE_OF_EXT: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" };

/** Identify a photo from its first bytes, for blobs that lost their type. */
export function sniffImageType(bytes: Uint8Array): string | null {
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45) return "image/webp";
  return null;
}

function slug(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "piece"
  );
}

/** One CSV field, quoted when it needs to be (RFC 4180). Formula-looking text is defused for spreadsheets. */
export function csvField(value: unknown): string {
  let text = value === undefined || value === null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csv(rows: unknown[][]): string {
  return rows.map((r) => r.map(csvField).join(",")).join("\r\n") + "\r\n";
}

const ITEM_COLUMNS: (keyof Item)[] = [
  "id",
  "name",
  "kind",
  "slot",
  "color",
  "material",
  "pattern",
  "fit",
  "neckline",
  "front",
  "length",
  "thickness",
  "warmth",
  "formality",
  "boldness",
  "waterproof",
  "delicate",
  "status",
  "photoHash",
];

const README = (exportedAt: string, pieces: number, photos: number) => `OOTD wardrobe export
Exported ${exportedAt}. ${pieces} pieces, ${photos} photos.

This folder is yours and works without OOTD.

wardrobe.csv
  One row per piece. Open it in Numbers, Excel or Google Sheets.
  kind_label   the kind in words (tee, overshirt, chore coat ...)
  slot         base (next to skin), mid, outer, bottom or shoes
  color        the nearest named colour
  material     cotton, knit, wool, denim, leather, technical ...
  pattern      solid, stripe, check, texture, print
  fit          slim, regular, relaxed, boxy (tops) or wide (bottoms)
  neckline     crew, collar, turtle, mock, hood, lapel, v
  front        open or closed (whether it can be worn open)
  length       1 cropped, 2 waist, 3 hip, 4 thigh, 5 knee
  thickness    1 to 5; layers get thicker towards the outside
  warmth       rough insulation; about 1 for a tee, 6 for a winter coat
  formality    1 very casual to 5 formal
  boldness     0 classic, 1 a little interesting, 2 statement
  waterproof   true or false
  delicate     true if it should stay home in the rain
  status       available, laundry or archived
  photo        the photo's file in photos/
  times_worn, last_worn   from your wear log

wears.csv
  One row per day an outfit was logged: date, occasion, the pieces' ids and names.

wardrobe.json
  Everything above plus plans, trips, feedback and comfort, as JSON:
  { "app": "ootd", "format": "${ARCHIVE_FORMAT}", "version": 1, "exportedAt", "state", "photos" }
  state.items   the pieces, with the fields listed for wardrobe.csv
  state.wears   [{ date, itemIds, occasion }]
  state.plans   { "YYYY-MM-DD": { date, itemIds, occasion, tier } }
  state.trips   packed trips with their days, capsule and packing list
  photos        { piece id: "photos/<file>" }
  To restore, choose this ZIP (or wardrobe.json with its photos folder) in OOTD under Settings, Restore.

photos/
  Each piece's photo as a normal PNG (cut-outs keep their transparency) or JPEG,
  named after the piece. The part after the last dash in each name is the
  start of the photo's SHA-256, which also names it in the cloud backup.
`;

/** Build the export ZIP from the personal state and its photos (keyed by piece id). */
export function buildArchive(state: PersonalState, photos: Map<string, Photo>, exportedAt = new Date().toISOString()): Uint8Array {
  const files: Zippable = {};
  const photoPaths: Record<string, string> = {};
  const used = new Set<string>();
  const items = state.items.map(({ image: _i, ...rest }) => rest as Item);

  for (const item of items) {
    const photo = photos.get(item.id);
    if (!photo) continue;
    const type = sniffImageType(photo.bytes) ?? photo.type;
    const ext = EXT[type] ?? "png";
    let name = `${slug(item.name)}-${(item.photoHash ?? item.id).replace(/[^a-z0-9]/gi, "").slice(0, 8)}`;
    while (used.has(name)) name += "-2";
    used.add(name);
    const path = `photos/${name}.${ext}`;
    photoPaths[item.id] = path;
    // Photos are already compressed; store them as they are.
    files[path] = [photo.bytes, { level: 0 }];
  }

  const worn = new Map<string, { count: number; last: string }>();
  for (const w of state.wears) {
    for (const id of w.itemIds) {
      const prev = worn.get(id);
      worn.set(id, { count: (prev?.count ?? 0) + 1, last: !prev || w.date > prev.last ? w.date : prev.last });
    }
  }
  const header = [...ITEM_COLUMNS.slice(0, 3), "kind_label", ...ITEM_COLUMNS.slice(3), "photo", "times_worn", "last_worn"];
  const itemRows = items.map((i) => {
    const values = ITEM_COLUMNS.map((c) => i[c]);
    return [
      ...values.slice(0, 3),
      KINDS[i.kind]?.label ?? i.kind,
      ...values.slice(3),
      photoPaths[i.id] ?? "",
      worn.get(i.id)?.count ?? 0,
      worn.get(i.id)?.last ?? "",
    ];
  });
  const names = new Map(items.map((i) => [i.id, i.name]));
  const wearRows = [...state.wears]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((w) => [w.date, w.occasion ?? "", w.itemIds.join(" "), w.itemIds.map((id) => names.get(id) ?? id).join("; ")]);

  const json: ArchiveJson = { app: "ootd", format: ARCHIVE_FORMAT, version: 1, exportedAt, state: { ...state, items }, photos: photoPaths };
  files["README.txt"] = strToU8(README(exportedAt, items.length, Object.keys(photoPaths).length));
  // A byte-order mark so Excel reads accented names correctly.
  files["wardrobe.csv"] = strToU8(`﻿${csv([header, ...itemRows])}`);
  files["wears.csv"] = strToU8(`﻿${csv([["date", "occasion", "item_ids", "items"], ...wearRows])}`);
  files["wardrobe.json"] = strToU8(JSON.stringify(json, null, 2));
  return zipSync(files, { level: 6, mtime: new Date(exportedAt) });
}

export type ReadResult = { ok: true; state: PersonalState; photos: Map<string, Photo> } | { ok: false; error: string };

/**
 * Read an export back: the ZIP, or an older single-file JSON backup. Every
 * field is checked before anything replaces the wardrobe.
 */
export function readArchive(bytes: Uint8Array): ReadResult {
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b;
  if (!isZip) {
    let json: unknown;
    try {
      json = JSON.parse(strFromU8(bytes).replace(/^﻿/, ""));
    } catch {
      return { ok: false, error: "That file isn’t an OOTD export." };
    }
    return fromJson(json, () => null);
  }
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes, { filter: (f) => f.name.endsWith("wardrobe.json") || /(^|\/)photos\//.test(f.name) });
  } catch {
    return { ok: false, error: "That ZIP couldn’t be opened. It may be incomplete." };
  }
  // Allow the export to have been unzipped and re-zipped inside a folder.
  const jsonPath = Object.keys(files).find((n) => n === "wardrobe.json" || n.endsWith("/wardrobe.json"));
  if (!jsonPath) return { ok: false, error: "That ZIP has no wardrobe.json, so it isn’t an OOTD export." };
  const root = jsonPath.slice(0, -"wardrobe.json".length);
  let json: unknown;
  try {
    json = JSON.parse(strFromU8(files[jsonPath]!));
  } catch {
    return { ok: false, error: "wardrobe.json in that ZIP is damaged." };
  }
  return fromJson(json, (path) => files[`${root}${path}`] ?? null);
}

function fromJson(json: unknown, file: (path: string) => Uint8Array | null): ReadResult {
  const j = json as Partial<ArchiveJson> & { images?: unknown };
  if (j && j.app === "ootd" && j.format === ARCHIVE_FORMAT) {
    if (j.version !== 1) return { ok: false, error: "That export is from a newer version of OOTD." };
    const parsed = parseBackup({ app: "ootd", version: 1, exportedAt: j.exportedAt, state: j.state, images: {} });
    if (!parsed.ok) return parsed;
    const photos = new Map<string, Photo>();
    const ids = new Set(parsed.backup.state.items.map((i) => i.id));
    for (const [id, path] of Object.entries(j.photos ?? {})) {
      if (!ids.has(id) || typeof path !== "string" || path.includes("..")) continue;
      const bytes = file(path);
      if (!bytes) return { ok: false, error: `A photo is missing from the export (${path}).` };
      const type = sniffImageType(bytes) ?? TYPE_OF_EXT[path.split(".").pop()?.toLowerCase() ?? ""];
      if (!type) return { ok: false, error: `A photo in the export isn’t an image (${path}).` };
      photos.set(id, { bytes, type });
    }
    return { ok: true, state: parsed.backup.state, photos };
  }
  // The earlier single-file backup, with photos inline as data URLs.
  const parsed = parseBackup(json);
  if (!parsed.ok) return parsed;
  const photos = new Map<string, Photo>();
  for (const [id, url] of Object.entries(parsed.backup.images)) {
    const [, meta = "", data = ""] = /^data:([^;]+);base64,(.*)$/.exec(url) ?? [];
    photos.set(id, { bytes: base64ToBytes(data), type: meta });
  }
  return { ok: true, state: parsed.backup.state, photos };
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
