import { json, problem } from "@/server/http";
import { endSession, sameOrigin } from "@/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return problem("Sign out from OOTD itself.", 403);
  await endSession();
  return json({ ok: true });
}
