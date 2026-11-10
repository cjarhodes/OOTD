/**
 * The words a screen reader hears after each action in Quick add, Type a list
 * and the swipe. Pure, so the wording can be tested. Piece names go in the
 * middle of a sentence in lower case ("Added white heavyweight tee").
 */

/** "a", "a and b", "a, b and c", in lower case. */
export function nameList(names: readonly string[]): string {
  const lower = names.map((n) => n.toLowerCase());
  if (lower.length <= 1) return lower[0] ?? "";
  return `${lower.slice(0, -1).join(", ")} and ${lower[lower.length - 1]}`;
}

/** Up to three pieces are named; more are counted. */
export function addedMessage(names: readonly string[]): string {
  if (names.length === 0) return "Nothing added";
  if (names.length <= 3) return `Added ${nameList(names)}`;
  return `Added ${names.length} pieces`;
}

export function wishlistMessage(names: readonly string[]): string {
  return `On your wishlist: ${nameList(names)}`;
}

export function removedMessage(name: string): string {
  return `Removed ${name.toLowerCase()}`;
}

export function recolouredMessage(name: string, colour: string): string {
  return `Changed ${name.toLowerCase()} to ${colour.toLowerCase()}`;
}

export const SKIPPED = "Skipped";
export const UNDONE = "Undone";

/** What a swipe decision did: pieces added, wishes added, or neither. */
export function swipeMessage(choice: "have" | "skip" | "want", added: readonly string[], wished: readonly string[]): string {
  if (choice === "skip") return SKIPPED;
  if (choice === "want") return wished.length ? wishlistMessage(wished) : "Nothing new to add";
  return added.length ? addedMessage(added) : "Nothing new to add";
}

/** The message with how the round or the deck ended, when it did. */
export function withEnding(message: string, ending: string | null): string {
  return ending ? `${message}. ${ending}` : message;
}
