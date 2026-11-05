import type { ColorName } from "./palette";
import { alphaInfo, dominantColor, isCutout } from "./pixels";

/** A garment photo prepared for the wardrobe, entirely on this device. */
export interface PreparedPhoto {
  blob: Blob;
  previewUrl: string;
  cutout: boolean;
  color: ColorName;
  fileName: string;
}

const MAX_SIDE = 900;

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

/**
 * Decode, trim transparent edges, resize and detect the main colour. Cut-outs
 * (from Lift Subject or the Shortcut) stay PNG so the background stays clear.
 */
export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  const source = await decode(file);
  const w = "naturalWidth" in source ? source.naturalWidth : source.width;
  const h = "naturalHeight" in source ? source.naturalHeight : source.height;
  const scan = Math.min(1, 600 / Math.max(w, h));
  const { c: sc, ctx: sctx } = canvas(w * scan, h * scan);
  sctx.drawImage(source, 0, 0, sc.width, sc.height);
  const pixels = sctx.getImageData(0, 0, sc.width, sc.height);
  const info = alphaInfo(pixels);
  const cutout = isCutout(info);
  const color = dominantColor(pixels, cutout).name;

  // Crop to the subject (with a little air) for cut-outs.
  let sx = 0;
  let sy = 0;
  let sw = w;
  let sh = h;
  if (cutout && info.bounds) {
    const pad = 6 / scan;
    sx = Math.max(0, info.bounds.x / scan - pad);
    sy = Math.max(0, info.bounds.y / scan - pad);
    sw = Math.min(w - sx, info.bounds.width / scan + pad * 2);
    sh = Math.min(h - sy, info.bounds.height / scan + pad * 2);
  }
  const out = Math.min(1, MAX_SIDE / Math.max(sw, sh));
  const { c, ctx } = canvas(sw * out, sh * out);
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, c.width, c.height);
  if ("close" in source) source.close();
  const blob = cutout ? await toBlob(c, "image/png") : await toBlob(c, "image/jpeg", 0.86);
  return { blob, previewUrl: URL.createObjectURL(blob), cutout, color, fileName: file.name };
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
