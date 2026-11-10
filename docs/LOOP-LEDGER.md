# Loop ledger

The record for `docs/LOOP.md`. Append only: add rows and entries, never rewrite old ones.

## Status

| Task | State | Branch / PR | Date |
| --- | --- | --- | --- |
| F0 | done | loop/wardrobe-entry | 2026-11-09 |
| F1 | done | loop/wardrobe-entry | 2026-11-10 |
| F2 | done | loop/wardrobe-entry | 2026-11-10 |
| F3 | done | loop/wardrobe-entry | 2026-11-10 |
| F4 | blocked | loop/wardrobe-entry (workflow change not pushed) | 2026-11-10 |
| T1 | done | loop/wardrobe-entry | 2026-11-10 |
| T2 | done | loop/wardrobe-entry | 2026-11-10 |
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

### F2 · 2026-11-10
What changed: the swipe logic moved out of `src/app/start/page.tsx` into `src/lib/deck.ts` as a pure `deckReducer(state, action)` returning `{ state, effects }`, with 13 tests in `src/lib/deck.test.ts`. State is `{ deck, index, picked, shown, history }`; actions are `toggleColour`, `decide(choice, ownedIds)`, `undo`, plus `advance` (see below). Effects are `addPieces`, `addWishes` (pieces to turn into wishes with `wishFromItem`, which uses the clock, so the reducer stays pure), `removeItemIds` and `removeWishIds`. Selectors `currentCard`, `shownColour`, `tickedColours`, `chosenColours`, `isDone`, `countsOf` are exported too. The page keeps only drawing, pointer handling, the 220 ms exit timer and the calls to `addPieces`, `addWish`, `removeItem`, `removeWish`. Behaviour is unchanged.
Scorecard: types 59/132, colours 63/92, white guesses 57/132, tests 139
For the next agent: I added a fourth action, `advance`, because today `decide` records history at once but moves to the next card only after the 220 ms exit animation; folding the index change into `decide` would have changed behaviour. S4 can remove the `leaving` guard and the `advance` timer in the page. `decide` takes `ownedIds` (ids of pieces already in the wardrobe) so the reducer doesn't read the wardrobe. `alreadyHas` is still in `starter.ts`, called from the page when the deck is first built; S1 replaces it. The `Choice` type now lives in `deck.ts`.

### F3 · 2026-11-10
What changed: the gesture maths moved into `src/lib/swipe.ts` (`leanOf`, `choiceOf`, `strengthOf`, plus exported `THRESHOLD` = 90 and `LEAN` = 40), with 8 tests in `src/lib/swipe.test.ts` covering each direction, diagonals, ties and the dead zone. `src/app/start/page.tsx` imports them and its inline copies are gone. Same numbers and behaviour as before.
Scorecard: types 59/132, colours 63/92, white guesses 57/132, tests 147
For the next agent: an exact tie between sideways and upward movement goes sideways (as in the old code, since up must be strictly larger). `strengthOf` ignores downward drag. G1 will extend `choiceOf` with velocity and width; the `Choice` type is imported from `deck.ts`.

### F4 · 2026-11-10
What changed: `repository.url` in `package.json` and both `cjarhodes/Clothing` references in the README's deploy button (the clone URL and the `envLink`) now point at `cjarhodes/OOTD`. Playwright was not added (owner decision 2 is "No", the default), so the phone-sized smoke test half of F4 is skipped, and G5 should skip its Playwright extension too.
Blocked: the workflow change was not pushed. GitHub refused the push with "refusing to allow an OAuth App to create or update workflow `.github/workflows/checks.yml` without `workflow` scope", and the credentials in this session cannot be given that scope. Retrying with the same credentials would fail the same way, so I reverted the workflow edit and pushed the rest. The change still to make, by hand or by an agent with a token that has the `workflow` scope: in `.github/workflows/checks.yml` rename `name: Verify FORM` to `name: Checks`, and change the last step from `npm run build` to `npm run check`. Until then CI runs only `npm run build` (tests and build, no separate type check; the Next build does type check, but `npm run check` is the plan's gate).
Scorecard: types 59/132, colours 63/92, white guesses 57/132, tests 147
For the next agent: `SOURCE_URL` in `src/components/CloudBackup.tsx` still points at `https://github.com/cjarhodes/Clothing`. It is outside F4's listed files, so I left it (see Ideas). The workflow names Node 24 while `package.json` engines say `>=22`; left as is.

### T1 · 2026-11-10
What changed: every Appendix B table 1 word now maps to its type in `src/lib/typed.ts`. The parser now tries, in order: `HINTS` (shoe models and the longer garment phrases), then the type's own name (`KIND_WORDS`), then a new `WEAK_HINTS` list of generic words (jumper, sweater, pullover, coat, shirt, oxford, pants). The generic words were moved out of `HINTS` so that a more specific name in the same line wins ("quarter zip sweater" is a quarter-zip, "polo shirt" a polo, "chore coat" a chore coat rather than an overcoat). Cargo pants are cargos, a puffer vest is a gilet, and "oxfords" (plural, no "shirt") are leather loafers per owner decision 5. `khakis` carries usual colour Khaki; `chambray` carries Sky. New `src/lib/typed.vocab.test.ts` has a row for every table 1 word. Existing tests are unchanged.
Scorecard: types 97/132, colours 65/92, white guesses 55/132, tests 152. Floors raised to types 97, colours 65.
For the next agent: the remaining type misses are brands and models (T2), the unsupported lines (T6), the colour-list and count lines (T4), "breton top" (T5 pattern word, not in table 1, so I left it) and four lines where a colour trails after a comma ("Quarter zip, navy", "rugby shirt, green", "Adidas Sambas, black", "North Face puffer jacket, black"): `parseList` splits on commas, so these become two pieces. T4's rule for colour-only segments should cover them (attach to the previous segment when the segment before has a garment and no colour). Singular "chino pants" is not matched by the chinos label (`chinoss?`), which I left alone.

### T2 · 2026-11-10
What changed: the Appendix B table 2 brands and models are in `src/lib/typed.ts`. Order of attempts is now: `MODEL_HINTS`, `HINTS`, the type's own name, `WEAK_HINTS`, then `BRAND_HINTS`. So a garment word beats a brand ("Patagonia rain jacket" is a rain shell, "Moncler sweater" a crewneck, "Brooks Brothers shirt" an oxford). `MODEL_HINTS` holds only the models whose names contain a garment word and so need to go first: Better Sweater, Synchilla, Retro-X, Snap-T (fleece), Down Sweater (puffer), ABC pants, double knees and Dickies 874 (chinos, canvas), Nike Blazers, Chuck 70 high. Everything else (Levi's, 501 to 514, Barbour, Dunks, Jordans, Allbirds, Docs, Timberlands, Uggs and so on) is in `BRAND_HINTS`, with the usual colours and materials from the table. New tests in `src/lib/typed.vocab.test.ts` cover every table 2 row.
Scorecard: types 114/132, colours 71/92, white guesses 49/132, tests 155. Floors raised to types 114, colours 71.
For the next agent: the table says Carhartt double knee and Dickies 874 are "fit relaxed"; `TypedPiece` has no fit until T5, so I set only the material. T5 should add `fit: "relaxed"` to those two hints (`Hint` will need a `fit` field). Usual colours from the table (Indigo, Olive, Black, Camel, Brown) are set on the hints and only apply when the brand hint is what matched the type; T3 adds the per-type usual colour for everything else. Remaining type misses: colour-list and count lines (T4), unsupported lines (T6), "breton top" (T5), and four lines with a trailing colour after a comma (see T1).

## For Alex to try on his phone

## Questions for Alex
- F4: the agent token can't change `.github/workflows/**` (no `workflow` scope). Please apply the two-line workflow change described in the F4 log entry, or give the agent a token with that scope.

## Ideas (not for now)
- Fix `SOURCE_URL` in `src/components/CloudBackup.tsx` (still `cjarhodes/Clothing`). Found in F4.
