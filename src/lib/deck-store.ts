import type { Choice } from "./deck";

/**
 * What the swipe remembers on this device: one choice per card. It is a
 * convenience, not part of the wardrobe: it never syncs, and losing it loses
 * nothing. Storage is passed in (the browser's `localStorage` or a fake), and
 * every access is guarded, so a page with storage blocked still works.
 */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type Choices = Record<string, Choice>;

const CHOICES: readonly string[] = ["have", "skip", "want"];

/** One key per signed-in account; the sample wardrobe has its own. */
export function storeKey(accountId: string | null | undefined): string {
  return `ootd.swipe.v1.${accountId ? `u-${accountId}` : "sample"}`;
}

/** The browser's storage, or null when it can't be touched (private mode, blocked site data). */
export function browserStorage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** Read stored text into choices. Anything that isn't the expected shape is ignored, one entry at a time. */
export function parseChoices(raw: string | null): Choices {
  if (!raw) return {};
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== "object" || data === null || (data as { v?: unknown }).v !== 1) return {};
    const stored = (data as { choices?: unknown }).choices;
    if (typeof stored !== "object" || stored === null || Array.isArray(stored)) return {};
    const out: Choices = {};
    for (const [id, choice] of Object.entries(stored)) {
      if (typeof choice === "string" && CHOICES.includes(choice)) out[id] = choice as Choice;
    }
    return out;
  } catch {
    return {};
  }
}

export function loadChoices(storage: StorageLike | null, key: string): Choices {
  if (!storage) return {};
  try {
    return parseChoices(storage.getItem(key));
  } catch {
    return {};
  }
}

/** Write the choices. Failing to write is fine: the session carries on. */
export function saveChoices(storage: StorageLike | null, key: string, choices: Choices): void {
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify({ v: 1, choices }));
  } catch {
    // Storage full or blocked. The deck just won't resume next time.
  }
}

export const withChoice = (choices: Choices, cardId: string, choice: Choice): Choices => ({ ...choices, [cardId]: choice });

export function withoutChoice(choices: Choices, cardId: string): Choices {
  const { [cardId]: _gone, ...rest } = choices;
  return rest;
}

export function withoutSkipped(choices: Choices): Choices {
  return Object.fromEntries(Object.entries(choices).filter(([, c]) => c !== "skip"));
}

export const skippedCount = (choices: Choices): number => Object.values(choices).filter((c) => c === "skip").length;

/** The choices after a deck action: the new choice remembered, or an undone one forgotten. */
export function choicesAfter(
  choices: Choices,
  effects: { saveChoice: { cardId: string; choice: Choice } | null; clearChoiceId: string | null },
): Choices {
  let next = choices;
  if (effects.clearChoiceId) next = withoutChoice(next, effects.clearChoiceId);
  if (effects.saveChoice) next = withChoice(next, effects.saveChoice.cardId, effects.saveChoice.choice);
  return next;
}

/** Whether the one-time "how to swipe" hint has played. It is per device, not per account: the lesson is about the phone in your hand. */
export const HINT_KEY = "ootd.swipe.v1.hint";

export function hintSeen(storage: StorageLike | null): boolean {
  if (!storage) return false;
  try {
    return storage.getItem(HINT_KEY) === "1";
  } catch {
    return false;
  }
}

/** Remember the hint has played. Failing to write is fine: it may play again next time. */
export function markHintSeen(storage: StorageLike | null): void {
  if (!storage) return;
  try {
    storage.setItem(HINT_KEY, "1");
  } catch {
    // Storage full or blocked.
  }
}
