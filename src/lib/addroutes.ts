/**
 * The four ways to add pieces, named and explained once, so every place that
 * offers them (the Wardrobe "+ Add" sheet, its empty state, the first-run card
 * and the banner on Add) says the same thing in the same order.
 */
export type AddRouteId = "quick" | "list" | "swipe" | "photos";

export interface AddRoute {
  id: AddRouteId;
  name: string;
  /** One line, no full stop to add. */
  note: string;
  /** Where it goes from a page other than Wardrobe. */
  href: string;
}

export const ADD_ROUTES: readonly AddRoute[] = [
  { id: "quick", name: "Quick add", note: "Pick a common piece and its colours.", href: "/wardrobe?add=quick" },
  { id: "list", name: "Type a list", note: "Paste or type several.", href: "/wardrobe?add=list" },
  { id: "swipe", name: "Swipe the basics", note: "Go through the starter deck.", href: "/start" },
  { id: "photos", name: "Photos", note: "Photograph your own.", href: "/add" },
];
