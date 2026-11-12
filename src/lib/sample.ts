import { addDays } from "./dates";
import { makeItem } from "./kinds";
import { hash } from "./engine/weather";
import type { Item, Wear } from "./types";

/**
 * The sample wardrobe used by the public demo. Original illustrations only:
 * none of these are photos of anyone's real clothes.
 */
export const SAMPLE_ITEMS: Item[] = [
  // base
  makeItem({ id: "b-oxford-sky", name: "Sky oxford shirt", kind: "oxford", color: "Sky" }),
  makeItem({ id: "b-oxford-white", name: "White oxford shirt", kind: "oxford", color: "White" }),
  makeItem({ id: "b-tee-white", name: "Boxy heavyweight white tee", kind: "tee", color: "White", fit: "boxy" }),
  makeItem({ id: "b-tee-navy", name: "Navy pocket tee", kind: "tee", color: "Navy" }),
  makeItem({ id: "b-tee-ecru", name: "Ecru tee", kind: "tee", color: "Ecru" }),
  makeItem({ id: "b-polo-ecru", name: "Ecru knit polo", kind: "polo", color: "Ecru", material: "knit", formality: 3 }),
  makeItem({ id: "b-mock-charcoal", name: "Charcoal mock neck", kind: "mock-neck", color: "Charcoal" }),
  makeItem({ id: "b-camp-stripe", name: "Striped camp-collar shirt", kind: "camp-shirt", color: "Forest", pattern: "stripe", boldness: 2 }),
  makeItem({ id: "b-henley-oat", name: "Oatmeal henley", kind: "henley", color: "Oatmeal" }),
  makeItem({ id: "b-turtle-black", name: "Black merino roll neck", kind: "turtleneck", color: "Black", material: "wool", boldness: 1 }),
  makeItem({ id: "b-tee-black", name: "Boxy black tee", kind: "tee", color: "Black", fit: "boxy" }),

  // mid
  makeItem({ id: "m-crew-oat", name: "Oatmeal merino crewneck", kind: "crewneck", color: "Oatmeal", material: "wool", formality: 3, fit: "slim" }),
  makeItem({ id: "m-crew-navy", name: "Navy lambswool crewneck", kind: "crewneck", color: "Navy", material: "wool", formality: 3 }),
  makeItem({ id: "m-crew-rust", name: "Rust shetland crewneck", kind: "crewneck", color: "Rust", boldness: 1 }),
  makeItem({ id: "m-overshirt-olive", name: "Olive overshirt", kind: "overshirt", color: "Olive" }),
  makeItem({ id: "m-cardigan-charcoal", name: "Charcoal cardigan", kind: "cardigan", color: "Charcoal", formality: 3 }),
  makeItem({ id: "m-hoodie-grey", name: "Grey loopback hoodie", kind: "hoodie", color: "Grey" }),
  makeItem({ id: "m-gilet-navy", name: "Navy quilted gilet", kind: "gilet", color: "Navy" }),
  makeItem({ id: "m-qzip-sage", name: "Sage quarter-zip", kind: "quarter-zip", color: "Sage", boldness: 1 }),
  makeItem({ id: "m-sweat-ecru", name: "Ecru heavyweight sweatshirt", kind: "sweatshirt", color: "Ecru", fit: "boxy" }),

  // outer
  makeItem({ id: "o-waxed-loden", name: "Loden waxed jacket", kind: "waxed-jacket", color: "Loden" }),
  makeItem({ id: "o-chore-indigo", name: "Indigo chore coat", kind: "chore-coat", color: "Indigo" }),
  makeItem({ id: "o-blazer-navy", name: "Navy unstructured blazer", kind: "blazer", color: "Navy", fit: "relaxed" }),
  makeItem({ id: "o-overcoat-camel", name: "Camel overcoat", kind: "overcoat", color: "Camel" }),
  makeItem({ id: "o-overcoat-charcoal", name: "Charcoal herringbone overcoat", kind: "overcoat", color: "Charcoal" }),
  makeItem({ id: "o-peacoat-navy", name: "Navy wool peacoat", kind: "overcoat", color: "Navy", length: 4, warmth: 5, thickness: 4, formality: 3 }),
  makeItem({ id: "o-shell-black", name: "Black rain shell", kind: "rain-shell", color: "Black" }),
  makeItem({ id: "o-bomber-black", name: "Black nylon bomber", kind: "bomber", color: "Black", boldness: 1 }),

  // bottoms
  makeItem({ id: "p-jeans-indigo", name: "Relaxed indigo jeans", kind: "jeans", color: "Indigo", fit: "relaxed" }),
  makeItem({ id: "p-jeans-ecru", name: "Ecru jeans", kind: "jeans", color: "Ecru", boldness: 1 }),
  makeItem({ id: "p-trousers-charcoal", name: "Pleated charcoal trousers", kind: "trousers", color: "Charcoal", fit: "relaxed" }),
  makeItem({ id: "p-chinos-khaki", name: "Khaki chinos", kind: "chinos", color: "Khaki" }),
  makeItem({ id: "p-chinos-olive", name: "Olive fatigues", kind: "chinos", color: "Olive", formality: 1, fit: "relaxed" }),
  makeItem({ id: "p-trousers-black", name: "Black wide-leg trousers", kind: "trousers", color: "Black", formality: 3, boldness: 1, fit: "wide" }),
  makeItem({ id: "p-carpenter-stone", name: "Stone wide carpenter trousers", kind: "chinos", color: "Stone", material: "canvas", formality: 1, fit: "wide" }),

  // shoes
  makeItem({ id: "s-sneakers-white", name: "White leather sneakers", kind: "sneakers", color: "White" }),
  makeItem({ id: "s-loafers-brown", name: "Brown suede loafers", kind: "loafers", color: "Brown" }),
  makeItem({ id: "s-boots-chocolate", name: "Chocolate chukka boots", kind: "boots", color: "Chocolate" }),
  makeItem({ id: "s-runners-grey", name: "Grey suede runners", kind: "runners", color: "Grey", material: "suede", delicate: true }),
];

/**
 * A plausible past month of wears so the demo shows familiar favourites and
 * overlooked pieces. Generated relative to the viewing date.
 */
export function sampleWears(today: string): Wear[] {
  const favourites = [
    ["b-oxford-sky", "m-crew-navy", "p-jeans-indigo", "s-sneakers-white"],
    ["b-tee-white", "p-jeans-indigo", "s-sneakers-white"],
    ["b-oxford-white", "o-blazer-navy", "p-trousers-charcoal", "s-loafers-brown"],
    ["b-tee-navy", "m-overshirt-olive", "p-chinos-khaki", "s-sneakers-white"],
    ["b-oxford-sky", "m-crew-oat", "o-waxed-loden", "p-chinos-khaki", "s-boots-chocolate"],
    ["b-tee-white", "m-hoodie-grey", "p-jeans-indigo", "s-runners-grey"],
  ];
  const wears: Wear[] = [];
  for (let d = 30; d >= 3; d--) {
    const date = addDays(today, -d);
    const h = hash(date);
    if (h % 5 === 0) continue;
    wears.push({ date, itemIds: favourites[h % favourites.length]! });
  }
  return wears;
}
