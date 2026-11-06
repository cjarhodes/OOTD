import { NextResponse } from "next/server";
import { json, problem } from "@/server/http";
import { currentCaller, sameOrigin } from "@/server/session";
import { loadPhoto, MAX_PHOTOS, PHOTO_TYPES, sha256Hex, storePhoto } from "@/server/wardrobe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HASH = /^[a-f0-9]{64}$/;
const MAX_BYTES = 3_000_000;

/** Store one photo under its own SHA-256. Storing the same photo twice is fine. */
export async function PUT(request: Request, { params }: { params: Promise<{ hash: string }> }) {
  if (!sameOrigin(request)) return problem("Upload from OOTD itself.", 403);
  const caller = await currentCaller();
  if (!caller) return problem("Sign in to save photos.", 401);
  const { hash } = await params;
  if (!HASH.test(hash)) return problem("Bad photo id.", 400);
  const type = request.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
  if (!PHOTO_TYPES[type]) return problem("Photos must be PNG, JPEG or WebP.", 415);
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_BYTES) return problem("That photo is too large.", 413);
  if (sha256Hex(bytes) !== hash) return problem("The photo doesn’t match its id.", 400);
  const outcome = await storePhoto(caller.id, hash, bytes, type);
  if (outcome === "limit") return problem(`Your account has reached its limit of ${MAX_PHOTOS} photos.`, 413, { code: "limit" });
  return json({ ok: true, outcome });
}

export async function GET(_request: Request, { params }: { params: Promise<{ hash: string }> }) {
  const caller = await currentCaller();
  if (!caller) return problem("Sign in first.", 401);
  const { hash } = await params;
  if (!HASH.test(hash)) return problem("Bad photo id.", 400);
  const photo = await loadPhoto(caller.id, hash);
  if (!photo) return problem("That photo isn’t in your account.", 404);
  return new NextResponse(photo.stream, { headers: { "Content-Type": photo.contentType, "Cache-Control": "private, max-age=31536000, immutable" } });
}
