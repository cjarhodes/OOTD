import type { ColorName } from "./palette";
import type { Fit, Kind, Material, Pattern } from "./types";

/**
 * What people type about their wardrobe, and what each line should become.
 * The corpus test (`typed.corpus.test.ts`) runs the parser over every line.
 *
 * - `kind`: the type the piece should get, or `null` when OOTD can't dress
 *   with it (set `unsupported: true` too).
 * - `color`: the swatch the piece should get. Left out when the text names no
 *   colour and the type has no obvious usual one; such lines aren't scored for
 *   colour. For a line that expands to several pieces, use `colors` instead.
 * - `colors`: one swatch per piece, in order, for colour lists
 *   ("white, black and grey tees").
 * - `count`: how many pieces the line should become ("3 white tees").
 * - `colourMissing`: the text names a colour OOTD has no swatch for (purple).
 * - `material`, `pattern`, `fit`: recorded for later tasks; not scored yet.
 */
export interface CorpusLine {
  text: string;
  kind: Kind | null;
  color?: ColorName;
  colors?: ColorName[];
  count?: number;
  colourMissing?: boolean;
  material?: Material;
  pattern?: Pattern;
  fit?: Fit;
  unsupported?: boolean;
}

/** The 59 lines from the review (Appendix A of docs/LOOP.md). */
const SEED: CorpusLine[] = [
  { text: "white, black and grey tees", kind: "tee", colors: ["White", "Black", "Grey"] },
  { text: "3 white tees", kind: "tee", color: "White", count: 3 },
  { text: "2x black jeans", kind: "jeans", color: "Black", count: 2 },
  { text: "cargo pants", kind: "cargos", color: "Olive" },
  { text: "olive cargo pants", kind: "cargos", color: "Olive" },
  { text: "rain jacket", kind: "rain-shell", color: "Black" },
  { text: "leather jacket", kind: "bomber", color: "Black", material: "leather" },
  { text: "navy shirt", kind: "oxford", color: "Navy" },
  { text: "white dress shirt", kind: "oxford", color: "White" },
  { text: "blue button down", kind: "oxford", color: "Denim" },
  { text: "khakis", kind: "chinos", color: "Khaki" },
  { text: "grey vest", kind: "gilet", color: "Grey" },
  { text: "black parka", kind: "puffer", color: "Black" },
  { text: "navy peacoat", kind: "overcoat", color: "Navy" },
  { text: "trench coat", kind: "overcoat", color: "Camel" },
  { text: "windbreaker", kind: "rain-shell" },
  { text: "brown oxfords", kind: "loafers", color: "Brown", material: "leather" },
  { text: "black dress shoes", kind: "loafers", color: "Black", material: "leather" },
  { text: "Levi's 501", kind: "jeans", color: "Indigo" },
  { text: "Lululemon ABC pants", kind: "chinos" },
  { text: "Patagonia better sweater", kind: "fleece" },
  { text: "Barbour Bedale", kind: "waxed-jacket", color: "Olive" },
  { text: "Nike Dunks", kind: "sneakers" },
  { text: "Jordan 1s", kind: "high-tops", material: "leather" },
  { text: "black joggers", kind: "sweatpants", color: "Black" },
  { text: "grey zip up hoodie", kind: "hoodie", color: "Grey" },
  { text: "striped navy tee", kind: "tee", color: "Navy", pattern: "stripe" },
  { text: "plaid flannel", kind: "flannel", pattern: "check" },
  { text: "roll neck", kind: "turtleneck" },
  { text: "navy suit", kind: null, unsupported: true },
  { text: "black belt", kind: null, unsupported: true },
  { text: "blue jeans", kind: "jeans", color: "Denim" },
  { text: "dark wash jeans", kind: "jeans", color: "Indigo" },
  { text: "green bomber jacket", kind: "bomber", color: "Olive" },
  { text: "beige chinos", kind: "chinos", color: "Stone" },
  { text: "linen shirt", kind: "oxford", material: "linen" },
  { text: "gym shorts", kind: "shorts" },
  { text: "swim trunks", kind: null, unsupported: true },
  { text: "Allbirds", kind: "runners" },
  { text: "Ultraboosts", kind: "runners" },
  { text: "On Clouds", kind: "runners" },
  { text: "doc martens", kind: "boots", color: "Black" },
  { text: "timberlands", kind: "boots", color: "Camel" },
  { text: "uggs", kind: "boots", color: "Camel", material: "suede" },
  { text: "blundstones", kind: "boots", color: "Brown" },
  { text: "cashmere sweater", kind: "crewneck", color: "Navy", material: "knit" },
  { text: "navy cardigan", kind: "cardigan", color: "Navy" },
  { text: "puffer vest", kind: "gilet" },
  { text: "denim shirt", kind: "oxford", color: "Denim", material: "denim" },
  { text: "chambray shirt", kind: "oxford", color: "Sky" },
  { text: "corduroy trousers", kind: "trousers", material: "corduroy" },
  { text: "cords", kind: "chinos", material: "corduroy" },
  { text: "black slim jeans", kind: "jeans", color: "Black", fit: "slim" },
  { text: "wide leg trousers", kind: "trousers", fit: "wide" },
  { text: "polo shirt", kind: "polo" },
  { text: "pink polo", kind: "polo", color: "Pink" },
  { text: "purple hoodie", kind: "hoodie", colourMissing: true },
  { text: "orange beanie", kind: null, unsupported: true },
  { text: "yellow rain jacket", kind: "rain-shell", color: "Mustard" },
];

/** More lines, written the way a man would note his own wardrobe on a phone. */
const MORE: CorpusLine[] = [
  // Tops
  { text: "white Uniqlo tee", kind: "tee", color: "White" },
  { text: "Navy polo", kind: "polo", color: "Navy" },
  { text: "grey marl t shirt", kind: "tee", color: "Grey" },
  { text: "black long sleeve tee", kind: "long-sleeve", color: "Black" },
  { text: "light blue oxford shirt", kind: "oxford", color: "Sky" },
  { text: "white OCBD", kind: "oxford", color: "White" },
  { text: "pale blue button-up", kind: "oxford", color: "Sky" },
  { text: "green flannel shirt", kind: "flannel", color: "Olive" },
  { text: "red and black check shirt", kind: "flannel", color: "Red", pattern: "check" },
  { text: "Hawaiian shirt", kind: "camp-shirt" },
  { text: "navy henley", kind: "henley", color: "Navy" },
  { text: "black polo neck", kind: "turtleneck", color: "Black" },
  { text: "cream mock neck", kind: "mock-neck", color: "Ecru" },
  { text: "breton top", kind: "tee", pattern: "stripe" },
  { text: "rugby shirt, green", kind: "rugby", color: "Olive" },
  { text: "charcoal t-shirt", kind: "tee", color: "Charcoal" },
  // Mid layers
  { text: "grey crew neck jumper", kind: "crewneck", color: "Grey" },
  { text: "burgundy lambswool jumper", kind: "crewneck", color: "Burgundy", material: "knit" },
  { text: "navy v neck", kind: "v-neck", color: "Navy" },
  { text: "oatmeal cardigan", kind: "cardigan", color: "Oatmeal" },
  { text: "Quarter zip, navy", kind: "quarter-zip", color: "Navy" },
  { text: "half zip knit", kind: "quarter-zip", material: "knit" },
  { text: "black Nike hoodie", kind: "hoodie", color: "Black" },
  { text: "grey crewneck sweatshirt", kind: "sweatshirt", color: "Grey" },
  { text: "Champion sweatshirt", kind: "sweatshirt" },
  { text: "olive shacket", kind: "overshirt", color: "Olive" },
  { text: "navy gilet", kind: "gilet", color: "Navy" },
  { text: "Patagonia Synchilla", kind: "fleece" },
  { text: "black body warmer", kind: "gilet", color: "Black" },
  // Jackets and coats
  { text: "waxed jacket", kind: "waxed-jacket", material: "waxed" },
  { text: "tan chore coat", kind: "chore-coat", color: "Camel" },
  { text: "Carhartt Detroit jacket", kind: "chore-coat" },
  { text: "navy blazer", kind: "blazer", color: "Navy" },
  { text: "charcoal sport coat", kind: "blazer", color: "Charcoal" },
  { text: "black bomber", kind: "bomber", color: "Black" },
  { text: "Harrington jacket", kind: "bomber" },
  { text: "camel overcoat", kind: "overcoat", color: "Camel" },
  { text: "grey wool coat", kind: "overcoat", color: "Grey", material: "wool" },
  { text: "Canada Goose parka", kind: "puffer" },
  { text: "North Face puffer jacket, black", kind: "puffer", color: "Black" },
  { text: "Arc'teryx shell", kind: "rain-shell" },
  { text: "denim jacket", kind: "denim-jacket", color: "Denim" },
  { text: "black denim jacket", kind: "denim-jacket", color: "Black" },
  { text: "anorak", kind: "rain-shell" },
  // Trousers
  { text: "navy chinos", kind: "chinos", color: "Navy" },
  { text: "stone chinos", kind: "chinos", color: "Stone" },
  { text: "grey wool trousers", kind: "trousers", color: "Grey", material: "wool" },
  { text: "black dress pants", kind: "trousers", color: "Black" },
  { text: "charcoal suit trousers", kind: "trousers", color: "Charcoal" },
  { text: "light wash jeans", kind: "jeans", color: "Denim" },
  { text: "washed black jeans", kind: "jeans", color: "Charcoal" },
  { text: "raw denim jeans", kind: "jeans", color: "Indigo" },
  { text: "Carhartt double knees", kind: "chinos", fit: "relaxed" },
  { text: "olive shorts", kind: "shorts", color: "Olive" },
  { text: "navy chino shorts", kind: "shorts", color: "Navy" },
  { text: "grey sweatpants", kind: "sweatpants", color: "Grey" },
  { text: "tracksuit bottoms", kind: "sweatpants" },
  // Shoes
  { text: "white Common Projects", kind: "sneakers", color: "White" },
  { text: "black Converse high tops", kind: "high-tops", color: "Black" },
  { text: "Adidas Sambas, black", kind: "sneakers", color: "Black" },
  { text: "New Balance 990v5, grey", kind: "runners", color: "Grey" },
  { text: "Brown chelsea boots", kind: "boots", color: "Brown" },
  { text: "tan desert boots", kind: "boots", color: "Camel" },
  { text: "black brogues", kind: "loafers", color: "Black", material: "leather" },
  { text: "brown suede loafers", kind: "loafers", color: "Brown", material: "suede" },
  { text: "navy Vans slip-ons", kind: "canvas", color: "Navy" },
  { text: "Birkenstocks", kind: "sandals" },
  { text: "Salomon XT-6", kind: "trail" },
  // Not for OOTD
  { text: "grey wool scarf", kind: null, unsupported: true },
  { text: "Rolex", kind: null, unsupported: true },
  { text: "black socks x6", kind: null, unsupported: true },
  // Several pieces in a line
  { text: "navy and grey crewnecks", kind: "crewneck", colors: ["Navy", "Grey"] },
  { text: "two grey hoodies", kind: "hoodie", color: "Grey", count: 2 },
];

export const CORPUS: CorpusLine[] = [...SEED, ...MORE];
