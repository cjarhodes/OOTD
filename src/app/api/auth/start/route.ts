import { validEmail } from "@/lib/account";
import { canSend, emailKey, newChallenge, normaliseEmail, readChallenge, saveChallenge } from "@/server/accounts";
import { json, problem } from "@/server/http";
import { sendSignInEmail } from "@/server/mail";
import { sameOrigin, sessionKey } from "@/server/session";
import { storeConfigured } from "@/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Email a sign-in link and code. New addresses get an account when they first sign in. */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return problem("Sign in from OOTD itself.", 403);
  if (!storeConfigured()) return problem("Accounts aren’t set up on this copy of OOTD.", 503);
  let email = "";
  try {
    const body = (await request.json()) as { email?: unknown };
    email = typeof body.email === "string" ? normaliseEmail(body.email) : "";
  } catch {
    return problem("The request body must be JSON.", 400);
  }
  if (!validEmail(email) || email.length > 254) return problem("That email address doesn’t look right.", 400);

  const now = Date.now();
  const previous = await readChallenge(email);
  const allowed = canSend(previous?.value ?? null, now);
  if (!allowed.ok) return problem(allowed.reason, 429);

  const secret = await sessionKey();
  const { code, token, challenge } = newChallenge(secret, email, previous?.value ?? null, now);
  await saveChallenge(email, challenge);
  const origin = new URL(request.url).origin;
  const link = `${origin}/api/auth/verify?k=${emailKey(email)}&t=${token}`;
  if (!(await sendSignInEmail(email, link, code))) return problem("The sign-in email couldn’t be sent. Try again in a moment.", 502);
  return json({ ok: true });
}
