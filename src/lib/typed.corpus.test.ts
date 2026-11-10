import { describe, expect, it } from "vitest";
import { CORPUS, type CorpusLine } from "./typed.corpus";
import { parseList, type TypedPiece } from "./typed";

/**
 * Floors: how many corpus lines the parser must get right. They are set to
 * what the parser achieves today and only ever go UP; a floor never goes down.
 */
const FLOOR_TYPES = 114;
const FLOOR_COLOURS = 71;

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
 * "white". The target is 0.
 */
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
    for (const c of CORPUS) {
      const got = parseList(c.text);
      if (typeRight(c, got)) types++;
      if (scoredForColour.includes(c) && colourRight(c, got)) colours++;
      if (!/white/i.test(c.text) && got.some((p) => p.color === "White")) whiteGuesses++;
    }
    console.log(`types ${types}/${CORPUS.length}`);
    console.log(`colours ${colours}/${scoredForColour.length}`);
    console.log(`white guesses ${whiteGuesses}/${CORPUS.length}`);
    expect(CORPUS.length).toBeGreaterThanOrEqual(119);
    expect(types).toBeGreaterThanOrEqual(FLOOR_TYPES);
    expect(colours).toBeGreaterThanOrEqual(FLOOR_COLOURS);
  });
});
