import { removeBackground, type CutoutFailure } from "./cutout";
import type { ColorName } from "./palette";
import { dominantColor, type Pixels } from "./pixels";

export interface AnalyseRequest {
  id: number;
  width: number;
  height: number;
  buffer: ArrayBuffer;
}

export interface Analysis {
  /** Garment mask at the analysed size, or null if the background stays. */
  alpha: Uint8ClampedArray | null;
  failure: CutoutFailure | null;
  /** Colour of the garment alone (when cut out) and of the photo's middle. */
  cutoutColor: ColorName | null;
  photoColor: ColorName;
}

/** Find the garment in a downscaled photo and read its colour. Pure: runs in a worker or inline. */
export function analysePixels(px: Pixels): Analysis {
  const photoColor = dominantColor(px, false).name;
  const result = removeBackground(px);
  if ("failure" in result) return { alpha: null, failure: result.failure, cutoutColor: null, photoColor };
  const masked = new Uint8ClampedArray(px.data);
  for (let i = 0; i < result.alpha.length; i++) masked[i * 4 + 3] = result.alpha[i]!;
  const cutoutColor = dominantColor({ data: masked, width: px.width, height: px.height }, true).name;
  return { alpha: result.alpha, failure: null, cutoutColor, photoColor };
}
