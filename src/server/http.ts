import { NextResponse } from "next/server";

export function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export function problem(message: string, status: number, extra: Record<string, unknown> = {}) {
  return json({ error: message, ...extra }, status);
}
