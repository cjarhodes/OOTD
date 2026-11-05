import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { budgetConfig, countInWindow, spentThisMonth } from "@/server/budget";
import { cloudConfigured } from "@/server/cloud";
import { createSession, OWNER_COOKIE, ownerConfigured, passphraseMatches, SESSION_DAYS, verifySession } from "@/server/owner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface OwnerStatus {
  /** Owner features exist on this deployment. */
  available: boolean;
  owner: boolean;
  ai: { configured: boolean; capUsd: number | null; spentUsd: number | null };
  cloud: { configured: boolean };
}

async function status(): Promise<OwnerStatus> {
  const jar = await cookies();
  const owner = ownerConfigured() && verifySession(jar.get(OWNER_COOKIE)?.value);
  const cfg = budgetConfig();
  const configured = Boolean(cfg && process.env.ANTHROPIC_API_KEY);
  let spentUsd: number | null = null;
  if (owner && cfg) {
    try {
      spentUsd = await spentThisMonth(cfg);
    } catch {
      spentUsd = null;
    }
  }
  return {
    available: ownerConfigured(),
    owner,
    ai: { configured, capUsd: cfg?.capUsd ?? null, spentUsd },
    cloud: { configured: cloudConfigured() },
  };
}

export async function GET() {
  return NextResponse.json(await status(), { headers: { "Cache-Control": "no-store" } });
}

/** Unlock with the owner passphrase. Rate limited when the budget store is configured. */
export async function POST(request: Request) {
  if (!ownerConfigured()) {
    return NextResponse.json({ error: "Owner access isn’t set up on this deployment." }, { status: 404 });
  }
  const cfg = budgetConfig();
  if (cfg) {
    const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const hour = new Date().toISOString().slice(0, 13);
    try {
      if ((await countInWindow(cfg, `ootd:unlock:${ip}:${hour}`, 3600)) > 8) {
        return NextResponse.json({ error: "Too many attempts. Try again in an hour." }, { status: 429 });
      }
    } catch {
      // If the store is down, fall through: the passphrase check still applies.
    }
  }
  let passphrase = "";
  try {
    const body = (await request.json()) as { passphrase?: unknown };
    passphrase = typeof body.passphrase === "string" ? body.passphrase : "";
  } catch {
    // Treated as an empty passphrase below.
  }
  if (!passphraseMatches(passphrase)) {
    return NextResponse.json({ error: "That passphrase doesn’t match." }, { status: 401 });
  }
  const jar = await cookies();
  jar.set(OWNER_COOKIE, createSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
  return NextResponse.json(await status());
}

export async function DELETE() {
  (await cookies()).delete(OWNER_COOKIE);
  return NextResponse.json({ ok: true });
}
