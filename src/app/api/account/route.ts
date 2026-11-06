import { accountActive, deleteAccount, normaliseEmail } from "@/server/accounts";
import { json, problem } from "@/server/http";
import { currentCaller, endSession, sameOrigin } from "@/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Delete the signed-in account and everything saved to it. The request must
 * repeat the account's email, so a stray click or a forged request can't do it.
 */
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return problem("Delete your account from OOTD itself.", 403);
  const caller = await currentCaller();
  if (!caller) return problem("Sign in to delete your account.", 401);
  let body: { email?: unknown };
  try {
    body = (await request.json()) as { email?: unknown };
  } catch {
    return problem("The request body must be JSON.", 400);
  }
  if (typeof body.email !== "string" || normaliseEmail(body.email) !== normaliseEmail(caller.email)) {
    return problem("Type the email address you signed in with to confirm.", 422, { code: "confirm" });
  }
  if (!(await accountActive(caller))) {
    await endSession();
    return json({ ok: true, deleted: 0 });
  }
  const { objects } = await deleteAccount(caller);
  await endSession();
  return json({ ok: true, deleted: objects });
}
