import { NextResponse } from "next/server";
import { cloudConfigured, PHOTO_TYPES, readPhoto, sha256Hex, writePhoto } from "@/server/cloud";
import { jsonError, ownerOnly } from "@/server/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PHOTO = 3_000_000;
const HASH = /^[a-f0-9]{64}$/;

export async function PUT(request: Request, { params }: { params: Promise<{ hash: string }> }) {
  const denied = await ownerOnly();
  if (denied) return denied;
  if (!cloudConfigured()) return jsonError("Cloud backup isn’t set up on this deployment.", 503);
  const { hash } = await params;
  if (!HASH.test(hash)) return jsonError("Bad photo id.", 400);
  const type = request.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
  if (!PHOTO_TYPES[type]) return jsonError("Photos must be PNG, JPEG or WebP.", 415);
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_PHOTO) return jsonError("That photo is too large.", 413);
  // The name is the content's hash, so a photo can never be silently replaced.
  if (sha256Hex(bytes) !== hash) return jsonError("The photo doesn’t match its id.", 400);
  try {
    await writePhoto(hash, bytes, type);
  } catch {
    return jsonError("The photo couldn’t be saved. It will retry.", 502);
  }
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}

export async function GET(_request: Request, { params }: { params: Promise<{ hash: string }> }) {
  const denied = await ownerOnly();
  if (denied) return denied;
  if (!cloudConfigured()) return jsonError("Cloud backup isn’t set up on this deployment.", 503);
  const { hash } = await params;
  if (!HASH.test(hash)) return jsonError("Bad photo id.", 400);
  const photo = await readPhoto(hash);
  if (!photo) return jsonError("That photo isn’t in the backup.", 404);
  return new NextResponse(photo.stream, { headers: { "Content-Type": photo.contentType, "Cache-Control": "private, max-age=31536000, immutable" } });
}
