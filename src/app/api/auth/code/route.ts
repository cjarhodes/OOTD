import { accountFor, checkChallenge, normaliseEmail, readChallenge, saveChallenge } from "@/server/accounts";
import { json, problem } from "@/server/http";
import { sameOrigin, sessionKey, startSession } from "@/server/session";
import { Conflict, storeConfigured } from "@/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Sign in with the 6-digit code from the email. Works inside the Home Screen app. */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return problem("Sign in from OOTD itself.", 403);
  if (!storeConfigured()) return problem("Accounts aren’t set up on this copy of OOTD.", 503);
  let email = "";
  let code = "";
  try {
    const body = (await request.json()) as { email?: unknown; code?: unknown };
    email = typeof body.email === "string" ? normaliseEmail(body.email) : "";
    code = typeof body.code === "string" ? body.code.replace(/\s+/g, "") : "";
  } catch {
    return problem("The request body must be JSON.", 400);
  }
  const stored = await readChallenge(email);
  const result = checkChallenge(await sessionKey(), email, stored?.value ?? null, { code }, Date.now());
  if (result.challenge && stored) {
    try {
      // Record the attempt (or use up the code) only if nobody else got there first.
      await saveChallenge(email, result.challenge, stored.etag);
    } catch (e) {
      if (e instanceof Conflict) return problem("That code was just used. Send a new one.", 409);
      throw e;
    }
  }
  if (!result.ok) return problem(result.reason, 400);
  const caller = await accountFor(email);
  await startSession(caller);
  return json({ user: caller });
}
