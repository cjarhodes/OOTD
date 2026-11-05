/**
 * Monthly AI spending cap, kept in Redis over its REST API (Upstash, added via
 * the Vercel Marketplace). Fails closed: with no store configured, AI calls are
 * refused rather than left unmetered.
 *
 * Each call reserves its worst-case cost first (atomic INCRBYFLOAT), is refused
 * if that would cross the cap, then settles to the actual cost afterwards.
 * The Anthropic Console workspace spend limit is the hard backstop behind this.
 */

export interface BudgetConfig {
  url: string;
  token: string;
  capUsd: number;
  inputUsdPerMTok: number;
  outputUsdPerMTok: number;
}

export function budgetConfig(env: NodeJS.ProcessEnv = process.env): BudgetConfig | null {
  const url = env.KV_REST_API_URL ?? env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN ?? env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return {
    url: url.replace(/\/$/, ""),
    token,
    capUsd: positive(env.OOTD_AI_MONTHLY_CAP_USD, 3),
    // Conservative defaults that also cover a fallback to a pricier model.
    inputUsdPerMTok: positive(env.OOTD_AI_INPUT_USD_PER_MTOK, 5),
    outputUsdPerMTok: positive(env.OOTD_AI_OUTPUT_USD_PER_MTOK, 25),
  };
}

function positive(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export interface UsageLike {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
}

export function costOf(usage: UsageLike, cfg: Pick<BudgetConfig, "inputUsdPerMTok" | "outputUsdPerMTok">): number {
  const input =
    (usage.input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0) * 1.25 + (usage.cache_read_input_tokens ?? 0) * 0.1;
  return (input * cfg.inputUsdPerMTok + (usage.output_tokens ?? 0) * cfg.outputUsdPerMTok) / 1_000_000;
}

export function monthKey(now = new Date()): string {
  return `ootd:ai:spend:${now.toISOString().slice(0, 7)}`;
}

type Fetch = typeof fetch;

async function redis(cfg: BudgetConfig, command: (string | number)[], fetcher: Fetch = fetch): Promise<unknown> {
  const res = await fetcher(cfg.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Budget store returned ${res.status}`);
  const json = (await res.json()) as { result?: unknown; error?: string };
  if (json.error) throw new Error(`Budget store error: ${json.error}`);
  return json.result;
}

export async function spentThisMonth(cfg: BudgetConfig, fetcher?: Fetch): Promise<number> {
  const result = await redis(cfg, ["GET", monthKey()], fetcher);
  const n = Number(result ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export interface Reservation {
  key: string;
  amount: number;
}

/** Reserve `amount` dollars, or return null if that would cross the cap. */
export async function reserve(cfg: BudgetConfig, amount: number, fetcher?: Fetch): Promise<Reservation | null> {
  const key = monthKey();
  const total = Number(await redis(cfg, ["INCRBYFLOAT", key, amount.toFixed(6)], fetcher));
  await redis(cfg, ["EXPIRE", key, 60 * 60 * 24 * 40], fetcher);
  if (total > cfg.capUsd) {
    await redis(cfg, ["INCRBYFLOAT", key, (-amount).toFixed(6)], fetcher);
    return null;
  }
  return { key, amount };
}

/** Replace a reservation with what the call actually cost (0 if it failed before billing). */
export async function settle(cfg: BudgetConfig, r: Reservation, actual: number, fetcher?: Fetch): Promise<void> {
  const delta = actual - r.amount;
  if (Math.abs(delta) > 1e-9) await redis(cfg, ["INCRBYFLOAT", r.key, delta.toFixed(6)], fetcher);
}

/** Count an event in a fixed window; returns the count so far (for rate limiting). */
export async function countInWindow(cfg: BudgetConfig, key: string, windowSeconds: number, fetcher?: Fetch): Promise<number> {
  const n = Number(await redis(cfg, ["INCR", key], fetcher));
  if (n === 1) await redis(cfg, ["EXPIRE", key, windowSeconds], fetcher);
  return n;
}

/** Read a counter without changing it (0 when unset). */
export async function readCount(cfg: BudgetConfig, key: string, fetcher?: Fetch): Promise<number> {
  const n = Number((await redis(cfg, ["GET", key], fetcher)) ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/** Take one back after a call that failed before it cost anything. */
export async function uncount(cfg: BudgetConfig, key: string, fetcher?: Fetch): Promise<void> {
  await redis(cfg, ["DECR", key], fetcher);
}
