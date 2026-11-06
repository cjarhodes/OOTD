import { mailConfigured } from "@/server/mail";
import { json } from "@/server/http";
import { currentCaller } from "@/server/session";
import { storeConfigured } from "@/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Whether accounts are on here, and who is signed in. */
export async function GET() {
  const configured = storeConfigured() && (mailConfigured() || process.env.NODE_ENV !== "production" || Boolean(process.env.OOTD_FAKE_BLOB_DIR));
  return json({ configured, user: configured ? await currentCaller() : null });
}
