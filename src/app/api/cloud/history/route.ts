import { NextResponse } from "next/server";
import { cloudConfigured, listHistory, readHistory } from "@/server/cloud";
import { jsonError, ownerOnly } from "@/server/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** List hourly snapshots, or fetch one with ?at=YYYY-MM-DDTHH. */
export async function GET(request: Request) {
  const denied = await ownerOnly();
  if (denied) return denied;
  if (!cloudConfigured()) return jsonError("Cloud backup isn’t set up on this deployment.", 503);
  const at = new URL(request.url).searchParams.get("at");
  if (!at) return NextResponse.json({ snapshots: await listHistory() }, { headers: { "Cache-Control": "no-store" } });
  const snap = await readHistory(at);
  if (!snap) return jsonError("That snapshot doesn’t exist.", 404);
  return NextResponse.json({ state: snap.value.state, savedAt: snap.value.savedAt }, { headers: { "Cache-Control": "no-store" } });
}
