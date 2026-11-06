/// <reference lib="webworker" />
import { analysePixels, type AnalyseRequest } from "./analyse-core";

// Background removal and colour reading, off the main thread so the page stays
// responsive while a batch of photos is prepared.
self.onmessage = (event: MessageEvent<AnalyseRequest>) => {
  const { id, width, height, buffer } = event.data;
  const result = analysePixels({ data: new Uint8ClampedArray(buffer), width, height });
  const transfer = result.alpha ? [result.alpha.buffer] : [];
  (self as unknown as DedicatedWorkerGlobalScope).postMessage({ id, ...result }, transfer);
};
