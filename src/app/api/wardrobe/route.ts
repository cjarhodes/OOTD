import { parseBackup } from "@/lib/backup";
import { accountActive } from "@/server/accounts";
import { json, problem } from "@/server/http";
import { currentCaller, sameOrigin } from "@/server/session";
import { readWardrobe, saveWardrobe } from "@/server/wardrobe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 2_000_000;

/** The signed-in account's wardrobe. */
export async function GET() {
  const caller = await currentCaller();
  if (!caller) return problem("Sign in to see your wardrobe.", 401);
  const stored = await readWardrobe(caller.id);
  if (!stored) return json({ wardrobe: null });
  return json({ wardrobe: { state: stored.value.state, etag: stored.etag, savedAt: stored.value.savedAt, pieces: stored.value.pieces } });
}

/**
 * Save the wardrobe. It must name the version it replaces (ifMatch), and it
 * may not empty the wardrobe or cut it below half unless forced: errors
 * OD409 and OD410, with the stored piece count.
 */
export async function PUT(request: Request) {
  if (!sameOrigin(request)) return problem("Save from OOTD itself.", 403);
  const caller = await currentCaller();
  if (!caller) return problem("Sign in to save your wardrobe.", 401, { code: "28000" });
  // A deleted account's old cookie can't bring its data back.
  if (!(await accountActive(caller))) return problem("This account was deleted. Sign in again to start a new one.", 401, { code: "28000" });
  const text = await request.text();
  if (text.length > MAX_BYTES) return problem("That wardrobe is too large to save in one go.", 413, { code: "OD413" });
  let body: { state?: unknown; ifMatch?: unknown; force?: unknown };
  try {
    body = JSON.parse(text);
  } catch {
    return problem("The request body must be JSON.", 400);
  }
  const parsed = parseBackup({ app: "ootd", version: 1, exportedAt: new Date().toISOString(), state: body.state, images: {} });
  if (!parsed.ok) return problem(parsed.error, 422, { code: "OD422" });
  if (parsed.backup.state.items.length > 1000) return problem("A wardrobe can hold up to 1,000 pieces.", 413, { code: "OD413" });

  const outcome = await saveWardrobe(
    caller.id,
    parsed.backup.state as unknown as Parameters<typeof saveWardrobe>[1],
    typeof body.ifMatch === "string" ? body.ifMatch : null,
    body.force === true,
  );
  if (!outcome.ok) {
    const message = outcome.code === "OD409" ? "Your wardrobe changed on another device." : "That would remove most of your saved wardrobe.";
    return problem(message, 409, { code: outcome.code, details: String(outcome.remotePieces), savedAt: outcome.savedAt });
  }
  return json({ etag: outcome.etag, savedAt: outcome.savedAt, pieces: outcome.pieces });
}
