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
| T3 | done | loop/wardrobe-entry | 2026-11-10 |
| T4 | done | loop/wardrobe-entry | 2026-11-10 |
| T5 | done | loop/wardrobe-entry | 2026-11-10 |
| T6 | done | loop/wardrobe-entry | 2026-11-10 |
| U1 | done | loop/wardrobe-entry | 2026-11-10 |
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

### T3 · 2026-11-10
What changed: a piece with no typed colour is no longer White. `usualColour(kind)` is exported from `src/lib/starter.ts` (the first colour of the first starter card of that type; v-neck is Navy; a test checks every `Kind` gets one). `parsePiece` uses, in order: the colour in the text, the colour on the brand hint (Levi's Indigo and so on), the type's usual colour, and Grey when there is no type at all. `colorGuessed` stays true whenever the colour wasn't typed. All of Appendix B table 3 is in `COLOUR_WORDS` (denim washes, "washed black" is Charcoal, and so on). `TypedPiece.colorMissing` is new: true when purple, lilac, lavender or violet was typed (an accent in an aside doesn't count); the piece then carries its usual colour with `colorGuessed` true. "multi", "multicolour" and "various" are simply not colours. Tests are in `src/lib/typed.vocab.test.ts`. "dark wash jeans" is Indigo, "khakis" Khaki, "trench coat" Camel.
Deviation to check, two existing assertions in `src/lib/typed.test.ts` changed: the plan says existing tests stay unchanged, but two of them recorded the White default that fault 3 and this task remove. `Rothy's slip on sandals` expected White and now expects Brown (usual colour for sandals); `parsePiece("hoodie")` expected White and now expects Grey (usual colour for hoodies). Nothing else in that file changed, and the `colorGuessed: true` part of the hoodie check is kept. If Alex disagrees, the alternative is to special-case those two inputs, which I didn't want to do.
Corpus: I corrected one line, "oatmeal cardigan" from Ecru to Oatmeal, because Oatmeal is a swatch in the palette and the text names it. The corpus test now asserts white guesses is 0 and that `colorMissing` is true on exactly the `colourMissing` lines. A bare "tee", "sneakers", "canvas sneakers", "long-sleeve tee" or "high-tops" does come out White, because White is their usual colour; the test counts that as a usual-colour guess (White, `colorGuessed` true, `usualColour(kind)` is White), not a silent white. The rule is written at the top of the test file.
Scorecard: types 114/132, colours 82/92, white guesses 0/132, tests 159. Floors raised to types 114, colours 82.
For the next agent: the 10 colour misses left are the colour-list, count and trailing-comma lines (T4), nothing else. `TypeList.tsx` still compiles: it spreads `TypedPiece`, so `colorMissing` just rides along unused until U1. In `TypeList` a person who corrects the type from the menu keeps the colour the parser chose for the old type (or Grey when there was none); U1 or U2 could re-derive it with `usualColour` while `colorGuessed` is still true.

### T4 · 2026-11-10
What changed: `parseList` in `src/lib/typed.ts` now makes several pieces from one segment. Counts: "3 white tees", "2x black jeans", "black jeans x2", "two grey hoodies" (words up to ten, digits up to two figures so "501" and "1/4 zip" are not counts), capped at 10; a count on something with no type (or, after T6, an unsupported thing) is one row. Colour lists: "white, black and grey tees", "white/black/grey tees", "tees in white, black and grey" (turned round before splitting) and "navy and grey crewnecks" give one piece per colour, named "<Colour> <rest>" with the plural s dropped ("White tee"); plural-only garments (jeans, chinos, trousers, shorts, joggers, cargos) and shoes (pairs) keep their s. Two colours joined by "and", "&" or "/" expand only when the garment is a plural non-shoe ("navy and grey crewnecks"); "black and white tee" and "red and black check shirt" stay one piece in the first colour, as do trim colours ("white/cream and brown accented sambas") and a slash before a question mark ("Green/taupe? Bostons"). Three or more colours always expand. Colour-only segments: attach forward to the next segment with a garment when the segment before has a colour or doesn't exist, otherwise backward to the segment before when it has a garment and no colour; one that fits neither stays as its own row (as today). Attachment never crosses a newline or semicolon. Backward attachment names the piece "<Colour> <text>", for example "Navy Quarter zip". Mixed list decision: "navy crewneck, grey, black jeans" is a navy crewneck, grey jeans and black jeans (the lone "grey" goes to the garment after it because the crewneck already has its colour). `parsePiece` is unchanged in behaviour; its body is now an internal `parsePieceText`. New tests are in `src/lib/typed.lists.test.ts` (12 tests, both attachment directions, the mixed list, counts, the exceptions). No existing test changed and no corpus line changed.
Scorecard: types 124/132, colours 92/92, white guesses 0/132, tests 171. Floors raised to types 124, colours 92.
For the next agent: the 8 type misses are the 7 unsupported lines (T6) and "breton top" (T5). `TypeList.tsx` keys corrections by piece name, and a count makes identical names ("3 white tees" is three "White tee" rows), so a correction on one row applies to all three until U1 fixes keying (fault 9). `isThing` in `typed.ts` (used to decide what a colour attaches to) only counts pieces with a type; T6 should make it count unsupported pieces too. Colour-only segments are recognised from the colour words in `COLOUR_WORDS` and `COLOR_NAMES`, so a new colour word is picked up everywhere.

### T5 · 2026-11-10
What changed: `TypedPiece` has optional `pattern` (stripe, check, print) and `fit`, and `typedItem` passes both to `makeItem`; a plain piece has neither, so `makeItem` still gives it `solid` and the type's usual cut. Pattern words are the plan's, plus "stripes"; a flannel with no pattern word is a check; "3 stripes" (the Adidas logo) is not a pattern. Cut words are the plan's, and a cut is used only if `fitsFor(slot)` allows it: "wide" only on trousers, "boxy" only on tops, nothing on shoes or on a piece with no type. If several cut words appear the first one typed wins. Asides about trim ("(with grey accents)", "with white stripes") are stripped before reading pattern and cut, using the same function the colour reader uses (`withoutAsides`, split out of `colourIn` with no change to what it strips). `Hint` has an optional `fit`: Carhartt double knee and Dickies 874 are relaxed canvas chinos (a typed cut word still wins). "breton top" and "breton" are a tee with pattern stripe. Singular "chino pants" and "chino trousers" are chinos ("chino shorts" is still shorts). Tests are in `src/lib/typed.vocab.test.ts`. The corpus test now scores pattern and fit, and asserts that no line gets a pattern or fit it didn't expect.
Corpus: I added `pattern: "check"` to "green flannel shirt", which the plan's flannel rule requires; no other line changed.
Scorecard: types 125/132, colours 92/92, patterns 5/5, fits 3/3, white guesses 0/132, tests 180. Floors raised to types 125, colours 92, patterns 5, fits 3.
For the next agent: the 7 type misses left are the unsupported lines (T6). Fit words are read from the whole text, so "wide" in a brand or model name would count on trousers; none in the corpus does. `TypeList.tsx` ignores `pattern` and `fit` on rows but they reach the saved piece through `typedItem` because it spreads the row.

### T6 · 2026-11-10
What changed: `TypedPiece` has `unsupported?: string`. Everything in Appendix B table 4 gets `kind: null` and one plain reason: "OOTD doesn't plan accessories yet" (belt, hat, cap, beanie, scarf, gloves, tie, bow tie, watch, bag, backpack, tote, sunglasses, socks, pocket square, wallet, ring, necklace, bracelet, jewellery, earrings, and the watch brands Rolex, Omega, Seiko, Casio, G-Shock), "Add the jacket and trousers as two pieces" (suit, tuxedo, tux), "OOTD doesn't plan swimwear", "OOTD doesn't plan nightwear", "OOTD doesn't plan underwear" and "OOTD doesn't plan sports kit". The list is checked before any garment word, so "swim shorts" is swimwear. "Suit jacket" is still a blazer and "suit trousers" are trousers; only a bare "suit" is unsupported. Guards for look-alikes: "cap toe", "cap sleeve", "tie dye", "ring spun", "sock sneakers" and "belted coat" are not unsupported. An unsupported piece keeps a typed colour (else Grey, guessed) and has no pattern, fit or material. A count or colour list on an unsupported thing is one row: "black socks x6" is one "Black socks" row, and "white and black socks" is one row. `isThing` (T4's attach rule) now counts unsupported pieces, so "belt, brown" is one "Brown belt" row. "Rolex" is a watch. Tests are in `src/lib/typed.vocab.test.ts`. The corpus test already counted an expected-unsupported line as right only when the parser marks it unsupported; nothing in it changed.
Scorecard: types 132/132, colours 92/92, patterns 5/5, fits 3/3, white guesses 0/132, tests 186. Floors raised to types 132.
For the next agent: the corpus is only 132 lines and was written before the parser work, so 132/132 says the vocabulary is covered, not that the 90% target at 200 or more lines is met; the maintenance turns (section 8) are how it grows, and the first honest test of the parser is new lines written without looking at it. Not handled: bare "jersey", "slippers" are nightwear per the table, "trunks" alone is swimwear, "ring" and "cap" are unsupported anywhere in the text except the listed look-alikes, so an unusual model name containing them would be marked unsupported. `TypeList.tsx` has not been touched: an unsupported row has `kind: null` and shows "pick a type" and blocks the Add button, exactly as an unknown line did, until U1 shows the reason and stops it blocking. U1 can read `row.unsupported`. `typedItem` is never called for such a row.

### U1 · 2026-11-10
What changed: Type a list adds every line that has a type and a colour and keeps the rest. New `src/lib/typelist.ts` (16 tests in `typelist.test.ts`) holds the logic: `rowsOf` (parses the box into rows with corrections applied), `isReady`/`isStuck`, `addLabel` ("Add 1 piece", "Add pieces" when none are ready), `leftNote` ("2 lines left. Pick a type for each, or delete them."), `afterAdding` (the text left in the box and its corrections moved to match) and `withoutRow`. After an add with lines left, the sheet stays open with the note above the box; Close (or Esc) then reports the total added through `onAdded`, so Wardrobe's banner still counts them. With "navy crewneck, mystery thing, black belt" the button reads "Add 1 piece", and adding leaves "Mystery thing" (the parser's capitalised name, because that line made several pieces; a line left whole keeps exactly what was typed). Unsupported rows show their reason in muted text, have no controls and never count or stay. A `colorMissing` row's chip reads "Pick a colour" in the invalid style (cobalt border) and isn't ready until a colour is picked. A guessed colour keeps its "guessed" tag. Every row has an × button named "Remove <piece>". Corrections are keyed by line, place within the line and name (`0:1:White tee`), so three identical tees no longer share one; removing or adding keeps them attached to the right rows. A hand-picked type re-derives the colour with `usualColour` while the colour is still a guess. Type menus and colour chips in the rows are now 44 px tall.
Scorecard: types 132/132, colours 92/92, white guesses 0/132, tests 202 (corpus unchanged)
For the next agent: removing a row from a line that made several pieces rewrites that line from the names of the others ("3 white tees" becomes "White tee, White tee"), which reads back as the same pieces; a line with one piece is deleted whole. Rows are `Row` objects (`TypedPiece` plus `chunk` and `key`); U2 should pass `r.key` as the correction key and use `fix(r.key, { kind })`, which already re-derives the colour. The `<select>` is still in `TypeList.tsx` for U2 to replace. Not seen running in a browser.

## For Alex to try on his phone

## Questions for Alex
- T3: two existing assertions in `src/lib/typed.test.ts` had to change from White to the type's usual colour (see the T3 log entry). OK to keep?
- F4: the agent token can't change `.github/workflows/**` (no `workflow` scope). Please apply the two-line workflow change described in the F4 log entry, or give the agent a token with that scope.

## Ideas (not for now)
- Fix `SOURCE_URL` in `src/components/CloudBackup.tsx` (still `cjarhodes/Clothing`). Found in F4.
