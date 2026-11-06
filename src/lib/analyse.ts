import { analysePixels, type Analysis, type AnalyseRequest } from "./analyse-core";
import type { Pixels } from "./pixels";

export type { Analysis } from "./analyse-core";

let worker: Worker | null | undefined;
let nextId = 1;
const waiting = new Map<number, { done: (a: Analysis) => void; px: Pixels }>();

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    worker = new Worker(new URL("./cutout.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent<Analysis & { id: number }>) => {
      const job = waiting.get(e.data.id);
      waiting.delete(e.data.id);
      job?.done(e.data);
    };
    worker.onerror = () => {
      // Fall back to the main thread for this and later photos.
      worker?.terminate();
      worker = null;
      for (const [, job] of waiting) job.done(analysePixels(job.px));
      waiting.clear();
    };
  } catch {
    worker = null;
  }
  return worker;
}

/** Start the worker ahead of the first photo. */
export function warmUp(): void {
  getWorker();
}

/** Analyse in a worker where the browser allows, else on the main thread. */
export function analyse(px: ImageData): Promise<Analysis> {
  const w = getWorker();
  if (!w) return Promise.resolve(analysePixels(px));
  const id = nextId++;
  return new Promise((resolve) => {
    const copy = px.data.slice().buffer;
    waiting.set(id, { done: resolve, px: { data: px.data, width: px.width, height: px.height } });
    w.postMessage({ id, width: px.width, height: px.height, buffer: copy } satisfies AnalyseRequest, [copy]);
  });
}
