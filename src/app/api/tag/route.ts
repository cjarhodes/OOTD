import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { TAG_SCHEMA, validateTags } from "@/lib/tagging";
import { allowanceFor, userTagKey } from "@/lib/account";
import { callerFrom } from "@/server/auth";
import { sameOrigin } from "@/server/session";
import { budgetConfig, costOf, countInWindow, readCount, reserve, settle, spentThisMonth, uncount } from "@/server/budget";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODEL = process.env.OOTD_AI_MODEL || "claude-opus-5-5";
const MAX_TOKENS = 4000;
const MAX_IMAGE_BYTES = 1_500_000;
/** Server-side refusal fallback is available for these model families only. */
const SUPPORTS_FALLBACK = /^claude-(opus|sonnet|fable)-/.test(MODEL);

const SYSTEM = `You tag garments for a personal wardrobe app that builds layered outfits.
You get one photo of a single garment, usually cut out on a transparent or plain background.
Identify it precisely:
- kind: the closest garment type. Shirts with a collar and buttons are "oxford" unless clearly a camp collar. Knit pullovers are "crewneck" or "v-neck"; zip-collar knits are "quarter-zip". Open-front knits are "cardigan". Shirt-weight jackets are "overshirt". Waxed cotton field jackets are "waxed-jacket". Tailored jackets are "blazer".
- color: the main colour, chosen from the list. Ignore the background.
- material, pattern, formality and boldness as defined in the schema.
- name: short, colour first, in British English, e.g. "Navy lambswool crewneck". Do not invent brands.`;

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

const MONTH_SECONDS = 60 * 60 * 24 * 32;

/** The caller's AI tagging status: whether it's on, and their allowance this month. */
export async function GET(request: Request) {
  const caller = await callerFrom(request);
  if (!caller) return error("Sign in to use AI tagging.", 401);
  const cfg = budgetConfig();
  const configured = Boolean(cfg && process.env.ANTHROPIC_API_KEY);
  const limit = allowanceFor(caller.email, process.env);
  let used = 0;
  let budgetLeft = true;
  if (cfg && configured) {
    try {
      used = await readCount(cfg, userTagKey(caller.id));
      budgetLeft = (await spentThisMonth(cfg)) < cfg.capUsd;
    } catch {
      return NextResponse.json({ configured: false, limit, used: 0 }, { headers: { "Cache-Control": "no-store" } });
    }
  }
  return NextResponse.json({ configured: configured && budgetLeft, limit, used }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return error("Tag photos from OOTD itself.", 403);
  // 1. Signed-in people only.
  const caller = await callerFrom(request);
  if (!caller) return error("Sign in to use AI tagging.", 401);
  // 2. Fail closed without a key or a budget store.
  const cfg = budgetConfig();
  if (!cfg || !process.env.ANTHROPIC_API_KEY) return error("AI tagging isn’t configured on this deployment.", 503);

  // 3. Validate the image.
  let mediaType: "image/jpeg" | "image/png" | "image/webp";
  let data: string;
  try {
    const body = (await request.json()) as { image?: unknown };
    const match = typeof body.image === "string" ? /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(body.image) : null;
    if (!match) return error("Send one JPEG, PNG or WebP image as a data URL.", 400);
    mediaType = match[1] as typeof mediaType;
    data = match[2]!;
    if ((data.length * 3) / 4 > MAX_IMAGE_BYTES) return error("That image is too large. Resize it below 1.5 MB.", 413);
  } catch {
    return error("The request body must be JSON.", 400);
  }

  // 4. Count it against the caller's monthly allowance.
  const limit = allowanceFor(caller.email, process.env);
  const tagKey = userTagKey(caller.id);
  let counted = false;
  if (limit !== null) {
    try {
      const n = await countInWindow(cfg, tagKey, MONTH_SECONDS);
      counted = true;
      if (n > limit) {
        await uncount(cfg, tagKey).catch(() => undefined);
        return error(`You’ve used this month’s ${limit} AI tags. Fill in details by hand until next month.`, 402);
      }
    } catch {
      return error("The spending tracker is unavailable, so AI tagging is paused.", 503);
    }
  }
  const refund = () => (counted ? uncount(cfg, tagKey).catch(() => undefined) : undefined);

  // 5. Reserve the worst-case cost against the overall monthly cap.
  const worstCase = costOf({ input_tokens: 6000, output_tokens: MAX_TOKENS }, cfg);
  let reservation;
  try {
    reservation = await reserve(cfg, worstCase);
  } catch {
    await refund();
    return error("The spending tracker is unavailable, so AI tagging is paused.", 503);
  }
  if (!reservation) {
    await refund();
    return error(`This month’s AI budget of $${cfg.capUsd.toFixed(2)} has been used. Tag pieces by hand until next month.`, 402);
  }

  // 6. Call Claude with structured output.
  const client = new Anthropic();
  let actual = 0;
  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      ...(SUPPORTS_FALLBACK ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
      output_config: { effort: "low", format: { type: "json_schema", schema: TAG_SCHEMA } },
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data } },
            { type: "text", text: "Tag this garment." },
          ],
        },
      ],
    });
    actual = costOf(response.usage, cfg);

    if (response.stop_reason === "refusal") return error("Claude couldn’t tag this photo. Tag it by hand.", 422);
    if (response.stop_reason === "max_tokens") return error("Tagging was cut short. Try again or tag it by hand.", 502);
    const text = response.content.find((b) => b.type === "text");
    let parsed: unknown = null;
    try {
      parsed = text && text.type === "text" ? JSON.parse(text.text) : null;
    } catch {
      parsed = null;
    }
    const tags = validateTags(parsed);
    if (!tags) return error("The tags that came back weren’t usable. Tag it by hand.", 502);
    return NextResponse.json({ tags, costUsd: Number(actual.toFixed(5)) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    // Nothing was tagged, so it doesn't use up the allowance.
    await refund();
    if (e instanceof Anthropic.RateLimitError) return error("Claude is busy right now. Try again in a minute.", 429);
    if (e instanceof Anthropic.AuthenticationError) return error("The Anthropic API key on this deployment was rejected.", 503);
    if (e instanceof Anthropic.BadRequestError) return error("Claude rejected this image. Tag it by hand.", 400);
    if (e instanceof Anthropic.APIError) return error("Claude returned an error. Try again later.", 502);
    return error("Couldn’t reach Claude. Try again later.", 502);
  } finally {
    // A failed request before billing settles to 0; otherwise to the real cost.
    try {
      await settle(cfg, reservation, actual);
    } catch {
      // The reservation stays counted, which errs on the side of the cap.
    }
  }
}
