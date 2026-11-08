import { makeItem } from "./kinds";
import type { ColorName } from "./palette";
import type { Fit, Item, Kind, Material, Pattern } from "./types";

/**
 * The starter deck: the pieces most men already own, and the ones that make a
 * wardrobe feel current. Swiping through it builds a wardrobe in a minute,
 * without photographing anything; each card becomes an illustrated piece.
 *
 * Order matters: it opens with the essentials (so a first look is possible
 * quickly) and mixes in what's current, so it never feels like an inventory.
 */
export interface StarterCard {
  id: string;
  name: string;
  kind: Kind;
  /** The first colour is the one shown; the others can be tapped before swiping. */
  colors: ColorName[];
  fit?: Fit;
  material?: Material;
  pattern?: Pattern;
  formality?: number;
  boldness?: number;
  /** Why it earns its place, in a line. */
  note: string;
  tag: "Essential" | "Now";
}

export const STARTER_DECK: StarterCard[] = [
  { id: "tee", name: "Heavyweight tee", kind: "tee", colors: ["White", "Black", "Ecru", "Grey"], fit: "boxy", note: "Boxy and heavy, so it holds its shape under everything else.", tag: "Essential" },
  { id: "jeans", name: "Straight-leg jeans", kind: "jeans", colors: ["Indigo", "Denim", "Black", "Ecru"], fit: "regular", note: "Straight, not skinny. The one pair that goes with all of it.", tag: "Essential" },
  { id: "sneakers", name: "Leather sneakers", kind: "sneakers", colors: ["White", "Black"], note: "Clean and minimal. They lift dark looks and calm loud ones.", tag: "Essential" },
  { id: "oxford", name: "Oxford shirt", kind: "oxford", colors: ["Sky", "White", "Ecru"], note: "Buttoned for the office, open over a tee at the weekend.", tag: "Essential" },
  { id: "crew", name: "Merino crewneck", kind: "crewneck", colors: ["Navy", "Oatmeal", "Grey", "Charcoal", "Forest"], note: "Fine enough to layer over a shirt with the collar out.", tag: "Essential" },
  { id: "long-sleeve", name: "Long-sleeve tee", kind: "long-sleeve", colors: ["White", "Ecru", "Grey", "Black"], note: "The tee for cooler days, on its own or under an overshirt.", tag: "Essential" },
  { id: "wide-trousers", name: "Pleated wide-leg trousers", kind: "trousers", colors: ["Charcoal", "Black", "Stone", "Brown"], fit: "wide", formality: 3, note: "The modern trouser: a fitted knit on top, room below.", tag: "Now" },
  { id: "knit-polo", name: "Knit polo", kind: "polo", colors: ["Ecru", "Navy", "Brown", "Forest"], material: "knit", formality: 3, note: "Smarter than a tee, easier than a shirt. Tucked or loose.", tag: "Now" },
  { id: "loafers", name: "Suede loafers", kind: "loafers", colors: ["Brown", "Black", "Chocolate"], material: "suede", note: "With wide trousers or straight jeans, socks optional.", tag: "Now" },
  { id: "chore", name: "Chore coat", kind: "chore-coat", colors: ["Indigo", "Khaki", "Black"], note: "The workwear jacket that replaced the blazer for most days.", tag: "Now" },
  { id: "hoodie", name: "Loopback hoodie", kind: "hoodie", colors: ["Grey", "Navy", "Ecru", "Black"], note: "Under a coat or blazer it turns smart-casual. That's the point.", tag: "Essential" },
  { id: "fleece", name: "Zip fleece", kind: "fleece", colors: ["Ecru", "Navy", "Olive", "Black", "Brown"], note: "The weekend layer of the moment: half-zip, a little boxy, over a tee.", tag: "Now" },
  { id: "overcoat", name: "Wool overcoat", kind: "overcoat", colors: ["Camel", "Charcoal", "Navy", "Black"], note: "Long, a size easy, worn open. Goes over everything in winter.", tag: "Essential" },
  { id: "chinos", name: "Chinos", kind: "chinos", colors: ["Khaki", "Stone", "Navy", "Olive"], note: "The middle ground between jeans and trousers.", tag: "Essential" },
  { id: "cargos", name: "Cargo trousers", kind: "cargos", colors: ["Olive", "Black", "Stone", "Khaki"], fit: "relaxed", note: "Relaxed and clean, not baggy. With a fleece or sweatshirt and runners.", tag: "Now" },
  { id: "overshirt", name: "Overshirt", kind: "overshirt", colors: ["Olive", "Brown", "Navy", "Charcoal"], note: "A shirt-weight jacket for the days a coat is too much.", tag: "Now" },
  { id: "flannel", name: "Flannel shirt", kind: "flannel", colors: ["Navy", "Brown", "Forest", "Red"], pattern: "check", boldness: 1, note: "Worn open over a tee, it's a light jacket for cool weekends.", tag: "Essential" },
  { id: "mock", name: "Merino mock neck", kind: "mock-neck", colors: ["Charcoal", "Black", "Ecru"], note: "Under a blazer or overcoat it does the job of a shirt and tie.", tag: "Now" },
  { id: "bomber", name: "Bomber jacket", kind: "bomber", colors: ["Black", "Olive", "Navy"], note: "Cropped and boxy. Let a longer layer show beneath it.", tag: "Essential" },
  { id: "denim-jacket", name: "Denim jacket", kind: "denim-jacket", colors: ["Indigo", "Denim", "Black", "Ecru"], note: "Cropped and boxy. Over a hoodie with cargos or black jeans.", tag: "Essential" },
  { id: "runners", name: "Retro suede runners", kind: "runners", colors: ["Grey", "Navy", "Ecru"], material: "suede", note: "The weekend shoe: relaxed trousers, a sweatshirt, done.", tag: "Now" },
  { id: "canvas", name: "Canvas sneakers", kind: "canvas", colors: ["White", "Ecru", "Black"], note: "The easy warm-weather shoe: with shorts, cargos or rolled jeans.", tag: "Essential" },
  { id: "cardigan", name: "Chunky cardigan", kind: "cardigan", colors: ["Charcoal", "Ecru", "Brown", "Forest"], note: "Worn open over a tee like a light jacket.", tag: "Now" },
  { id: "camp", name: "Camp-collar shirt", kind: "camp-shirt", colors: ["Ecru", "Rust", "Forest", "Black"], boldness: 1, note: "A summer shirt, worn open over a tee for most of the year.", tag: "Now" },
  { id: "rugby", name: "Rugby shirt", kind: "rugby", colors: ["Navy", "Forest", "Burgundy"], pattern: "stripe", boldness: 1, note: "Heavy cotton with a white collar: preppy, made for the weekend.", tag: "Now" },
  { id: "sweat", name: "Heavyweight sweatshirt", kind: "sweatshirt", colors: ["Ecru", "Grey", "Navy"], fit: "boxy", note: "Boxy, with a white tee hem showing below.", tag: "Essential" },
  { id: "sweatpants", name: "Heavyweight sweatpants", kind: "sweatpants", colors: ["Grey", "Black", "Navy", "Ecru"], note: "Straight-leg, not skinny joggers. Weekends only, with a crisp tee.", tag: "Now" },
  { id: "blazer", name: "Unstructured blazer", kind: "blazer", colors: ["Navy", "Charcoal", "Brown"], note: "Soft shoulders, no lining. Wear it with jeans as much as trousers.", tag: "Essential" },
  { id: "chukka", name: "Suede chukka boots", kind: "boots", colors: ["Chocolate", "Brown", "Black"], material: "suede", note: "Smart enough for the office, sturdy enough for the weekend.", tag: "Essential" },
  { id: "carpenter", name: "Carpenter trousers", kind: "chinos", colors: ["Stone", "Ecru", "Brown"], fit: "wide", material: "canvas", formality: 1, note: "Workwear canvas with a wide leg. Pair with a slim knit.", tag: "Now" },
  { id: "rollneck", name: "Merino roll neck", kind: "turtleneck", colors: ["Black", "Ecru", "Charcoal"], note: "Black roll neck, camel coat: the cold-weather uniform.", tag: "Now" },
  { id: "quarter", name: "Quarter-zip knit", kind: "quarter-zip", colors: ["Navy", "Sage", "Grey"], note: "Zipped over an oxford, it reads smart without trying.", tag: "Essential" },
  { id: "waxed", name: "Waxed jacket", kind: "waxed-jacket", colors: ["Loden", "Olive", "Navy"], note: "Rain-ready and better with age. Hood under it for high-low.", tag: "Now" },
  { id: "relaxed-jeans", name: "Relaxed jeans", kind: "jeans", colors: ["Ecru", "Black"], fit: "relaxed", boldness: 1, note: "A lighter, looser second pair for warmer days.", tag: "Now" },
  { id: "shell", name: "Rain shell", kind: "rain-shell", colors: ["Black", "Navy", "Olive"], note: "Light and packable, for the days the forecast turns.", tag: "Essential" },
  { id: "puffer", name: "Puffer jacket", kind: "puffer", colors: ["Black", "Navy", "Olive"], note: "For properly cold days. Cropped ones look sharpest.", tag: "Essential" },
  { id: "henley", name: "Henley", kind: "henley", colors: ["Oatmeal", "White", "Navy"], note: "A tee with a little more going on, under an open shirt.", tag: "Essential" },
  { id: "gilet", name: "Quilted gilet", kind: "gilet", colors: ["Navy", "Olive", "Black"], note: "Warmth without bulk, over a shirt or a knit.", tag: "Now" },
  { id: "shorts", name: "Shorts", kind: "shorts", colors: ["Khaki", "Navy", "Stone"], note: "Mid-thigh, not long. For proper summer days.", tag: "Essential" },
  { id: "chelsea", name: "Chelsea boots", kind: "boots", colors: ["Black", "Brown"], material: "leather", formality: 3, note: "Sleek with trousers, easy with black jeans.", tag: "Now" },
];

/** The piece a card adds, in the colour chosen. Ids are stable per card and colour. */
export function starterItem(card: StarterCard, color: ColorName = card.colors[0]!): Item {
  return makeItem({
    id: `st-${card.id}-${color.toLowerCase()}`,
    // "Navy merino crewneck"; never "White white …" if a name already starts with a colour.
    name: card.name.toLowerCase().startsWith(color.toLowerCase()) ? card.name : `${color} ${card.name.charAt(0).toLowerCase()}${card.name.slice(1)}`,
    kind: card.kind,
    color,
    ...(card.fit ? { fit: card.fit } : {}),
    ...(card.material ? { material: card.material } : {}),
    ...(card.pattern ? { pattern: card.pattern } : {}),
    ...(card.formality !== undefined ? { formality: card.formality } : {}),
    ...(card.boldness !== undefined ? { boldness: card.boldness } : {}),
  });
}

/** Has this wardrobe already got this card's piece (same kind, any listed colour, or same card)? */
export function alreadyHas(card: StarterCard, items: Item[]): boolean {
  return items.some((i) => i.id.startsWith(`st-${card.id}-`) || (i.kind === card.kind && card.colors.includes(i.color as ColorName)));
}
