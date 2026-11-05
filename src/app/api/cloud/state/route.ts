import { NextResponse } from "next/server";
import { parseBackup } from "@/lib/backup";
import { cloudConfigured, EtagMismatch, readState, sameEtag, writeState } from "@/server/cloud";
import { jsonError, ownerOnly } from "@/server/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 2_000_000;

function count(state: unknown): number {
  const items = (state as { items?: unknown[] } | null)?.items;
  return Array.isArray(items) ? items.length : 0;
}

export async function GET() {
  const denied = await ownerOnly();
  if (denied) return denied;
  if (!cloudConfigured()) return jsonError("Cloud backup isn’t set up on this deployment.", 503);
  const stored = await readState();
  if (!stored) return jsonError("Nothing is backed up yet.", 404);
  return NextResponse.json(
    { state: stored.value.state, savedAt: stored.value.savedAt, etag: stored.etag, pieces: count(stored.value.state) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * Save the wardrobe state. Refuses to replace a backup with a much smaller one
 * (or an empty one) unless `force` is set, so a fresh or cleared device can't
 * wipe the cloud copy by accident.
 */
export async function PUT(request: Request) {
  const denied = await ownerOnly();
  if (denied) return denied;
  if (!cloudConfigured()) return jsonError("Cloud backup isn’t set up on this deployment.", 503);

  const text = await request.text();
  if (text.length > MAX_BYTES) return jsonError("That wardrobe is too large to back up in one go.", 413);
  let body: { state?: unknown; ifMatch?: unknown; force?: unknown };
  try {
    body = JSON.parse(text);
  } catch {
    return jsonError("The request body must be JSON.", 400);
  }
  const parsed = parseBackup({ app: "ootd", version: 1, exportedAt: new Date().toISOString(), state: body.state, images: {} });
  if (!parsed.ok) return jsonError(parsed.error, 400);
  const incoming = parsed.backup.state;

  const current = await readState();
  const remotePieces = current ? count(current.value.state) : 0;
  const shrinking = remotePieces > 0 && (incoming.items.length === 0 || incoming.items.length < remotePieces / 2);
  if (shrinking && body.force !== true) {
    return jsonError(
      `The cloud copy has ${remotePieces} pieces and this device has ${incoming.items.length}. Nothing was overwritten.`,
      409,
      { reason: "shrink", remotePieces },
    );
  }
  const clientEtag = typeof body.ifMatch === "string" ? body.ifMatch : null;
  // Unless forced, a save must name the version it replaces (none for the very first save).
  if (current && body.force !== true && !sameEtag(clientEtag, current.etag)) {
    return jsonError("The cloud copy changed elsewhere. Choose which copy to keep.", 412, { reason: "conflict", savedAt: current.value.savedAt, remotePieces });
  }
  try {
    const saved = await writeState(incoming, current?.etag, current?.value ?? null);
    return NextResponse.json({ ...saved, pieces: incoming.items.length }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof EtagMismatch) {
      const latest = await readState();
      return jsonError("The cloud copy changed elsewhere. Choose which copy to keep.", 412, { reason: "conflict", savedAt: latest?.value.savedAt, remotePieces: count(latest?.value.state) });
    }
    return jsonError("The cloud backup couldn’t be saved. It will retry.", 502);
  }
}
