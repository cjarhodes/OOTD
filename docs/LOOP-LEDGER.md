# Loop ledger

The record for `docs/LOOP.md`. Append only: add rows and entries, never rewrite old ones.

## Status

| Task | State | Branch / PR | Date |
| --- | --- | --- | --- |
| F0 | done | loop/wardrobe-entry | 2026-11-09 |
| F1 | done | loop/wardrobe-entry | 2026-11-10 |
| F2 | todo | | |
| F3 | todo | | |
| F4 | todo | | |
| T1 | todo | | |
| T2 | todo | | |
| T3 | todo | | |
| T4 | todo | | |
| T5 | todo | | |
| T6 | todo | | |
| U1 | todo | | |
| U2 | todo | | |
| U3 | todo | | |
| U4 | todo | | |
| Q1 | todo | | |
| Q2 | todo | | |
| Q3 | todo | | |
| S1 | todo | | |
| S2 | todo | | |
| S3 | todo | | |
| S4 | todo | | |
| G1 | todo | | |
| G2 | todo | | |
| G3 | todo | | |
| G4 | todo | | |
| G5 | todo | | |
| D1 | todo | | |
| D2 | todo | | |
| D3 | todo | | |
| D4 | todo | | |
| P1 | todo | | |
| P2 | todo | | |

States: todo, done, blocked.

## Log

### F0 · 2026-11-09
What changed: the plan (`docs/LOOP.md`) and this ledger were added on `loop/wardrobe-entry`.
Scorecard: types 24/59 on the seed lines (not yet a test), colours not measured, white guesses 20, tests 125.
For the next agent: start at F1. The 59 seed lines and their expected values are in Appendix A of the plan.

### F1 · 2026-11-10
What changed: added `src/lib/typed.corpus.ts` (132 lines: the 59 seed lines from Appendix A plus 73 of my own, spread across tops, mid layers, jackets, trousers and shoes, with a few unsupported items and multi-piece lines) and `src/lib/typed.corpus.test.ts`, which runs `parseList` over each line, prints the counts and fails below the floors. The scoring rules are documented at the top of the test. A line is right on type only if the piece count (`count`, else the number of `colors`, else 1) and every piece's type match; an expected-unsupported line is right only if the parser marks it unsupported (it can't yet, so those score 0). Colour is scored only on lines that state an expected colour, and is right if the count matches and each piece's colour matches. I added an optional `colors` list and `colourMissing` flag to the corpus line shape for colour lists and purple.
Scorecard: types 59/132, colours 63/92 (lines with an expected colour), white guesses 57/132, tests 126. Floors: types 59, colours 63. On the 59 seed lines alone the strict rule gives types 17/59 (the plan's 24/59 did not count counts, colour lists or unsupported lines).
For the next agent: floors only go up. `material`, `pattern` and `fit` are recorded in the corpus but not scored yet; T5 should start scoring pattern and fit, T6 makes the unsupported lines score. White guesses is printed but not asserted; T3 should assert it is 0. Corpus colours follow Appendix B table 3 and the "usual colour" column, so they will be wrong until T1 to T3 land.

## For Alex to try on his phone

## Questions for Alex

## Ideas (not for now)
