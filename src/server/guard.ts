import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { OWNER_COOKIE, ownerConfigured, verifySession } from "./owner";

export function jsonError(message: string, status: number, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error: message, ...extra }, { status, headers: { "Cache-Control": "no-store" } });
}

/** Null when the request comes from the unlocked owner; otherwise the response to send. */
export async function ownerOnly(): Promise<NextResponse | null> {
  if (!ownerConfigured() || !verifySession((await cookies()).get(OWNER_COOKIE)?.value)) {
    return jsonError("Only the wardrobe’s owner can use cloud backup.", 401);
  }
  return null;
}
