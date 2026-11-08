"use client";

import { useEffect, useState } from "react";
import { generateLooks, planWeek, type GenerateInput, type Looks, type WeekDay } from "@/lib/engine/generate";
import type { EngineRequest } from "@/lib/engine/generate.worker";
import { nextBuys, type NextBuy } from "@/lib/recommend";
import type { Item, Look, WishItem } from "@/lib/types";

type Job =
  | { kind: "looks"; input: GenerateInput }
  | { kind: "week"; days: WeekDay[]; base: Omit<GenerateInput, "weather" | "occasion" | "date"> }
  | { kind: "buys"; items: Item[]; wishlist: WishItem[] };

let worker: Worker | null | undefined;
let nextId = 1;
const waiting = new Map<number, { done: (r: unknown) => void; job: Job }>();

function runInline(job: Job): unknown {
  if (job.kind === "looks") return generateLooks(job.input);
  if (job.kind === "week") return planWeek(job.days, job.base);
  return nextBuys(job.items, job.wishlist);
}

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    worker = new Worker(new URL("../lib/engine/generate.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent<{ id: number; result: unknown }>) => {
      const w = waiting.get(e.data.id);
      waiting.delete(e.data.id);
      w?.done(e.data.result);
    };
    worker.onerror = () => {
      // Fall back to the main thread for this and later work.
      worker?.terminate();
      worker = null;
      for (const [, w] of waiting) w.done(runInline(w.job));
      waiting.clear();
    };
  } catch {
    worker = null;
  }
  return worker;
}

function run<T>(job: Job): Promise<T> {
  const w = typeof Worker === "undefined" ? null : getWorker();
  if (!w) return Promise.resolve(runInline(job) as T);
  const id = nextId++;
  return new Promise((resolve) => {
    waiting.set(id, { done: (r) => resolve(r as T), job });
    try {
      w.postMessage({ id, ...job } as EngineRequest);
    } catch {
      // Something in the input can't be cloned: work it out here instead.
      waiting.delete(id);
      resolve(runInline(job) as T);
    }
  });
}

/**
 * Today's three looks, worked out off the main thread. Null until ready.
 * Keeps showing the previous result while a new one is on its way.
 */
export function useLooks(input: GenerateInput | null): Looks | null {
  const [looks, setLooks] = useState<Looks | null>(null);
  useEffect(() => {
    if (!input) return;
    let live = true;
    void run<Looks>({ kind: "looks", input }).then((r) => live && setLooks(r));
    return () => {
      live = false;
    };
  }, [input]);
  return input ? looks : null;
}

/** A week of suggested looks, worked out off the main thread. Empty until ready. */
export function useWeek(days: WeekDay[] | null, base: Omit<GenerateInput, "weather" | "occasion" | "date">): (Look | null)[] {
  const [looks, setLooks] = useState<(Look | null)[]>([]);
  useEffect(() => {
    if (!days) return;
    let live = true;
    void run<(Look | null)[]>({ kind: "week", days, base }).then((r) => live && setLooks(r));
    return () => {
      live = false;
    };
  }, [days, base]);
  return days ? looks : [];
}

/** Best next buys for a wardrobe, worked out off the main thread. Null while working. */
export function useNextBuys(input: { items: Item[]; wishlist: WishItem[] } | null): NextBuy[] | null {
  const [buys, setBuys] = useState<NextBuy[] | null>(null);
  useEffect(() => {
    if (!input) return;
    let live = true;
    setBuys(null);
    void run<NextBuy[]>({ kind: "buys", items: input.items, wishlist: input.wishlist }).then((r) => live && setBuys(r));
    return () => {
      live = false;
    };
  }, [input]);
  return input ? buys : null;
}
