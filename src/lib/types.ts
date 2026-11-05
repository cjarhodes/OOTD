import type { ColorName } from "./palette";

/** Where a piece sits in an outfit. Upper body layers go base → mid → outer. */
export type Slot = "base" | "mid" | "outer" | "bottom" | "shoes";

export type Kind =
  // base
  | "tee"
  | "polo"
  | "oxford"
  | "camp-shirt"
  | "henley"
  | "turtleneck"
  | "mock-neck"
  // mid
  | "crewneck"
  | "v-neck"
  | "cardigan"
  | "quarter-zip"
  | "hoodie"
  | "sweatshirt"
  | "overshirt"
  | "gilet"
  // outer
  | "chore-coat"
  | "waxed-jacket"
  | "blazer"
  | "bomber"
  | "rain-shell"
  | "overcoat"
  | "puffer"
  // bottom
  | "jeans"
  | "chinos"
  | "trousers"
  | "shorts"
  // shoes
  | "sneakers"
  | "runners"
  | "loafers"
  | "boots";

export type Neckline = "crew" | "collar" | "v" | "mock" | "turtle" | "hood" | "lapel" | "zip";

export type Material =
  | "cotton"
  | "linen"
  | "denim"
  | "jersey"
  | "knit"
  | "wool"
  | "fleece"
  | "corduroy"
  | "suede"
  | "leather"
  | "waxed"
  | "technical"
  | "canvas";

export type Pattern = "solid" | "stripe" | "check" | "print";

export type Occasion = "office" | "client" | "weekend" | "dinner" | "travel";

export type Tier = "easy" | "fresh" | "bold";

export type Status = "available" | "laundry" | "archived";

export type Comfort = "neutral" | "runs-cold" | "runs-warm";

export interface Item {
  id: string;
  name: string;
  kind: Kind;
  slot: Slot;
  color: ColorName;
  material: Material;
  pattern: Pattern;
  /** Upper layers only. */
  neckline: Neckline;
  /** Whether the piece is (or can be) worn open at the front. */
  front: "closed" | "open";
  /** 1 cropped · 2 waist · 3 hip · 4 thigh · 5 knee. */
  length: number;
  /** 1–5. Layers must get thicker towards the outside. */
  thickness: number;
  /** Rough insulation contribution; see weather.ts for the scale. */
  warmth: number;
  /** 1 very casual … 5 formal. */
  formality: number;
  /** 0 classic · 1 a little interesting · 2 statement. */
  boldness: number;
  waterproof: boolean;
  /** Avoid in rain (suede, linen, light canvas shoes). */
  delicate: boolean;
  status: Status;
  /** A cut-out PNG (data URL or path). Sample pieces use illustrations instead. */
  image?: string;
  /** SHA-256 of the stored photo; names it in the cloud backup and exports. */
  photoHash?: string;
}

export interface Wear {
  date: string;
  itemIds: string[];
  occasion?: Occasion;
}

export interface Plan {
  date: string;
  itemIds: string[];
  occasion: Occasion;
  tier: Tier;
}

export type FeedbackValue = "love" | "skip";

export interface WeatherWindow {
  /** Feels-like temperature, °C. */
  feels: number;
  /** Precipitation probability, 0–100. */
  rain: number;
  /** Wind speed, km/h. */
  wind: number;
}

export interface DayWeather {
  date: string;
  /** live = forecast; history = the same dates last year, used as a guide. */
  source: "sample" | "live" | "history";
  morning: WeatherWindow;
  midday: WeatherWindow;
  evening: WeatherWindow;
}

export interface Pieces {
  base: Item;
  mid?: Item;
  outer?: Item;
  bottom: Item;
  shoes: Item;
}

export type RecipeId =
  | "single"
  | "layered"
  | "collar-out"
  | "open-overshirt"
  | "gilet"
  | "smart-soft"
  | "two-layer"
  | "three-layer"
  | "high-low";

export interface Shed {
  layer: Item;
  /** True when the evening is cool enough to put it back on. */
  backOn: boolean;
}

export interface Look {
  signature: string;
  pieces: Pieces;
  score: number;
  boldness: number;
  recipe: RecipeId;
  tonal: boolean;
  name: string;
  notes: string[];
  shed?: Shed;
  /** Set when the wardrobe can't fully suit the weather and this is the closest look. */
  warning?: string;
}

export type TripKind = "work" | "leisure" | "mixed";

export interface TripCity {
  name: string;
  admin?: string;
  country?: string;
  latitude: number;
  longitude: number;
}

export interface TripDay {
  date: string;
  occasion: Occasion;
  weather: DayWeather;
  /** The look chosen for this day, from the capsule. */
  itemIds: string[];
}

export interface Trip {
  id: string;
  name: string;
  city: TripCity;
  start: string;
  end: string;
  kind: TripKind;
  days: TripDay[];
  /** Everything to pack. */
  capsule: string[];
  /** Bulky pieces to wear while travelling instead of packing. */
  journey: string[];
  /** Capsule pieces ticked off the packing list. */
  packed: string[];
  /** How many different looks the capsule can make across the trip. */
  looksPossible: number;
  warnings: string[];
  createdAt: string;
}
