import { analyse } from "./analyse";
import type { CutoutFailure } from "./cutout";
import type { ColorName } from "./palette";
import { alphaInfo, dominantColor, isCutout } from "./pixels";

/** One way of saving a photo: as taken, or with its background removed. */
export interface PhotoVersion {
  blob: Blob;
  previewUrl: string;
  color: ColorName;
}

/** A garment photo prepared for the wardrobe, entirely on this device. */
export interface PreparedPhoto {
  fileName: string;
  /** The photo as taken (resized). */
  original: PhotoVersion;
  /** The garment on its own: from a cut-out the person made, or removed here. */
  cutout: PhotoVersion | null;
  /** The person's own cut-out (Lift Subject, the Shortcut): nothing to undo. */
  madeCutout: boolean;
  /** Why the background couldn't be removed, if it couldn't. */
  failure: CutoutFailure | null;
}

const MAX_SIDE = 900;
/** Size the garment is found at. Big enough for a clean edge, small enough to be quick. */
const ANALYSE_SIDE = 480;

async function decode(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(file);
  } catch {
    // Safari can decode some formats (e.g. HEIC) only through <img>.
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.decoding = "async";
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

function canvas(width: number, height: number) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(width));
  c.height = Math.max(1, Math.round(height));
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas is unavailable in this browser.");
  return { c, ctx };
}

function toBlob(c: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn’t encode the image."))), type, quality),
  );
}

/** Transparent images: WebP where the browser can write it (a fraction of PNG's size), else PNG. */
async function toTransparentBlob(c: HTMLCanvasElement): Promise<Blob> {
  const webp = await toBlob(c, "image/webp", 0.9).catch(() => null);
  if (webp && webp.type === "image/webp") return webp;
  return toBlob(c, "image/png");
}

function version(blob: Blob, color: ColorName): PhotoVersion {
  return { blob, previewUrl: URL.createObjectURL(blob), color };
}

/** Let the page paint between heavy steps. */
const breathe = () => new Promise<void>((r) => setTimeout(r, 0));

/**
 * Decode, resize, and separate the garment from its background. A photo that
 * already has a clear background (Lift Subject, the Shortcut) is trimmed and
 * kept as it is. For any other photo the background is removed on this device;
 * the photo as taken is kept too, so the person can choose.
 */
export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  const source = await decode(file);
  try {
    const w = "naturalWidth" in source ? source.naturalWidth : source.width;
    const h = "naturalHeight" in source ? source.naturalHeight : source.height;
    const scan = Math.min(1, ANALYSE_SIDE / Math.max(w, h));
    const { c: sc, ctx: sctx } = canvas(w * scan, h * scan);
    sctx.drawImage(source, 0, 0, sc.width, sc.height);
    const pixels = sctx.getImageData(0, 0, sc.width, sc.height);
    const info = alphaInfo(pixels);

    if (isCutout(info) && info.bounds) {
      // Already cut out: crop to the garment with a little air, keep transparency.
      const pad = 6 / scan;
      const sx = Math.max(0, info.bounds.x / scan - pad);
      const sy = Math.max(0, info.bounds.y / scan - pad);
      const sw = Math.min(w - sx, info.bounds.width / scan + pad * 2);
      const sh = Math.min(h - sy, info.bounds.height / scan + pad * 2);
      const out = Math.min(1, MAX_SIDE / Math.max(sw, sh));
      const { c, ctx } = canvas(sw * out, sh * out);
      ctx.drawImage(source, sx, sy, sw, sh, 0, 0, c.width, c.height);
      const cut = version(await toTransparentBlob(c), dominantColor(pixels, true).name);
      return { fileName: file.name, original: cut, cutout: cut, madeCutout: true, failure: null };
    }

    const out = Math.min(1, MAX_SIDE / Math.max(w, h));
    const { c, ctx } = canvas(w * out, h * out);
    ctx.drawImage(source, 0, 0, c.width, c.height);
    const [analysis, jpeg] = await Promise.all([analyse(pixels), toBlob(c, "image/jpeg", 0.86)]);
    const original = version(jpeg, analysis.photoColor);
    if (!analysis.alpha || !analysis.cutoutColor) {
      return { fileName: file.name, original, cutout: null, madeCutout: false, failure: analysis.failure };
    }
    await breathe();
    const cutout = version(await applyMask(c, ctx, analysis.alpha, sc.width, sc.height), analysis.cutoutColor);
    return { fileName: file.name, original, cutout, madeCutout: false, failure: null };
  } finally {
    if ("close" in source) source.close();
  }
}

/** Scale the garment mask up to the photo, apply it, and crop to the garment. */
async function applyMask(c: HTMLCanvasElement, ctx: CanvasRenderingContext2D, alpha: Uint8ClampedArray, mw: number, mh: number): Promise<Blob> {
  const image = ctx.getImageData(0, 0, c.width, c.height);
  const { data, width, height } = image;
  const fx = (mw - 1) / Math.max(1, width - 1);
  const fy = (mh - 1) / Math.max(1, height - 1);
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    const my = y * fy;
    const y0 = Math.floor(my);
    const y1 = Math.min(mh - 1, y0 + 1);
    const ty = my - y0;
    for (let x = 0; x < width; x++) {
      const mx = x * fx;
      const x0 = Math.floor(mx);
      const x1 = Math.min(mw - 1, x0 + 1);
      const tx = mx - x0;
      const a =
        (alpha[y0 * mw + x0]! * (1 - tx) + alpha[y0 * mw + x1]! * tx) * (1 - ty) +
        (alpha[y1 * mw + x0]! * (1 - tx) + alpha[y1 * mw + x1]! * tx) * ty;
      data[(y * width + x) * 4 + 3] = a;
      if (a > 16) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  const pad = 8;
  const sx = Math.max(0, minX - pad);
  const sy = Math.max(0, minY - pad);
  const sw = Math.min(width, maxX + pad + 1) - sx;
  const sh = Math.min(height, maxY + pad + 1) - sy;
  const { c: out, ctx: octx } = canvas(sw, sh);
  octx.putImageData(image, -sx, -sy);
  return toTransparentBlob(out);
}

/**
 * A display URL for a saved photo. A JPEG is a photo as taken, background and
 * all (cut-outs are WebP or PNG), so its URL carries a #backdrop marker that
 * layouts read through hasBackdrop(). The marker never reaches storage.
 */
export function photoUrl(blob: Blob): string {
  const url = URL.createObjectURL(blob);
  return blob.type === "image/jpeg" ? `${url}#backdrop` : url;
}

/** Does this photo still have its background? */
export function hasBackdrop(image: string | undefined): boolean {
  return Boolean(image && (image.endsWith("#backdrop") || image.startsWith("data:image/jpeg")));
}

/** Free the preview URLs of a prepared photo. */
export function releasePhoto(p: PreparedPhoto) {
  URL.revokeObjectURL(p.original.previewUrl);
  if (p.cutout && p.cutout !== p.original) URL.revokeObjectURL(p.cutout.previewUrl);
}

/** A small JPEG on white for AI tagging (transparency flattened). */
export async function taggingImage(blob: Blob): Promise<string> {
  const source = await decode(blob);
  const w = "naturalWidth" in source ? source.naturalWidth : source.width;
  const h = "naturalHeight" in source ? source.naturalHeight : source.height;
  const scale = Math.min(1, 512 / Math.max(w, h));
  const { c, ctx } = canvas(w * scale, h * scale);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(source, 0, 0, c.width, c.height);
  if ("close" in source) source.close();
  return c.toDataURL("image/jpeg", 0.85);
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

export async function dataUrlToBlob(url: string): Promise<Blob> {
  return (await fetch(url)).blob();
}

/** SHA-256 of a photo's bytes, as lowercase hex. Names the photo in backups. */
export async function hashBlob(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
