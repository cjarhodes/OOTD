/// <reference lib="webworker" />
import { generateLooks, planWeek, type GenerateInput, type WeekDay } from "./generate";

export type EngineRequest =
  | { id: number; kind: "looks"; input: GenerateInput }
  | { id: number; kind: "week"; days: WeekDay[]; base: Omit<GenerateInput, "weather" | "occasion" | "date"> };

// Outfit generation scores thousands of combinations; doing it here keeps
// scrolling and taps on the page smooth while it works.
self.onmessage = (event: MessageEvent<EngineRequest>) => {
  const req = event.data;
  const result = req.kind === "looks" ? generateLooks(req.input) : planWeek(req.days, req.base);
  (self as unknown as DedicatedWorkerGlobalScope).postMessage({ id: req.id, result });
};
