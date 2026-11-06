import { mailConfigured } from "@/server/mail";
import { json } from "@/server/http";
import { accountActive } from "@/server/accounts";
import { currentCaller, endSession } from "@/server/session";
import { storeConfigured } from "@/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Whether accounts are on here, and who is signed in. */
export async function GET() {
  const configured = storeConfigured() && (mailConfigured() || process.env.NODE_ENV !== "production" || Boolean(process.env.OOTD_FAKE_BLOB_DIR));
  if (!configured) return json({ configured, user: null });
  const caller = await currentCaller();
  // Deleted from another device: this one signs out too.
  if (caller && !(await accountActive(caller))) {
    await endSession();
    return json({ configured, user: null });
  }
  return json({ configured, user: caller });
}
