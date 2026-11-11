import { KINDS, makeItem } from "./kinds";
import type { ColorName } from "./palette";
import type { Fit, Item, Kind, Material, Pattern } from "./types";

/**
 * The starter deck: the pieces most men already own, and the ones that make a
 * wardrobe feel current. Swiping through it builds a wardrobe in a minute,
 * without photographing anything; each card becomes an illustrated piece.
 *
 * Order matters: it opens with the essentials (so a first look is possible
 * quickly) and mixes classics with what's current, so it never feels like an
 * inventory. Several cards can share a type (corduroy, wool and linen
 * trousers); they differ in cloth, cut and how smart they are.
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
  /** Where a classic sits apart from its type's usual: a trench is a lighter coat, a parka a longer puffer. */
  warmth?: number;
  thickness?: number;
  length?: number;
  /** A zip-up hoodie is a hoodie worn open. */
  front?: Item["front"];
  /** False for pieces shown only on the one-page tick list: the swipe deck stays short enough to finish in a minute. */
  swipe?: false;
  /** Essential: nearly everyone has one. Classic: the long-standing staples. Now: what's current. */
  tag: "Essential" | "Classic" | "Now";
}

export const STARTER_DECK: StarterCard[] = [
  { id: "tee", name: "Heavyweight tee", kind: "tee", colors: ["White", "Black", "Ecru", "Grey"], fit: "boxy", note: "Boxy and heavy, so it holds its shape under everything else.", tag: "Essential" },
  { id: "pocket-tee", name: "Pocket tee", kind: "tee", colors: ["White", "Navy", "Grey", "Olive"], swipe: false, note: "The regular-fit tee, with a chest pocket. Under anything.", tag: "Classic" },
  { id: "marl-tee", name: "Marl tee", kind: "tee", colors: ["Grey", "Charcoal", "Oatmeal"], swipe: false, note: "Flecked grey jersey: the gym-class tee that goes with jeans.", tag: "Classic" },
  { id: "striped-tee", name: "Striped tee", kind: "tee", colors: ["Navy", "Ecru", "Black"], pattern: "stripe", boldness: 1, swipe: false, note: "Short-sleeved stripes for summer, under an open shirt or alone.", tag: "Classic" },
  { id: "jeans", name: "Straight-leg jeans", kind: "jeans", colors: ["Indigo", "Denim", "Black", "Ecru"], fit: "regular", note: "Straight, not skinny. The one pair that goes with all of it.", tag: "Essential" },
  { id: "sneakers", name: "Leather sneakers", kind: "sneakers", colors: ["White", "Black"], note: "Clean and minimal. They lift dark looks and calm loud ones.", tag: "Essential" },
  { id: "retro-trainers", name: "Slim retro trainers", kind: "sneakers", colors: ["White", "Black", "Navy"], swipe: false, note: "Low, flat and narrow, with a gum sole. Right under wide trousers.", tag: "Now" },
  { id: "suede-sneakers", name: "Suede sneakers", kind: "sneakers", colors: ["Grey", "Navy", "Brown"], material: "suede", swipe: false, note: "Softer than leather ones. Keep them out of the rain.", tag: "Classic" },
  { id: "oxford", name: "Oxford shirt", kind: "oxford", colors: ["Sky", "White", "Ecru"], note: "Buttoned for the office, open over a tee at the weekend.", tag: "Essential" },
  { id: "poplin", name: "Poplin dress shirt", kind: "oxford", colors: ["White", "Sky"], formality: 4, swipe: false, note: "Crisp and plain, for a suit or under a crewneck.", tag: "Classic" },
  { id: "crew", name: "Merino crewneck", kind: "crewneck", colors: ["Navy", "Oatmeal", "Grey", "Charcoal", "Forest"], note: "Fine enough to layer over a shirt with the collar out.", tag: "Essential" },
  { id: "v-neck", name: "V-neck jumper", kind: "v-neck", colors: ["Navy", "Grey", "Burgundy", "Charcoal"], note: "Made to show a shirt collar, with or without a tie.", tag: "Classic" },
  { id: "long-sleeve", name: "Long-sleeve tee", kind: "long-sleeve", colors: ["White", "Ecru", "Grey", "Black"], note: "The tee for cooler days, on its own or under an overshirt.", tag: "Essential" },
  { id: "wide-trousers", name: "Pleated wide-leg trousers", kind: "trousers", colors: ["Charcoal", "Black", "Stone", "Brown"], fit: "wide", formality: 3, note: "The modern trouser: a fitted knit on top, room below.", tag: "Now" },
  { id: "knit-polo", name: "Knit polo", kind: "polo", colors: ["Ecru", "Navy", "Brown", "Forest"], material: "knit", formality: 3, note: "Smarter than a tee, easier than a shirt. Tucked or loose.", tag: "Now" },
  { id: "pique-polo", name: "Piqué polo", kind: "polo", colors: ["Navy", "White", "Black", "Forest", "Burgundy"], material: "cotton", note: "The cotton polo: collar up to the job, easy as a tee.", tag: "Classic" },
  { id: "ls-polo", name: "Long-sleeve polo", kind: "polo", colors: ["Navy", "Charcoal", "Forest", "Ecru"], material: "knit", formality: 3, warmth: 2, swipe: false, note: "A polo for autumn: under a blazer it stands in for a shirt.", tag: "Now" },
  { id: "loafers", name: "Suede loafers", kind: "loafers", colors: ["Brown", "Black", "Chocolate"], material: "suede", note: "With wide trousers or straight jeans, socks optional.", tag: "Now" },
  { id: "desert", name: "Suede desert boots", kind: "boots", colors: ["Oatmeal", "Brown", "Camel"], material: "suede", formality: 2, note: "Crepe sole, two eyelets. With jeans, chinos or cords.", tag: "Classic" },
  { id: "chore", name: "Chore coat", kind: "chore-coat", colors: ["Indigo", "Khaki", "Black"], note: "The workwear jacket that replaced the blazer for most days.", tag: "Now" },
  { id: "hoodie", name: "Loopback hoodie", kind: "hoodie", colors: ["Grey", "Navy", "Ecru", "Black"], note: "Under a coat or blazer it turns smart-casual. That's the point.", tag: "Essential" },
  { id: "zip-hoodie", name: "Zip-up hoodie", kind: "hoodie", colors: ["Grey", "Navy", "Black"], front: "open", swipe: false, note: "Worn open over a tee, like a soft jacket.", tag: "Essential" },
  { id: "half-zip", name: "Half-zip sweatshirt", kind: "quarter-zip", colors: ["Grey", "Navy", "Ecru"], material: "fleece", formality: 1, swipe: false, note: "A sweatshirt with a collar. Zip down over a tee.", tag: "Now" },
  { id: "fleece", name: "Zip fleece", kind: "fleece", colors: ["Ecru", "Navy", "Olive", "Black", "Brown"], swipe: false, note: "The weekend layer of the moment: half-zip, a little boxy, over a tee.", tag: "Now" },
  { id: "overcoat", name: "Wool overcoat", kind: "overcoat", colors: ["Camel", "Charcoal", "Navy", "Black"], note: "Long, a size easy, worn open. Goes over everything in winter.", tag: "Essential" },
  { id: "leather-jacket", name: "Leather jacket", kind: "bomber", colors: ["Black", "Brown"], material: "leather", formality: 2, note: "Short and plain. Better every year you wear it.", tag: "Classic" },
  { id: "suede-jacket", name: "Suede jacket", kind: "bomber", colors: ["Brown", "Camel", "Chocolate"], material: "suede", formality: 2, warmth: 3, swipe: false, note: "Soft, short and the best brown you can wear. Dry days only.", tag: "Now" },
  { id: "varsity", name: "Varsity jacket", kind: "bomber", colors: ["Navy", "Black", "Forest"], material: "wool", boldness: 1, swipe: false, note: "Wool body, ribbed hem. Sporty with jeans and a tee.", tag: "Classic" },
  { id: "chinos", name: "Chinos", kind: "chinos", colors: ["Khaki", "Stone", "Navy", "Olive"], note: "The middle ground between jeans and trousers.", tag: "Essential" },
  { id: "wide-chinos", name: "Wide-leg chinos", kind: "chinos", colors: ["Stone", "Khaki", "Navy"], fit: "wide", swipe: false, note: "Chinos with room in the leg. A fitted top keeps them sharp.", tag: "Now" },
  { id: "fatigues", name: "Fatigue trousers", kind: "chinos", colors: ["Olive", "Khaki"], fit: "relaxed", formality: 1, swipe: false, note: "Army-surplus cotton, relaxed. With a tee and canvas shoes.", tag: "Classic" },
  { id: "drawstring", name: "Drawstring trousers", kind: "trousers", colors: ["Navy", "Olive", "Stone", "Black"], material: "cotton", fit: "relaxed", formality: 1, swipe: false, note: "Loose cotton with a tie waist, for heat and for travel.", tag: "Now" },
  { id: "cords", name: "Corduroy trousers", kind: "trousers", colors: ["Brown", "Olive", "Navy", "Stone", "Camel"], material: "corduroy", fit: "regular", formality: 2, note: "Soft, warm and a little rumpled. With a knit and boots from autumn on.", tag: "Classic" },
  { id: "wool-trousers", name: "Wool trousers", kind: "trousers", colors: ["Grey", "Charcoal", "Navy"], fit: "regular", note: "Grey flannel goes with every jacket and every shoe you own.", tag: "Classic" },
  { id: "suit-trousers", name: "Suit trousers", kind: "trousers", colors: ["Navy", "Charcoal", "Grey"], fit: "regular", formality: 5, swipe: false, note: "The trousers from your suit, pressed, for the smartest days.", tag: "Classic" },
  { id: "cargos", name: "Cargo trousers", kind: "cargos", colors: ["Olive", "Black", "Stone", "Khaki"], fit: "relaxed", swipe: false, note: "Relaxed and clean, not baggy. With a fleece or sweatshirt and runners.", tag: "Now" },
  { id: "overshirt", name: "Overshirt", kind: "overshirt", colors: ["Olive", "Brown", "Navy", "Charcoal"], note: "A shirt-weight jacket for the days a coat is too much.", tag: "Now" },
  { id: "shacket", name: "Wool shirt jacket", kind: "overshirt", colors: ["Charcoal", "Navy", "Brown"], material: "wool", warmth: 3, thickness: 3, swipe: false, note: "A heavy wool overshirt: the jacket for a dry, cold day.", tag: "Now" },
  { id: "cord-shirt", name: "Corduroy overshirt", kind: "overshirt", colors: ["Brown", "Olive", "Navy"], material: "corduroy", swipe: false, note: "Soft cord, worn open over a tee from autumn on.", tag: "Classic" },
  { id: "denim-shirt", name: "Denim shirt", kind: "oxford", colors: ["Denim", "Indigo", "Black"], material: "denim", formality: 2, note: "Buttoned, or open over a white tee. Not with matching jeans.", tag: "Classic" },
  { id: "linen-shirt", name: "Linen shirt", kind: "oxford", colors: ["White", "Sky", "Ecru", "Navy", "Sage"], material: "linen", formality: 2, note: "Meant to crease. Sleeves rolled, from May to September.", tag: "Classic" },
  { id: "chambray", name: "Chambray shirt", kind: "oxford", colors: ["Sky", "Denim"], formality: 2, swipe: false, note: "Lighter and softer than denim. Looks right with chinos.", tag: "Classic" },
  { id: "short-linen", name: "Short-sleeve linen shirt", kind: "camp-shirt", colors: ["White", "Sky", "Navy", "Sage"], material: "linen", swipe: false, note: "For the hottest days, worn loose over shorts or linen trousers.", tag: "Classic" },
  { id: "flannel", name: "Flannel shirt", kind: "flannel", colors: ["Navy", "Brown", "Forest", "Red"], pattern: "check", boldness: 1, swipe: false, note: "Worn open over a tee, it's a light jacket for cool weekends.", tag: "Essential" },
  { id: "mock", name: "Merino mock neck", kind: "mock-neck", colors: ["Charcoal", "Black", "Ecru"], swipe: false, note: "Under a blazer or overcoat it does the job of a shirt and tie.", tag: "Now" },
  { id: "bomber", name: "Bomber jacket", kind: "bomber", colors: ["Black", "Olive", "Navy"], note: "Cropped and boxy. Let a longer layer show beneath it.", tag: "Essential" },
  { id: "denim-jacket", name: "Denim jacket", kind: "denim-jacket", colors: ["Indigo", "Denim", "Black", "Ecru"], note: "Cropped and boxy. Over a hoodie with cargos or black jeans.", tag: "Essential" },
  { id: "harrington", name: "Harrington jacket", kind: "bomber", colors: ["Navy", "Stone", "Khaki", "Black"], material: "cotton", warmth: 2.5, thickness: 2, formality: 2, swipe: false, note: "Light, zipped and collared, for spring and cool evenings.", tag: "Classic" },
  { id: "runners", name: "Retro suede runners", kind: "runners", colors: ["Grey", "Navy", "Ecru"], material: "suede", note: "The weekend shoe: relaxed trousers, a sweatshirt, done.", tag: "Now" },
  { id: "running", name: "Running trainers", kind: "runners", colors: ["Black", "Grey", "White"], swipe: false, note: "Your actual running shoes: weekends, travel and long walks.", tag: "Essential" },
  { id: "canvas", name: "Canvas sneakers", kind: "canvas", colors: ["White", "Ecru", "Black"], note: "The easy warm-weather shoe: with shorts, cargos or rolled jeans.", tag: "Essential" },
  { id: "penny", name: "Penny loafers", kind: "loafers", colors: ["Brown", "Black", "Burgundy"], material: "leather", note: "Leather, not suede: smart with trousers, sharp with jeans.", tag: "Classic" },
  { id: "high-tops", name: "Canvas high-tops", kind: "high-tops", colors: ["White", "Black", "Ecru"], swipe: false, note: "Laced loose with straight jeans or cargos, cuffs just above.", tag: "Essential" },
  { id: "trail", name: "Trail shoes", kind: "trail", colors: ["Black", "Grey", "Olive"], swipe: false, note: "Grippy and light: right with cargos, a fleece and a shell on a wet weekend.", tag: "Now" },
  { id: "sandals", name: "Two-strap sandals", kind: "sandals", colors: ["Brown", "Black", "Stone"], note: "Cork footbed, leather straps: the warm-weekend shoe, with shorts or loose trousers.", tag: "Essential" },
  { id: "slides", name: "Slides", kind: "sandals", colors: ["Black", "Navy"], formality: 1, swipe: false, note: "For the pool, the beach and the walk back from it.", tag: "Essential" },
  { id: "clogs", name: "Suede clogs", kind: "clogs", colors: ["Stone", "Brown", "Olive", "Black"], swipe: false, note: "With socks and wide trousers, from autumn into spring.", tag: "Now" },
  { id: "cardigan", name: "Chunky cardigan", kind: "cardigan", colors: ["Charcoal", "Ecru", "Brown", "Forest"], swipe: false, note: "Worn open over a tee like a light jacket.", tag: "Now" },
  { id: "shetland", name: "Shetland crewneck", kind: "crewneck", colors: ["Oatmeal", "Forest", "Burgundy", "Mustard", "Navy"], material: "wool", swipe: false, note: "Hairy, warm and the place for colour in a wardrobe.", tag: "Classic" },
  { id: "cotton-crew", name: "Cotton crewneck jumper", kind: "crewneck", colors: ["Navy", "Ecru", "Grey"], material: "cotton", warmth: 2.5, thickness: 2, swipe: false, note: "The summer-evening jumper, over a tee or round the shoulders.", tag: "Classic" },
  { id: "shawl", name: "Shawl-collar cardigan", kind: "cardigan", colors: ["Navy", "Charcoal", "Oatmeal"], material: "wool", warmth: 4, thickness: 4, swipe: false, note: "Thick enough to be a jacket indoors and a layer outdoors.", tag: "Classic" },
  { id: "breton", name: "Striped long-sleeve tee", kind: "long-sleeve", colors: ["Navy", "Ecru"], pattern: "stripe", boldness: 1, swipe: false, note: "The Breton top: stripes that go with everything plain.", tag: "Classic" },
  { id: "camp", name: "Camp-collar shirt", kind: "camp-shirt", colors: ["Ecru", "Rust", "Forest", "Black"], boldness: 1, swipe: false, note: "A summer shirt, worn open over a tee for most of the year.", tag: "Now" },
  { id: "rugby", name: "Rugby shirt", kind: "rugby", colors: ["Navy", "Forest", "Burgundy"], pattern: "stripe", boldness: 1, swipe: false, note: "Heavy cotton with a white collar: preppy, made for the weekend.", tag: "Now" },
  { id: "sweat", name: "Heavyweight sweatshirt", kind: "sweatshirt", colors: ["Ecru", "Grey", "Navy"], fit: "boxy", note: "Boxy, with a white tee hem showing below.", tag: "Essential" },
  { id: "sweatpants", name: "Heavyweight sweatpants", kind: "sweatpants", colors: ["Grey", "Black", "Navy", "Ecru"], swipe: false, note: "Straight-leg, not skinny joggers. Weekends only, with a crisp tee.", tag: "Now" },
  { id: "blazer", name: "Unstructured blazer", kind: "blazer", colors: ["Navy", "Charcoal", "Brown"], note: "Soft shoulders, no lining. Wear it with jeans as much as trousers.", tag: "Essential" },
  { id: "suit-jacket", name: "Suit jacket", kind: "blazer", colors: ["Navy", "Charcoal", "Grey"], formality: 5, swipe: false, note: "The jacket from your suit. It also works alone with odd trousers.", tag: "Classic" },
  { id: "tweed", name: "Tweed jacket", kind: "blazer", colors: ["Brown", "Olive", "Grey"], formality: 3, warmth: 3.5, thickness: 4, swipe: false, note: "Rough, warm and at home with cords, flannel and jeans.", tag: "Classic" },
  { id: "linen-blazer", name: "Linen blazer", kind: "blazer", colors: ["Stone", "Navy", "Ecru"], material: "linen", formality: 3, warmth: 1.5, thickness: 2, swipe: false, note: "The summer jacket: creased, light and smart over a polo.", tag: "Classic" },
  { id: "peacoat", name: "Wool peacoat", kind: "overcoat", colors: ["Navy", "Charcoal", "Black"], length: 4, warmth: 5, thickness: 4, formality: 3, note: "Short, double-breasted and warm. Collar up in the wind.", tag: "Classic" },
  { id: "duffle", name: "Duffle coat", kind: "overcoat", colors: ["Camel", "Navy"], formality: 3, length: 4, swipe: false, note: "Toggles and a hood. The friendliest winter coat.", tag: "Classic" },
  { id: "derbies", name: "Leather derby shoes", kind: "loafers", colors: ["Brown", "Black", "Chocolate"], material: "leather", note: "Lace-ups for the office, a wedding or a good dinner. Brogues count.", tag: "Classic" },
  { id: "oxfords", name: "Oxford shoes", kind: "loafers", colors: ["Black", "Chocolate"], material: "leather", formality: 5, swipe: false, note: "Plain black lace-ups, for a suit and the smartest occasions.", tag: "Classic" },
  { id: "chukka", name: "Suede chukka boots", kind: "boots", colors: ["Chocolate", "Brown", "Black"], material: "suede", note: "Smart enough for the office, sturdy enough for the weekend.", tag: "Essential" },
  { id: "work-boots", name: "Leather work boots", kind: "boots", colors: ["Brown", "Camel", "Black"], material: "leather", formality: 2, swipe: false, note: "Heavy sole, laced high. With jeans, cords or canvas.", tag: "Classic" },
  { id: "hiking", name: "Hiking boots", kind: "boots", colors: ["Brown", "Black"], material: "leather", formality: 1, swipe: false, note: "Lugged sole, padded ankle. For mud, snow and proper cold.", tag: "Classic" },
  { id: "carpenter", name: "Carpenter trousers", kind: "chinos", colors: ["Stone", "Ecru", "Brown"], fit: "wide", material: "canvas", formality: 1, swipe: false, note: "Workwear canvas with a wide leg. Pair with a slim knit.", tag: "Now" },
  { id: "rollneck", name: "Merino roll neck", kind: "turtleneck", colors: ["Black", "Ecru", "Charcoal"], note: "Black roll neck, camel coat: the cold-weather uniform.", tag: "Now" },
  { id: "cable", name: "Cable-knit jumper", kind: "crewneck", colors: ["Ecru", "Navy", "Forest"], material: "wool", thickness: 4, warmth: 4, swipe: false, note: "Thick and textured. Under a coat it is the whole outfit.", tag: "Classic" },
  { id: "quarter", name: "Quarter-zip knit", kind: "quarter-zip", colors: ["Navy", "Sage", "Grey"], swipe: false, note: "Zipped over an oxford, it reads smart without trying.", tag: "Essential" },
  { id: "waxed", name: "Waxed jacket", kind: "waxed-jacket", colors: ["Loden", "Olive", "Navy"], swipe: false, note: "Rain-ready and better with age. Hood under it for high-low.", tag: "Now" },
  { id: "trench", name: "Trench coat", kind: "overcoat", colors: ["Stone", "Khaki", "Navy"], material: "cotton", warmth: 3, thickness: 3, formality: 3, note: "The light coat for spring and autumn, belt tied, never buckled.", tag: "Classic" },
  { id: "field", name: "Field jacket", kind: "chore-coat", colors: ["Olive", "Khaki", "Navy"], swipe: false, note: "Four pockets and room for a jumper underneath.", tag: "Classic" },
  { id: "quilted", name: "Quilted jacket", kind: "chore-coat", colors: ["Navy", "Olive", "Black"], material: "technical", warmth: 3.5, swipe: false, note: "Light, warm and easy over a jumper or under a coat.", tag: "Classic" },
  { id: "mac", name: "Mac raincoat", kind: "waxed-jacket", colors: ["Stone", "Navy", "Black"], material: "cotton", formality: 3, warmth: 2.5, thickness: 3, length: 5, swipe: false, note: "The smart raincoat: over a blazer or a jumper when it pours.", tag: "Classic" },
  { id: "relaxed-jeans", name: "Relaxed jeans", kind: "jeans", colors: ["Ecru", "Black"], fit: "relaxed", boldness: 1, swipe: false, note: "A lighter, looser second pair for warmer days.", tag: "Now" },
  { id: "slim-jeans", name: "Slim tapered jeans", kind: "jeans", colors: ["Indigo", "Black", "Grey"], fit: "slim", note: "Trim, not skinny. Best under a roomy jacket or knit.", tag: "Classic" },
  { id: "shell", name: "Rain shell", kind: "rain-shell", colors: ["Black", "Navy", "Olive"], note: "Light and packable, for the days the forecast turns.", tag: "Essential" },
  { id: "puffer", name: "Puffer jacket", kind: "puffer", colors: ["Black", "Navy", "Olive"], note: "For properly cold days. Cropped ones look sharpest.", tag: "Essential" },
  { id: "parka", name: "Parka", kind: "puffer", colors: ["Olive", "Navy", "Black"], length: 4, fit: "relaxed", note: "Hooded and long enough to cover a blazer.", tag: "Classic" },
  { id: "henley", name: "Henley", kind: "henley", colors: ["Oatmeal", "White", "Navy"], swipe: false, note: "A tee with a little more going on, under an open shirt.", tag: "Essential" },
  { id: "gilet", name: "Quilted gilet", kind: "gilet", colors: ["Navy", "Olive", "Black"], swipe: false, note: "Warmth without bulk, over a shirt or a knit.", tag: "Now" },
  { id: "shorts", name: "Shorts", kind: "shorts", colors: ["Khaki", "Navy", "Stone"], note: "Mid-thigh, not long. For proper summer days.", tag: "Essential" },
  { id: "denim-shorts", name: "Denim shorts", kind: "shorts", colors: ["Denim", "Indigo", "Black"], material: "denim", swipe: false, note: "Cut above the knee. With a tee, a camp collar and canvas shoes.", tag: "Classic" },
  { id: "linen-shorts", name: "Linen shorts", kind: "shorts", colors: ["Ecru", "Navy", "Olive"], material: "linen", swipe: false, note: "The coolest thing you can wear on your legs.", tag: "Classic" },
  { id: "linen-trousers", name: "Linen trousers", kind: "trousers", colors: ["Ecru", "Stone", "Navy", "Olive"], material: "linen", fit: "relaxed", formality: 2, note: "Loose and cool, for the days too hot for chinos.", tag: "Classic" },
  { id: "boat", name: "Boat shoes", kind: "loafers", colors: ["Brown", "Navy"], material: "leather", formality: 2, swipe: false, note: "No socks, with shorts or rolled chinos.", tag: "Classic" },
  { id: "chelsea", name: "Chelsea boots", kind: "boots", colors: ["Black", "Brown"], material: "leather", formality: 3, note: "Sleek with trousers, easy with black jeans.", tag: "Now" },
];

/** The cards for swiping on a phone: the essentials and the commonest classics, short enough to finish in a minute. */
export const SWIPE_DECK: StarterCard[] = STARTER_DECK.filter((c) => c.swipe !== false);

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
    ...(card.warmth !== undefined ? { warmth: card.warmth } : {}),
    ...(card.thickness !== undefined ? { thickness: card.thickness } : {}),
    ...(card.length !== undefined ? { length: card.length } : {}),
    ...(card.front ? { front: card.front } : {}),
  });
}

/**
 * Has this wardrobe already got this card's piece? A swiped piece answers only
 * for its own card, so owning wool trousers doesn't hide the corduroy ones.
 * Anything else (typed, photographed) counts when type, cloth and colour match.
 */
export function alreadyHas(card: StarterCard, items: Item[]): boolean {
  const material = card.material ?? KINDS[card.kind].material;
  return items.some((i) =>
    i.id.startsWith("st-") ? i.id.startsWith(`st-${card.id}-`) : i.kind === card.kind && i.material === material && card.colors.includes(i.color as ColorName),
  );
}
