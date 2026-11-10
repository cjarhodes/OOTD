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
/** The swipe goes in rounds: the basics first, so a first look is possible within twelve cards. */
export type Round = 1 | 2 | 3 | 4;

export const ROUNDS: readonly Round[] = [1, 2, 3, 4];

export const ROUND_NAME: Record<Round, string> = {
  1: "The basics",
  2: "Layers and jackets",
  3: "Shoes",
  4: "What’s current",
};

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
  /** Which round of the swipe the card belongs to. */
  round: Round;
  /** Why it earns its place, in a line. */
  note: string;
  tag: "Essential" | "Now";
}

export const STARTER_DECK: StarterCard[] = [
  { id: "tee", name: "Heavyweight tee", kind: "tee", colors: ["White", "Black", "Ecru", "Grey"], fit: "boxy", round: 1, note: "Boxy and heavy, so it holds its shape under everything else.", tag: "Essential" },
  { id: "jeans", name: "Straight-leg jeans", kind: "jeans", colors: ["Indigo", "Denim", "Black", "Ecru"], fit: "regular", round: 1, note: "Straight, not skinny. The one pair that goes with all of it.", tag: "Essential" },
  { id: "sneakers", name: "Leather sneakers", kind: "sneakers", colors: ["White", "Black"], round: 1, note: "Clean and minimal. They lift dark looks and calm loud ones.", tag: "Essential" },
  { id: "oxford", name: "Oxford shirt", kind: "oxford", colors: ["Sky", "White", "Ecru"], round: 1, note: "Buttoned for the office, open over a tee at the weekend.", tag: "Essential" },
  { id: "crew", name: "Merino crewneck", kind: "crewneck", colors: ["Navy", "Oatmeal", "Grey", "Charcoal", "Forest"], round: 1, note: "Fine enough to layer over a shirt with the collar out.", tag: "Essential" },
  { id: "long-sleeve", name: "Long-sleeve tee", kind: "long-sleeve", colors: ["White", "Ecru", "Grey", "Black"], round: 1, note: "The tee for cooler days, on its own or under an overshirt.", tag: "Essential" },
  { id: "wide-trousers", name: "Pleated wide-leg trousers", kind: "trousers", colors: ["Charcoal", "Black", "Stone", "Brown"], fit: "wide", formality: 3, round: 4, note: "The modern trouser: a fitted knit on top, room below.", tag: "Now" },
  { id: "knit-polo", name: "Knit polo", kind: "polo", colors: ["Ecru", "Navy", "Brown", "Forest"], material: "knit", formality: 3, round: 4, note: "Smarter than a tee, easier than a shirt. Tucked or loose.", tag: "Now" },
  { id: "loafers", name: "Suede loafers", kind: "loafers", colors: ["Brown", "Black", "Chocolate"], material: "suede", round: 3, note: "With wide trousers or straight jeans, socks optional.", tag: "Now" },
  { id: "chore", name: "Chore coat", kind: "chore-coat", colors: ["Indigo", "Khaki", "Black"], round: 2, note: "The workwear jacket that replaced the blazer for most days.", tag: "Now" },
  { id: "hoodie", name: "Loopback hoodie", kind: "hoodie", colors: ["Grey", "Navy", "Ecru", "Black"], round: 1, note: "Under a coat or blazer it turns smart-casual. That's the point.", tag: "Essential" },
  { id: "fleece", name: "Zip fleece", kind: "fleece", colors: ["Ecru", "Navy", "Olive", "Black", "Brown"], round: 2, note: "The weekend layer of the moment: half-zip, a little boxy, over a tee.", tag: "Now" },
  { id: "overcoat", name: "Wool overcoat", kind: "overcoat", colors: ["Camel", "Charcoal", "Navy", "Black"], round: 2, note: "Long, a size easy, worn open. Goes over everything in winter.", tag: "Essential" },
  { id: "chinos", name: "Chinos", kind: "chinos", colors: ["Khaki", "Stone", "Navy", "Olive"], round: 1, note: "The middle ground between jeans and trousers.", tag: "Essential" },
  { id: "cargos", name: "Cargo trousers", kind: "cargos", colors: ["Olive", "Black", "Stone", "Khaki"], fit: "relaxed", round: 4, note: "Relaxed and clean, not baggy. With a fleece or sweatshirt and runners.", tag: "Now" },
  { id: "overshirt", name: "Overshirt", kind: "overshirt", colors: ["Olive", "Brown", "Navy", "Charcoal"], round: 2, note: "A shirt-weight jacket for the days a coat is too much.", tag: "Now" },
  { id: "flannel", name: "Flannel shirt", kind: "flannel", colors: ["Navy", "Brown", "Forest", "Red"], pattern: "check", boldness: 1, round: 4, note: "Worn open over a tee, it's a light jacket for cool weekends.", tag: "Essential" },
  { id: "mock", name: "Merino mock neck", kind: "mock-neck", colors: ["Charcoal", "Black", "Ecru"], round: 4, note: "Under a blazer or overcoat it does the job of a shirt and tie.", tag: "Now" },
  { id: "bomber", name: "Bomber jacket", kind: "bomber", colors: ["Black", "Olive", "Navy"], round: 1, note: "Cropped and boxy. Let a longer layer show beneath it.", tag: "Essential" },
  { id: "denim-jacket", name: "Denim jacket", kind: "denim-jacket", colors: ["Indigo", "Denim", "Black", "Ecru"], round: 1, note: "Cropped and boxy. Over a hoodie with cargos or black jeans.", tag: "Essential" },
  { id: "runners", name: "Retro suede runners", kind: "runners", colors: ["Grey", "Navy", "Ecru"], material: "suede", round: 3, note: "The weekend shoe: relaxed trousers, a sweatshirt, done.", tag: "Now" },
  { id: "canvas", name: "Canvas sneakers", kind: "canvas", colors: ["White", "Ecru", "Black"], round: 3, note: "The easy warm-weather shoe: with shorts, cargos or rolled jeans.", tag: "Essential" },
  { id: "high-tops", name: "Canvas high-tops", kind: "high-tops", colors: ["White", "Black", "Ecru"], round: 3, note: "Laced loose with straight jeans or cargos, cuffs just above.", tag: "Essential" },
  { id: "trail", name: "Trail shoes", kind: "trail", colors: ["Black", "Grey", "Olive"], round: 3, note: "Grippy and light: right with cargos, a fleece and a shell on a wet weekend.", tag: "Now" },
  { id: "sandals", name: "Two-strap sandals", kind: "sandals", colors: ["Brown", "Black", "Stone"], round: 3, note: "Cork footbed, leather straps: the warm-weekend shoe, with shorts or loose trousers.", tag: "Essential" },
  { id: "clogs", name: "Suede clogs", kind: "clogs", colors: ["Stone", "Brown", "Olive", "Black"], round: 3, note: "With socks and wide trousers, from autumn into spring.", tag: "Now" },
  { id: "cardigan", name: "Chunky cardigan", kind: "cardigan", colors: ["Charcoal", "Ecru", "Brown", "Forest"], round: 2, note: "Worn open over a tee like a light jacket.", tag: "Now" },
  { id: "camp", name: "Camp-collar shirt", kind: "camp-shirt", colors: ["Ecru", "Rust", "Forest", "Black"], boldness: 1, round: 4, note: "A summer shirt, worn open over a tee for most of the year.", tag: "Now" },
  { id: "rugby", name: "Rugby shirt", kind: "rugby", colors: ["Navy", "Forest", "Burgundy"], pattern: "stripe", boldness: 1, round: 4, note: "Heavy cotton with a white collar: preppy, made for the weekend.", tag: "Now" },
  { id: "sweat", name: "Heavyweight sweatshirt", kind: "sweatshirt", colors: ["Ecru", "Grey", "Navy"], fit: "boxy", round: 2, note: "Boxy, with a white tee hem showing below.", tag: "Essential" },
  { id: "sweatpants", name: "Heavyweight sweatpants", kind: "sweatpants", colors: ["Grey", "Black", "Navy", "Ecru"], round: 4, note: "Straight-leg, not skinny joggers. Weekends only, with a crisp tee.", tag: "Now" },
  { id: "blazer", name: "Unstructured blazer", kind: "blazer", colors: ["Navy", "Charcoal", "Brown"], round: 2, note: "Soft shoulders, no lining. Wear it with jeans as much as trousers.", tag: "Essential" },
  { id: "chukka", name: "Suede chukka boots", kind: "boots", colors: ["Chocolate", "Brown", "Black"], material: "suede", round: 1, note: "Smart enough for the office, sturdy enough for the weekend.", tag: "Essential" },
  { id: "carpenter", name: "Carpenter trousers", kind: "chinos", colors: ["Stone", "Ecru", "Brown"], fit: "wide", material: "canvas", formality: 1, round: 4, note: "Workwear canvas with a wide leg. Pair with a slim knit.", tag: "Now" },
  { id: "rollneck", name: "Merino roll neck", kind: "turtleneck", colors: ["Black", "Ecru", "Charcoal"], round: 4, note: "Black roll neck, camel coat: the cold-weather uniform.", tag: "Now" },
  { id: "quarter", name: "Quarter-zip knit", kind: "quarter-zip", colors: ["Navy", "Sage", "Grey"], round: 2, note: "Zipped over an oxford, it reads smart without trying.", tag: "Essential" },
  { id: "waxed", name: "Waxed jacket", kind: "waxed-jacket", colors: ["Loden", "Olive", "Navy"], round: 2, note: "Rain-ready and better with age. Hood under it for high-low.", tag: "Now" },
  { id: "relaxed-jeans", name: "Relaxed jeans", kind: "jeans", colors: ["Ecru", "Black"], fit: "relaxed", boldness: 1, round: 4, note: "A lighter, looser second pair for warmer days.", tag: "Now" },
  { id: "shell", name: "Rain shell", kind: "rain-shell", colors: ["Black", "Navy", "Olive"], round: 1, note: "Light and packable, for the days the forecast turns.", tag: "Essential" },
  { id: "puffer", name: "Puffer jacket", kind: "puffer", colors: ["Black", "Navy", "Olive"], round: 2, note: "For properly cold days. Cropped ones look sharpest.", tag: "Essential" },
  { id: "henley", name: "Henley", kind: "henley", colors: ["Oatmeal", "White", "Navy"], round: 4, note: "A tee with a little more going on, under an open shirt.", tag: "Essential" },
  { id: "gilet", name: "Quilted gilet", kind: "gilet", colors: ["Navy", "Olive", "Black"], round: 2, note: "Warmth without bulk, over a shirt or a knit.", tag: "Now" },
  { id: "shorts", name: "Shorts", kind: "shorts", colors: ["Khaki", "Navy", "Stone"], round: 4, note: "Mid-thigh, not long. For proper summer days.", tag: "Essential" },
  { id: "chelsea", name: "Chelsea boots", kind: "boots", colors: ["Black", "Brown"], material: "leather", formality: 3, round: 3, note: "Sleek with trousers, easy with black jeans.", tag: "Now" },
  { id: "dress-shirt", name: "Dress shirt", kind: "oxford", colors: ["White", "Sky"], formality: 4, round: 4, note: "Crisp and plain, for the office and for dinner. Tucked in or left loose.", tag: "Essential" },
  { id: "vneck", name: "Merino V-neck", kind: "v-neck", colors: ["Navy", "Charcoal", "Grey", "Burgundy"], round: 2, note: "Over an oxford with the collar showing: the smart-casual knit.", tag: "Essential" },
  { id: "slim-jeans", name: "Slim jeans", kind: "jeans", colors: ["Black", "Charcoal"], fit: "slim", round: 4, note: "Slim and dark: the pair that dresses up with a blazer and boots.", tag: "Essential" },
  { id: "linen-shirt", name: "Linen shirt", kind: "oxford", colors: ["Ecru", "White", "Sky"], material: "linen", round: 4, note: "Creased on purpose. Open over a tee, or buttoned with shorts in summer.", tag: "Now" },
  { id: "linen-trousers", name: "Linen trousers", kind: "trousers", colors: ["Stone", "Ecru", "Navy"], material: "linen", formality: 2, round: 4, note: "Light and loose for hot days, with a linen shirt or a plain tee.", tag: "Now" },
  { id: "cords", name: "Corduroy trousers", kind: "chinos", colors: ["Brown", "Olive", "Navy"], material: "corduroy", round: 4, note: "Ribbed and warm for autumn: a rich colour with a plain knit.", tag: "Now" },
  { id: "suede-bomber", name: "Suede bomber", kind: "bomber", colors: ["Brown", "Chocolate", "Black"], material: "suede", round: 2, note: "Soft and cropped. Best with a plain tee and straight jeans.", tag: "Now" },
  { id: "denim-overshirt", name: "Denim overshirt", kind: "overshirt", colors: ["Indigo", "Denim", "Black"], material: "denim", round: 2, note: "Open over a tee, or buttoned up as a jacket in spring.", tag: "Now" },
  { id: "chunky", name: "Chunky jumper", kind: "crewneck", colors: ["Ecru", "Navy", "Forest"], round: 2, note: "Thick and textured. With straight jeans and boots it does the work of a coat.", tag: "Now" },
  { id: "jersey-polo", name: "Jersey polo", kind: "polo", colors: ["White", "Navy", "Sky"], round: 4, note: "The plain summer polo: tucked into chinos or loose over shorts.", tag: "Essential" },
  { id: "dress-shoes", name: "Leather dress shoes", kind: "loafers", colors: ["Black", "Brown"], material: "leather", formality: 4, round: 3, note: "For the office and for weddings, with tailored trousers or dark jeans.", tag: "Essential" },
  { id: "tailored", name: "Tailored trousers", kind: "trousers", colors: ["Navy", "Grey", "Charcoal"], formality: 4, round: 4, note: "Straight and sharp: with an oxford and a blazer, or a knit and loafers.", tag: "Essential" },
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

/**
 * The colour a piece of this type usually comes in, for when nobody said:
 * the first colour of the first starter card of that type. V-necks have no
 * card; navy is the usual v-neck.
 */
export function usualColour(kind: Kind): ColorName {
  return STARTER_DECK.find((c) => c.kind === kind)?.colors[0] ?? "Navy";
}

/** Has this wardrobe already got this card's piece (same kind, any listed colour, or same card)? */
export function alreadyHas(card: StarterCard, items: Item[]): boolean {
  return items.some((i) => i.id.startsWith(`st-${card.id}-`) || (i.kind === card.kind && card.colors.includes(i.color as ColorName)));
}
