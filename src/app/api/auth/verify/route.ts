import { NextResponse } from "next/server";
import { accountFor, checkChallenge, readChallengeByKey, saveChallenge } from "@/server/accounts";
import { sameOrigin, sessionKey, startSession } from "@/server/session";
import { storeConfigured } from "@/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * The link in the sign-in email opens this page, which signs in only when
 * the button is pressed. Mail apps that open links to scan them would
 * otherwise use the link up before you tap it.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const k = url.searchParams.get("k") ?? "";
  const t = url.searchParams.get("t") ?? "";
  const html = `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sign in · OOTD</title><meta name="robots" content="noindex"></head>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#fbfbf9;color:#1a1a19;font-family:-apple-system,Helvetica,Arial,sans-serif">
<form method="post" style="text-align:center;padding:24px">
<p style="font-family:Georgia,serif;font-style:italic;font-size:40px;margin:0 0 24px">OOTD.</p>
<input type="hidden" name="k" value="${escape(k)}"><input type="hidden" name="t" value="${escape(t)}">
<button type="submit" style="font:inherit;font-size:17px;background:#1a1a19;color:#fbfbf9;border:0;border-radius:999px;padding:14px 28px;cursor:pointer">Sign in to OOTD</button>
<p style="color:#6d6b66;font-size:14px;margin-top:20px">Signs in this browser.</p>
</form></body></html>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const back = (query: string) => NextResponse.redirect(new URL(`/settings?${query}`, url.origin), 303);
  if (!sameOrigin(request)) return back("sign-in=expired");
  if (!storeConfigured()) return back("sign-in=unavailable");
  const form = await request.formData().catch(() => null);
  const k = String(form?.get("k") ?? "");
  const t = String(form?.get("t") ?? "");
  const stored = await readChallengeByKey(k);
  if (!stored || !t) return back("sign-in=expired");
  const result = checkChallenge(await sessionKey(), stored.value.email, stored.value, { token: t }, Date.now());
  if (!result.ok) return back("sign-in=expired");
  try {
    await saveChallenge(stored.value.email, result.challenge, stored.etag);
  } catch {
    return back("sign-in=expired");
  }
  await startSession(await accountFor(stored.value.email));
  return back("signed-in=1");
}
