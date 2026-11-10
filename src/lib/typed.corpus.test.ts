import { describe, expect, it } from "vitest";
import { CORPUS, type CorpusLine } from "./typed.corpus";
import { parseList, type TypedPiece } from "./typed";
import { usualColour } from "./starter";

/**
 * Floors: how many corpus lines the parser must get right. They are set to
 * what the parser achieves today and only ever go UP; a floor never goes down.
 */
const FLOOR_TYPES = 124;
const FLOOR_COLOURS = 92;

/**
 * Scoring rules (one point per corpus line):
 *
 * Type: the line is right only if the parser returns exactly the expected
 * number of pieces (`count`, else `colors.length`, else 1) and every piece has
 * the expected `kind`. A line that should be unsupported is right only when
 * the parser marks it unsupported (a non-empty `unsupported` field on the
 * piece), not merely when it finds no type.
 *
 * Colour: scored only on lines that state an expected colour (`color` or
 * `colors`). It is right if the piece count matches and each piece's colour
 * matches (`colors` in order, or `color` for every piece). Lines that expect
 * no colour, or a missing swatch (`colourMissing`), aren't in the colour total.
 *
 * White guesses: pieces that came out White although the text never says
 * "white". The target is 0 and the test asserts it. One case is not a guess:
 * a type whose usual colour really is white (a bare "tee", "sneakers", "canvas
 * sneakers"). There the piece is White, `colorGuessed` is true, and
 * `usualColour(kind)` is White, so it is the type's usual colour, declared as
 * a guess the person can see, and not a silent default. Any other White that
 * the text didn't ask for counts.
 *
 * Missing swatches: a line marked `colourMissing` must come back with
 * `colorMissing` true, and no other line may.
 */
function silentWhite(c: CorpusLine, got: TypedPiece[]): boolean {
  if (/white/i.test(c.text)) return false;
  return got.some((p) => p.color === "White" && !(p.colorGuessed && p.kind !== null && usualColour(p.kind) === "White"));
}

function expectedCount(c: CorpusLine): number {
  return c.count ?? c.colors?.length ?? 1;
}

function typeRight(c: CorpusLine, got: TypedPiece[]): boolean {
  if (got.length !== expectedCount(c)) return false;
  if (c.unsupported) return got.every((p) => Boolean((p as { unsupported?: string }).unsupported));
  return got.every((p) => p.kind === c.kind);
}

function colourRight(c: CorpusLine, got: TypedPiece[]): boolean {
  if (got.length !== expectedCount(c)) return false;
  return got.every((p, i) => p.color === (c.colors ? c.colors[i] : c.color));
}

describe("typed corpus", () => {
  it("scores the parser against what people type", () => {
    const scoredForColour = CORPUS.filter((c) => c.color || c.colors);
    let types = 0;
    let colours = 0;
    let whiteGuesses = 0;
    let missingWrong = 0;
    for (const c of CORPUS) {
      const got = parseList(c.text);
      if (typeRight(c, got)) types++;
      if (scoredForColour.includes(c) && colourRight(c, got)) colours++;
      if (silentWhite(c, got)) whiteGuesses++;
      if (got.some((p) => p.colorMissing) !== Boolean(c.colourMissing)) missingWrong++;
    }
    console.log(`types ${types}/${CORPUS.length}`);
    console.log(`colours ${colours}/${scoredForColour.length}`);
    console.log(`white guesses ${whiteGuesses}/${CORPUS.length}`);
    expect(CORPUS.length).toBeGreaterThanOrEqual(119);
    expect(types).toBeGreaterThanOrEqual(FLOOR_TYPES);
    expect(colours).toBeGreaterThanOrEqual(FLOOR_COLOURS);
    expect(whiteGuesses).toBe(0);
    expect(missingWrong).toBe(0);
  });
});
