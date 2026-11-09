import { json, problem } from "@/server/http";
import { currentCaller } from "@/server/session";
import { listHistory, readHistory } from "@/server/wardrobe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Earlier versions of the wardrobe, or one of them with ?slot=n. */
export async function GET(request: Request) {
  const caller = await currentCaller();
  if (!caller) return problem("Sign in first.", 401);
  const slot = new URL(request.url).searchParams.get("slot");
  if (slot === null) return json({ snapshots: await listHistory(caller.id) });
  const snap = await readHistory(caller.id, Number(slot));
  if (!snap) return problem("That earlier version isn’t there any more.", 404);
  return json({ state: snap.state, savedAt: snap.savedAt, pieces: snap.pieces });
}
