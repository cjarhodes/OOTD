# OOTD improvement loop: getting a wardrobe in without photos

> A standing goal and an ordered backlog for coding agents. Written 9 November 2026 against `main` at `f25b02a` (125 tests passing). Read this whole file before your first task. Read sections 1 to 4 again at the start of every task.

## 1. The goal

**Someone with no photos can get their real wardrobe into OOTD in under three minutes, on an iPhone, and enjoy doing it.**

Photographing every piece is slow, and most people stop. OOTD already has two ways around it, and both are half-finished:

- **Swipe your wardrobe** (`/start`, `src/app/start/page.tsx`, deck in `src/lib/starter.ts`): 44 cards, right for "I have it", left for "not mine", up for "want it".
- **Type a list** (`src/components/TypeList.tsx`, parser in `src/lib/typed.ts`): paste names, each matched to a type and colour.

This loop makes those two routes fast, correct and pleasant, and adds a third: **Quick add**, a two-tap way to add one common piece. Photos, the outfit engine, sync and sign-in are not part of this loop.

The loop is finished when every target in section 5 is met and the backlog in section 7 is done. After that it continues in maintenance mode (section 8) until the owner stops it.

## 2. How one turn of the loop works

Each turn does exactly one task.

> **One-off run (started 10 November 2026).** The owner asked for the backlog to be run once, straight through, not on a schedule. For this run: commit each task directly to `loop/wardrobe-entry` (one commit per task, pushed as soon as `npm run check` passes) instead of a branch and pull request per task; skip steps 3, 9 and 10 and the phase pull requests. Pull request #26 carries the whole run into `main`. Section 8 (maintenance turns) is not part of this run.

1. **Sync.** `git fetch`, check out `loop/wardrobe-entry` (create it from `main` if it doesn't exist) and pull.
2. **Read** `docs/LOOP-LEDGER.md`. Pick the first task in section 7 that is not marked done or blocked, and whose "needs" are all done.
3. **Branch** from `loop/wardrobe-entry` as `loop/<task-id>-<short-name>`, for example `loop/t1-garment-words`.
4. **Read before writing.** Open every file listed under the task, and the tests beside them.
5. **Write the test first** where the task is logic. See it fail for the right reason.
6. **Make the change.** Stay inside the task. If you notice something else worth doing, add a line to "Ideas" in the ledger. Don't do it.
7. **Verify.** `npm run check` must pass (typecheck, all tests, production build). The number of passing tests must not go down.
8. **Record.** Add a row to the ledger: task id, date, branch, what changed in one or two sentences, the scorecard numbers after the change, anything the next agent should know. If the task changed what a person sees, add or update a row in the Progress table in `docs/ROADMAP.md`, and the README where it describes that feature.
9. **Open a pull request** into `loop/wardrobe-entry`. Title: what a person can now do, in plain words ("Type 'rain jacket' and get a rain shell"). Body: what changed, how it was verified, the scorecard before and after.
10. **Merge it yourself** into `loop/wardrobe-entry` once `npm run check` has passed. If it hasn't, leave the pull request open, mark the task "blocked" in the ledger, and take the next task that doesn't depend on it. For a task marked **[review]**, merge it too, and add it to "For Alex to try on his phone" in the ledger with one line on what to look for.
11. **Stop** after one task. The next turn starts again at step 1.

Never push to `main`: it deploys to the live site. When the last task of a phase is merged, open one pull request from `loop/wardrobe-entry` into `main` titled "Phase N: <what people can now do>", listing the tasks in it and anything in "For Alex to try on his phone". The owner tries the Vercel preview of that branch and merges it. Keep working on the next phase meanwhile.

**If you are stuck:** after two failed attempts at the same task, stop. Mark it "blocked" in the ledger with what you tried and what you think is wrong, and take the next task. A blocked task with good notes is a fine outcome. A guess is not.

## 3. Rules

**Do not change these.** They are outside this loop, and a mistake in them loses someone's wardrobe.

- `src/server/**`, `src/app/api/**`, `src/state/cloud.tsx`, `src/state/auth.tsx`, `src/lib/sync.ts`, `src/lib/merge.ts`, `src/lib/backup.ts`, `src/lib/archive.ts`, `src/lib/db.ts`
- `src/lib/engine/**` (read it, don't edit it)
- The saved shape of a wardrobe: `PersonalState` in `src/state/wardrobe.tsx`, and `Item` and `WishItem` in `src/lib/types.ts`. No new fields, no renamed fields.
- The `Kind`, `Slot` and `ColorName` unions. **No new garment types and no new colours.** Each new type needs a drawing, engine rules and tagging hints; each new colour changes how looks are scored. Map new words onto the types and colours that exist. If something truly doesn't fit, see task T6.
- `package.json` dependencies. Nothing new, with one exception named in task F4.

**Always.**

- One task per pull request. If a task is bigger than it looked, split it and say so in the ledger.
- Logic goes in `src/lib/` as pure functions with tests beside them (`*.test.ts`, Vitest). Components stay thin.
- TypeScript strict, no `any`, no `@ts-ignore`. Follow the style of the file you are in.
- Copy uses British spelling ("colour", "trousers", "jumper" is understood), sentence case, no exclamation marks, and the plain voice the app already has. Read three existing strings near yours before writing one.
- Every control is a real `<button>` or `<a>`, at least 44 px tall, with a name a screen reader can say. Anything that moves respects `prefers-reduced-motion`. Light and dark themes both work: use the existing CSS variables in `src/app/globals.css`, never a raw colour.
- Built for iPhone Safari first. Think about a 375 × 667 screen and the tab bar at the bottom.
- Don't delete or weaken a test to make it pass. If a test is wrong, say why in the pull request.
- Don't reformat files you aren't changing.

**Owner decisions.** Section 9 lists choices only the owner can make. Each has a default. Use the default, note in the ledger that you did, and move on. Never invent a decision that isn't listed; put it in the ledger under "Questions for Alex" and pick a task that doesn't need it.

## 4. What the code looks like today

| Thing | Where | Notes |
| --- | --- | --- |
| Swipe page | `src/app/start/page.tsx` | One 288-line component. Deck position, ticked colours, history and drag are all `useState`. |
| Deck | `src/lib/starter.ts` | `STARTER_DECK` (44 cards), `starterItem(card, colour)` makes an `Item` with id `st-<card>-<colour>`, `alreadyHas(card, items)` filters the deck. |
| Type a list | `src/components/TypeList.tsx` | A `<dialog>` opened from Wardrobe. |
| Parser | `src/lib/typed.ts`, tests in `src/lib/typed.test.ts` | `parseList`, `parsePiece`, `typedItem`. `HINTS` (first match wins), then `KIND_WORDS` built from the labels in `KINDS`. |
| Colour sheet | `src/components/ColourSheet.tsx` | Grouped, full-height, multi or single pick. Reuse it. |
| Piece editor fields | `src/components/ItemFields.tsx` | Has the grouped "What is it?" chips. Reuse them. |
| Types and defaults | `src/lib/kinds.ts` | `KINDS[kind]` gives slot, label and defaults; `makeItem` fills an `Item` from a kind and colour. |
| Colours | `src/lib/palette.ts` | 25 named swatches in 9 families. |
| Drawings | `src/components/art/Garment.tsx` | `GarmentTile` draws any `Item` with no photo. |
| Wardrobe actions | `src/state/wardrobe.tsx` | `addPieces`, `removeItem`, `addWish`, `removeWish`, `gotWish`, `newId`. Use these; don't add new ones that write state. |
| Entry points | `src/components/FirstRun.tsx`, `src/app/wardrobe/page.tsx`, `src/app/add/page.tsx` | Swipe, photos and "Type a list" are offered in different places with different wording. |
| Swipe styles | `src/app/globals.css` from `/* ---------- swipe your wardrobe ---------- */` | |

### Faults found in review (each is fixed by a task below)

**Type a list**

1. On 59 realistic lines, 35 got no type at all, so the person has to pick one by hand. Missed: "rain jacket", "leather jacket", "navy shirt", "white dress shirt", "blue button down", "khakis", "grey vest", "parka", "peacoat", "windbreaker", "roll neck", "plaid flannel", "cords", "chambray shirt", "Levi's 501", "Barbour Bedale", "Nike Dunks", "Jordan 1s", "Doc Martens", "Timberlands", "Blundstones", "Allbirds", "Ultraboosts", "On Clouds", "brown oxfords", "black dress shoes".
2. Wrong type: "cargo pants" becomes trousers (the `pants` hint wins before the cargo label is tried). "Puffer vest" becomes a puffer jacket. "Patagonia better sweater" becomes a crewneck.
3. When no colour is typed, the piece is White: "dark wash jeans", "khakis" and "trench coat" all come out white. Purple, orange and yellow aren't understood at all.
4. "White, black and grey tees" becomes one piece called "White" with no type, plus one black tee. Colour lists don't work.
5. "3 white tees" and "2x black jeans" add one piece each, with the number left in the name.
6. One line the parser can't place blocks the whole list: the button reads "Pick a type for one piece" and nothing can be added.
7. Things OOTD doesn't dress with (belt, beanie, suit, swim trunks) look like a failure to understand, with no explanation.
8. Pattern and cut are ignored: "striped", "plaid", "slim", "wide leg".
9. Corrections are stored by the line's text, so two identical lines share one correction.
10. It is only reachable from a chip on Wardrobe. First run offers swipe and photos, not typing.

**Swipe**

11. `alreadyHas` hides a card when you own any piece of the same type in any colour the card lists. Owning black straight jeans and a white tee hides three cards: the tee (so you can never add the black one), the jeans, and the separate "Relaxed jeans" card.
12. Nothing is remembered. Leave after 20 cards and come back: you start again, and every "not mine" card is back.
13. A card takes 220 ms to leave, and taps during that time are thrown away. Fast tapping drops choices.
14. Undo disappears on the finish screen, so a wrong last swipe can't be undone.
15. Every `pointermove` sets React state, which re-renders the page and both drawings on each frame.
16. A swipe needs 90 px of travel however fast the flick. There is no velocity, and the threshold doesn't scale with the screen.
17. A first look needs a top, trousers and shoes, which are cards 1 to 3, but the deck never says "you can get dressed now". It reads as 44 cards of homework.
18. The finish screen shows a count, not the pieces. Nothing can be checked or fixed there.
19. All the swipe logic is inside the component, so none of it is tested.

**Adding one piece**

20. There is no quick way to add a single piece without a photo. The only route is to open Type a list and type its name.
21. Wardrobe has three separate add chips ("+ Add pieces", "Type a list", "Swipe the basics"), with different sets on the empty state, first run and `/add`.

## 5. Scorecard

Put these numbers in every ledger row. Each has a way to measure it that an agent can run.

| # | Measure | Today | Target | How to measure |
| --- | --- | --- | --- | --- |
| 1 | Corpus lines given the right type | 24 of 59 (41%) on the seed lines | 90% of at least 200 lines; then 95% of at least 400 | The corpus test from task F1 prints it |
| 2 | Corpus lines given the right colour | not measured | 90%, then 95% | Same test |
| 3 | Pieces that come out White when the text didn't say white | 20 of 59 lines | 0 | Same test |
| 4 | Taps to add one common piece with no photo, starting on Wardrobe | typing required | 3 or fewer | Count in the Quick add test (Q1) |
| 5 | Cards before the deck offers a first look | never offered | 12 or fewer | Deck test (D1) |
| 6 | Cards wrongly hidden by pieces you own | 2 in the example in fault 11 | 0 | Deck test (S1) |
| 7 | Choices dropped when tapping 10 times in 1.5 seconds | most of them | 0 | Deck reducer test (S4) |
| 8 | React renders per `pointermove` while dragging | 1 | 0 | Code review against G2's acceptance |
| 9 | Passing tests | 125 | never lower | `npm run check` |

## 6. The ledger

Task F0 creates `docs/LOOP-LEDGER.md` with this shape. It is append-only: add rows, never rewrite old ones.

```markdown
# Loop ledger

## Status
| Task | State | Branch / PR | Date |
| --- | --- | --- | --- |
| F0 | done | loop/f0-ledger #26 | 2026-11-10 |

States: todo, done, blocked.

## Log
### F0 · 2026-11-10
What changed: ...
Scorecard: types 24/59, colours -, white guesses 20, tests 125
For the next agent: ...

## For Alex to try on his phone
## Questions for Alex
## Ideas (not for now)
```

## 7. The backlog

Do the tasks in order. Sizes: **[small]** is pure logic with tests, well suited to a cheaper model. **[medium]** touches a component. **[review]** changes how the swipe feels or looks: merge it, and list it in the ledger for the owner to try on a phone before the phase goes to `main`.

### Phase 0: make the work measurable

**F0 · Create the ledger [small]**
Create `docs/LOOP-LEDGER.md` as in section 6, with every task id from this section listed as "todo".
Done when: the file exists and lists every task.

**F1 · The corpus test [small]**
Files: new `src/lib/typed.corpus.ts`, new `src/lib/typed.corpus.test.ts`.
`typed.corpus.ts` exports an array of `{ text, kind, color?, count?, pattern?, fit?, unsupported? }`: what a person typed, and what it should become. `kind` is a `Kind` or `null`. Leave `color` out when the text names no colour and the type has no obvious one.
Start with the 59 seed lines in Appendix A, with the expected values given there. Add at least 60 more of your own, written the way people write notes on a phone: mixed case, brand names, plurals, American and British words. Spread them across tops, layers, jackets, trousers and shoes. Don't write lines to suit the parser; write what a man would actually type about his own wardrobe.
The test runs `parseList` on each line, counts right types and right colours, prints both as "types 24/119" style lines, and fails if either count is below a `FLOOR` constant in the test file. Set each floor to today's count. Later tasks raise the floors; **a floor never goes down**.
Done when: the test passes, prints the counts, and has at least 119 lines.

**F2 · Move the swipe logic into a tested module [medium]**
Files: new `src/lib/deck.ts`, new `src/lib/deck.test.ts`, `src/app/start/page.tsx`.
Move everything in the swipe page that isn't drawing or pointer handling into a pure reducer: `deckReducer(state, action)` with state `{ deck, index, picked, shown, history }` and actions `toggleColour`, `decide(choice)`, `undo`. `decide` returns the new state and a list of effects (`pieces to add`, `wishes to add`); `undo` returns `ids to remove`. The page calls `addPieces`, `addWish`, `removeItem` and `removeWish` with those. Behaviour must be identical to today.
Tests: "have" with nothing ticked adds the colour shown; with three colours ticked it adds three pieces; "want" adds wishes and no pieces; "skip" adds nothing; undo reverses each; undo at the start does nothing; the deck ends after the last card.
Done when: the page holds no deck logic of its own, the tests pass, and swiping works as before.

**F3 · Move the gesture maths into a tested module [small]**
Files: new `src/lib/swipe.ts`, new `src/lib/swipe.test.ts`, `src/app/start/page.tsx`.
Pure functions: `leanOf(dx, dy)` returns `"have" | "skip" | "want" | null` (the 40 px lean used for the stamp), `choiceOf(dx, dy)` returns the choice on release or `null` (the 90 px rule, with up winning only when it is the larger movement), `strengthOf(dx, dy)` returns 0 to 1. Same numbers as today.
Done when: the page imports them, tests cover each direction, the diagonal cases and the dead zone.

**F4 · Check types in CI, and a phone-sized smoke test [small]**
Files: `.github/workflows/checks.yml`, `package.json`.
Change the workflow to run `npm run check` instead of `npm run build`, and rename it from "Verify FORM" to "Checks". Fix `repository.url` in `package.json` and the deploy-button link in the README, which still point at `cjarhodes/Clothing`.
Only if owner decision 2 says yes: add `@playwright/test` as a dev dependency with one test that opens `/start` at 375 × 667 on the sample wardrobe and checks the three swipe buttons are inside the viewport and above the tab bar. Otherwise skip that half and note it.
Done when: CI runs the type check and passes.

### Phase 1: the parser understands what people type

Every task here is in `src/lib/typed.ts` and its tests, raises the floors in the corpus test, and must not lower either count. Existing tests in `typed.test.ts` must keep passing unchanged.

**T1 · Everyday garment words [small]**
Add the words in Appendix B, table 1, to `HINTS`. Order matters because the first match wins: put longer, more specific phrases before the words they contain ("puffer vest" before "puffer", "cargo pants" before "pants", "rain jacket" before any bare "jacket", "denim shirt" before "denim jacket" can never matter but "shirt jacket" must come before "shirt").
Fix fault 2: "cargo pants" is cargos, "puffer vest" is a gilet.
Done when: every Appendix B table 1 row has a test, and the corpus type floor is raised to the new count.

**T2 · Brands and models [small]**
Add the brand and model hints in Appendix B, table 2. A brand hint gives a type and sometimes a material and usual colour. A garment word in the same line beats a brand ("Patagonia rain jacket" is a rain shell, not a fleece): try garment words first, brands second, except for the specific models listed.
Done when: each row has a test and the floor is raised.

**T3 · Never guess White [small]**
Three changes.
1. A usual colour for each type, used when the text names none: export `usualColour(kind)` from `src/lib/starter.ts`, which returns the first colour of the first `STARTER_DECK` card of that type. `v-neck` has no card: return Navy. A test asserts every `Kind` gets a colour.
2. More colour words, in Appendix B, table 3, including denim washes ("dark wash", "raw" are Indigo; "light wash", "stonewash", "faded" are Denim; "washed black" is Charcoal).
3. `TypedPiece.color` stays a `ColorName`, and `colorGuessed` stays true when it came from the usual colour. Add `colorMissing: boolean`, true when a colour word was typed that has no swatch (purple, lilac, lavender; see owner decision 4). The UI change for that is in U1.
Done when: scorecard line 3 is 0, the colour floor is raised, and "dark wash jeans" is Indigo, "khakis" is Khaki, "trench coat" is Camel.

**T4 · Colour lists and numbers [small]**
`parseList` returns one `TypedPiece` per piece, so these expand:
- "white, black and grey tees" and "tees in white, black and grey" and "white/black/grey tees" become three tees. Rule: when a segment made by splitting on commas, "and", "&" or "/" contains only colour words, it belongs to the next segment that has a garment in it (or, for the "in white, black and grey" form, to the previous one). Each piece is named "<Colour> <rest>", for example "White tees" becomes "White tee" (drop a plural s when there was a count or a list).
- "3 white tees", "2x black jeans", "black jeans x2", "two grey hoodies" (words up to ten) become that many pieces with the same name. Cap at 10.
- "Green/taupe? Bostons" must stay one piece in the first colour, as the existing test requires: a slash between two colours followed by a question mark, or a single-quantity model name, is one piece. Keep that test passing as written.
Add `count` handling to the corpus test so a line with `count: 3` expects three pieces.
Done when: the examples above have tests, and no existing test changes.

**T5 · Pattern and cut [small]**
Add optional `pattern` and `fit` to `TypedPiece`, passed through `typedItem` to `makeItem`.
Pattern: striped, stripe, stripes, breton are `stripe`; check, checked, plaid, gingham, tartan, houndstooth are `check`; print, printed, floral, graphic, camo, paisley are `print`. Flannel with no pattern word is `check`.
Fit: slim, skinny, tapered are `slim`; relaxed, loose, baggy are `relaxed`; wide, wide-leg, wide leg are `wide` (trousers only); boxy, oversized, cropped are `boxy` (tops only). Only use a fit that `fitsFor(slot)` in `kinds.ts` allows; otherwise ignore the word.
Take care with fault from T3: "(with grey accents)" style asides and "with white stripes" must not set the pattern either way. A stripe mentioned inside an aside is ignored.
Done when: tested, and corpus lines with `pattern` or `fit` are checked.

**T6 · Things OOTD doesn't dress with [small]**
Add `unsupported?: string` to `TypedPiece`: a short reason. Recognise belts, hats, caps, beanies, scarves, gloves, socks, underwear, boxers, ties, watches, bags, sunglasses, jewellery, whole suits, swimwear, pyjamas and sportswear kit (see Appendix B, table 4). These get `kind: null` and `unsupported: "OOTD doesn't plan accessories yet"` (or "swimwear", "nightwear", "suits as a set": one plain reason each).
"Suit jacket" is still a blazer and "suit trousers" are trousers: only a bare "suit" is unsupported.
Done when: tested, and corpus lines marked `unsupported: true` are counted as right when the parser marks them unsupported.

### Phase 2: Type a list is pleasant to use

**U1 · One bad line never blocks the rest [medium]**
Files: `src/components/TypeList.tsx`, `src/app/globals.css`.
- The button adds every line that has a type and a colour: "Add 7 pieces". Lines without a type stay in the text box afterwards, with a note above it: "2 lines left. Pick a type for each, or delete them."
- Unsupported lines show their reason in muted text, have no controls, and don't count.
- A line with `colorMissing` shows its colour chip as "Pick a colour" in the invalid style, and counts as not ready.
- A guessed colour keeps its "guessed" tag.
- Each row has a remove button (an × with the name "Remove <piece>") which deletes that line from the text.
- Fix fault 9: key corrections by the row's position and text together.
Done when: with "navy crewneck, mystery thing, black belt" the button reads "Add 1 piece", adding leaves "mystery thing" in the box, and the belt row explains itself.

**U2 · Pick the type from a sheet, not a native menu [medium]**
Files: `src/components/TypeList.tsx`, new `src/components/KindSheet.tsx`, `src/components/ItemFields.tsx`.
The 42-option native `<select>` is slow on a phone. Make `KindSheet`, a `<dialog>` in the same style as `ColourSheet`: the five groups (base, mid, outer, bottom, shoes) with a chip per type, each chip showing a small `GarmentTile` drawing and its label, closing on pick. Use it for each row in Type a list. Then use the same sheet in `ItemFields` in place of the inline "What is it?" chip groups, as a single "Type" button showing the current type, so the editor gets shorter.
Done when: both places use `KindSheet`, and nothing else about the editor changes.

**U3 · Headings and notes in pasted lists [small]**
Files: `src/lib/typed.ts`.
People paste from Notes with headings. A line that ends in a colon or is a single slot word ("Shoes:", "Jackets", "Tops") is a heading, not a piece: it produces nothing, but it sets a context for the lines under it until the next heading or blank line. Context only breaks ties: under "Shoes:", "white oxfords" is a shoe, and "Sambas" needs no help. Under "Jackets", a bare "navy bomber" already works. Also split on " and " between two garments ("jeans and chinos" is two pieces; "black and white tee" is one, because "black and white" are both colours).
Done when: tested, including a 12-line note with three headings.

**U4 · Reach it from everywhere [medium]**
Files: `src/app/wardrobe/page.tsx`, `src/components/FirstRun.tsx`, `src/app/add/page.tsx`.
Opening `/wardrobe?add=list` opens Type a list (read the query on mount, then remove it from the URL). Add "Type a list" to the first-run actions and to the banner at the top of `/add`, linking there.
Done when: all three entry points open the same sheet.

### Phase 3: Quick add

**Q1 · Add a common piece in two taps [medium]**
Files: new `src/components/QuickAdd.tsx`, new `src/lib/quickadd.ts` with tests, `src/app/wardrobe/page.tsx`, `src/app/globals.css`.
A sheet with two steps.
1. **What is it?** A grid of drawn tiles, grouped by slot, one per `STARTER_DECK` card (so "Heavyweight tee", "Straight-leg jeans", "Suede loafers": common, named pieces, not bare types), in deck order within each group. A search box at the top filters by name and runs `parsePiece` on what's typed, so typing "sambas" offers "Add 'Sambas' as sneakers".
2. **Which colours?** The card's own colours as large swatches, then "Other colour" opening `ColourSheet`. Tap one or several. The button reads "Add 1 piece" or "Add 3 pieces". Colours already owned for that card are shown ticked and can't be picked again.
Adding uses `starterItem(card, colour)` so the ids match the swipe deck and a piece can't be added twice. The sheet then returns to step 1 with a short confirmation ("Added: white heavyweight tee") so several pieces can be added in a row, and a Done button.
`quickadd.ts` holds the pure parts: grouping the deck, filtering by search, which colours are already owned.
Done when: from Wardrobe, one white tee is three taps (open, tee, Add, with white already shown as the default pick), and the pure parts are tested. Scorecard line 4 is met.

**Q2 · One add button [medium]**
Files: `src/app/wardrobe/page.tsx`, `src/components/FirstRun.tsx`, `src/app/add/page.tsx`, `src/app/globals.css`.
Fix fault 21. Wardrobe gets a single "+ Add" chip which opens a small sheet with four choices, each one line of explanation: **Quick add** (pick a common piece and its colours), **Type a list** (paste or type several), **Swipe the basics** (go through the starter deck), **Photos** (photograph your own). The empty state, first run and the `/add` banner offer the same four, in the same words and order.
Done when: the three old chips are gone and the wording is the same everywhere.

**Q3 · Another one like this [small]**
Files: `src/app/wardrobe/page.tsx`.
In a piece's sheet, for pieces without a photo, add "Add another colour". It opens `ColourSheet` (multi-pick) and adds a copy of the piece per colour picked, with a new id from `newId()`, the same details, and the colour swapped at the start of the name where the name starts with the old colour.
Done when: a navy crewneck becomes navy and grey crewnecks in two taps.

### Phase 4: the swipe is correct

**S1 · Owning one colour never hides a card [small]** (needs F2)
Files: `src/lib/starter.ts`, `src/lib/deck.ts`, `src/app/start/page.tsx`.
Replace `alreadyHas`. A card is left out of the deck only when the wardrobe has its starter piece (`st-<card>-<colour>`) in every colour the card lists. Otherwise it is shown, and the colours already owned through that card are passed to the page as `owned`: those chips are shown ticked with the label "In your wardrobe", can't be toggled, and aren't added again. A piece of the same type that didn't come from the deck (typed or photographed) never hides or locks anything.
With every listed colour owned or nothing ticked, the "I have it" button reads "Next".
Done when: the fault 11 example hides no cards, and scorecard line 6 is 0.

**S2 · Remember where you were [medium]** (needs F2; owner decision 3)
Files: `src/lib/deck.ts`, new `src/lib/deck-store.ts` with tests, `src/app/start/page.tsx`.
Save each card's choice on this device, per account, in `localStorage` (follow how `src/state/wardrobe.tsx` reads and writes `localStorage`, including its error handling, and put the account in the key). Stored value: `{ v: 1, choices: { [cardId]: "have" | "skip" | "want" } }`.
On opening `/start`: cards with a stored choice are left out, so the deck resumes where it stopped and "not mine" cards don't come back. The eyebrow counts all 44: "Quick start · 21 of 44".
The finish screen gets "Go through the ones you skipped (12)", which clears the stored "skip" choices and restarts with those cards.
This must not touch `PersonalState` or sync. It is a convenience on one device, and losing it loses nothing.
Done when: tested with a fake storage object, including corrupt and missing data.

**S3 · Undo that is always there [small]** (needs F2)
Files: `src/app/start/page.tsx`, `src/lib/deck.ts`.
Show Undo on the finish screen. Give it the name "Undo: <piece name>" for screen readers. After an undo from the finish screen, the last card comes back.
Done when: the last swipe can be undone.

**S4 · Fast tapping never drops a choice [medium]** (needs F2)
Files: `src/lib/deck.ts`, `src/app/start/page.tsx`.
Today `decide` returns early while a card is leaving. Change it so the choice is applied to the reducer at once and only the animation is queued: a second tap during the exit decides the next card straight away, and the first card finishes leaving on its own. One way: render the leaving card as a separate element keyed by card id, so the next card is already live underneath.
Done when: a reducer test applies 10 `decide` actions in a row and gets 10 history entries, and the page no longer has a `leaving` guard on input. Scorecard line 7 is 0.

### Phase 5: the swipe feels good

These are **[review]**: merge them, and list each in the ledger under "For Alex to try on his phone".

**G1 · A flick counts [review]** (needs F3)
Files: `src/lib/swipe.ts`, `src/app/start/page.tsx`.
Track pointer velocity over the last 80 ms. `choiceOf(dx, dy, vx, vy, width)` decides on either distance past `min(90, width × 0.25)` px, or speed over 0.5 px/ms with at least 24 px travelled in that direction. Up still wins only when it is the larger movement.
Done when: tests cover a short fast flick each way, a slow long drag, and a fast flick back towards the centre (which cancels).

**G2 · No renders while dragging [review]** (needs F3)
Files: `src/app/start/page.tsx`, `src/app/globals.css`.
Fix fault 15. Keep the drag position in a ref. On `pointermove`, write `--dx`, `--dy` and `--strength` as CSS custom properties on the card element inside `requestAnimationFrame`, and let CSS do the transform, the stamp's opacity and which stamp shows. React state changes only on release. Wrap `GarmentTile` use for the current and next card in `useMemo` so they don't redraw when a colour chip is tapped on the other.
Done when: `setState` is not called from the `pointermove` handler, and reduced motion still turns the transitions off. Scorecard line 8 is 0.

**G3 · The next card rises to meet you [review]** (needs G2)
Files: `src/app/globals.css`, `src/app/start/page.tsx`.
The card behind scales from 0.95 to 1 and fades from 0.55 to 1 as `--strength` goes from 0 to 1. A released card that didn't pass the threshold springs back in 180 ms with a slight overshoot (`cubic-bezier(.2,1.4,.4,1)`); one that did leaves in 160 ms. All off under reduced motion.
Done when: it matches that description in both themes.

**G4 · Show how, once [review]**
Files: `src/app/start/page.tsx`, `src/app/globals.css`, `src/lib/deck-store.ts`.
Replace the three-item help line with a one-time hint on the first card ever shown: the card leans 12 px right then left, once, with the stamps appearing, 600 ms after the page opens. Store that it has been seen beside the deck choices. Under reduced motion, show the text line instead. The buttons already say what each direction does, so the hint is the only teaching.
Done when: it plays once per device and never again.

**G5 · It fits a small phone [review]**
Files: `src/app/globals.css`, `src/app/start/page.tsx`.
At 375 × 667 with Safari's bars showing, the whole card (drawing, name, note, colour chips) and the three buttons are visible without scrolling, for the card with the most colours (five). Use `dvh`, shrink the drawing before anything else, and clamp the note to two lines. If the Playwright test from F4 exists, extend it to check this for the first five cards.
Done when: nothing on the swipe page needs scrolling at that size.

### Phase 6: the deck is shorter and smarter

**D1 · Rounds, and a look as soon as one is possible [medium]** (needs F2, S2)
Files: `src/lib/starter.ts`, `src/lib/deck.ts`, `src/app/start/page.tsx`.
Give each card a `round`: 1 "The basics" (12 cards: at least three tops, two trousers, two shoes, two mid layers, two jackets, chosen from the cards tagged Essential), 2 "Layers and jackets", 3 "Shoes", 4 "What's current". Don't change the cards themselves. The eyebrow reads "The basics · 4 of 12".
At the end of a round, a short screen: what was added (count and the drawings in a row), then "See today's look" as the main button and "Keep going: layers and jackets (11)" as the second. As soon as the wardrobe has a top, trousers and shoes (use `missingEssentials` from `FirstRun.tsx`), a quiet line appears under the buttons: "You can get dressed now. See today's look", without interrupting.
Done when: tests show round 1 holds 12 cards covering every slot, and a new account is offered a look within 12 cards. Scorecard line 5 is met.

**D2 · A finish screen you can check [medium]**
Files: `src/app/start/page.tsx`, `src/app/globals.css`.
Fix fault 18. The finish and round-end screens show the pieces just added as a grid of tiles, like Wardrobe. Tapping one opens `ColourSheet` (single pick) to correct its colour, and offers Remove. Wishlist additions are listed below, each with Remove.
Done when: a wrong colour can be fixed without leaving the page.

**D3 · Swipe one part of the wardrobe [small]** (needs D1)
Files: `src/app/start/page.tsx`, `src/app/wardrobe/page.tsx`, `src/lib/deck.ts`.
`/start?slot=shoes` shows only that slot's cards (ignoring rounds). On Wardrobe, when a slot filter is on and the deck has cards left for it, show a link under the grid: "Swipe more shoes (6)".
Done when: tested in `deck.test.ts` and linked from Wardrobe.

**D4 · More cards, as data [small]** (owner decision 5)
Files: `src/lib/starter.ts`, `src/lib/starter.test.ts` (new).
Add up to 12 cards for common pieces the deck lacks, using only existing types: for example a white dress shirt (`oxford`, formality 4, White/Sky), a V-neck jumper (`v-neck`), black jeans as their own slim card, linen shirt (`oxford`, material linen, White/Sky/Ecru, `Now`), linen trousers, corduroy trousers (`chinos`, material corduroy), suede bomber, grey sweatshirt variants are already covered so don't repeat types and colours that exist. Each needs a one-line note in the voice of the others.
New test: card ids are unique, every colour is a `ColorName`, every card's `starterItem` builds, no two cards have the same type, fit, material and first colour.
Done when: the deck is at most 56 cards and the test passes.

### Phase 7: finish

**P1 · Say what happened [small]**
Files: `src/app/start/page.tsx`, `src/components/QuickAdd.tsx`, `src/components/TypeList.tsx`.
One polite live region per screen announces each result: "Added white heavyweight tee and black heavyweight tee", "Skipped", "On your wishlist: suede loafers", "Undone". The swipe card gets `role="group"`.
Done when: each action changes the live region's text.

**P2 · Words [small]**
Read every string added in this loop, in the app's order of screens, and make them consistent: the same name for the same thing everywhere ("Quick add", "Type a list", "Swipe the basics", "Photos"; "piece", never "item"; "type", never "kind" or "category"; "colour"). Update the README's "What it does" for Swipe, Type a list and Quick add, and the ROADMAP progress table.
Done when: a search of `src/` finds no user-facing "item", "kind" or "category" in the files this loop touched.

## 8. After the backlog: maintenance turns

When every task above is done, each turn is one of these, taken in rotation. Record each in the ledger as `M-<n>`.

1. **Grow the corpus.** Add 20 new lines to `typed.corpus.ts` from one area, rotating: shoes by brand, outerwear, knitwear, trousers and denim, shirts, summer clothes, American wording, British wording, lines with numbers and colour lists, messy pasted notes. Write them before looking at how the parser handles them. Then fix what fails, and raise the floors. Stop growing at 600 lines.
2. **Paper cuts.** Read one screen's component and styles from top to bottom as a person using it on a phone would meet it. Fix up to three small faults (a wrong label, a tap target under 44 px, a missing reduced-motion rule, an unhandled empty state). Anything larger goes in "Ideas".
3. **Tidy.** Remove dead code and unused CSS left by this loop. No behaviour changes.

Stop the loop and write "Loop complete" at the top of the ledger when the corpus is at 600 lines with both floors at 95%, and two paper-cut turns in a row found nothing.

## 9. Owner decisions

Each has a default the agents use until Alex says otherwise.

| # | Question | Default |
| --- | --- | --- |
| 1 | May agents push and merge their own work? | Yes (decided 9 November 2026): every task, into `loop/wardrobe-entry`, once `npm run check` passes. `main` deploys to ootd.cjarhodes.com, so it moves only by a phase pull request that Alex merges. |
| 2 | May `@playwright/test` be added as a dev dependency for phone-sized checks? | No. Skip those halves of F4 and G5. |
| 3 | Should swipe progress follow the account to other devices? | No. This device only (`localStorage`). Syncing it means changing `PersonalState` and the merge rules, which is outside this loop. |
| 4 | Purple, lilac and lavender have no swatch. Add one? | No. The person is asked to pick a colour. Adding a swatch changes outfit scoring and is a separate piece of work. |
| 5 | Dress shoes (oxfords, derbies, brogues) have no type. | Map them to `loafers` with material leather: the nearest smart shoe. A proper type needs a drawing and engine rules. |
| 6 | Owning two of the same piece ("3 white tees"). | Typing a number adds that many. Swipe and Quick add stay one per colour. |
| 7 | Sign-in is required before `/start`. Let people swipe first and sign in to keep it? | No change in this loop. It touches how wardrobes are stored. Noted as the biggest remaining source of friction. |

## Appendix A: seed corpus (the 59 lines from the review)

Expected type, then colour. A dash means leave `color` out. "today" is what the parser returns on `f25b02a` when that is wrong.

| Text | Expected | Today |
| --- | --- | --- |
| white, black and grey tees | 3 pieces: tee White, tee Black, tee Grey | "White" no type; tee Black |
| 3 white tees | tee White, count 3 | one piece |
| 2x black jeans | jeans Black, count 2 | one piece |
| cargo pants | cargos, Olive (usual) | trousers White |
| olive cargo pants | cargos Olive | trousers |
| rain jacket | rain-shell, Black (usual) | no type |
| leather jacket | bomber, material leather, Black | no type |
| navy shirt | oxford Navy | no type |
| white dress shirt | oxford White | no type |
| blue button down | oxford Denim | no type |
| khakis | chinos Khaki | no type, White |
| grey vest | gilet Grey | no type |
| black parka | puffer Black | no type |
| navy peacoat | overcoat Navy | no type |
| trench coat | overcoat Camel (usual) | White |
| windbreaker | rain-shell | no type |
| brown oxfords | loafers Brown, leather (decision 5) | no type |
| black dress shoes | loafers Black, leather | no type |
| Levi's 501 | jeans Indigo | no type |
| Lululemon ABC pants | chinos | trousers |
| Patagonia better sweater | fleece | crewneck |
| Barbour Bedale | waxed-jacket Olive | no type |
| Nike Dunks | sneakers | no type |
| Jordan 1s | high-tops, leather | no type |
| black joggers | sweatpants Black | right |
| grey zip up hoodie | hoodie Grey | right |
| striped navy tee | tee Navy, pattern stripe | no pattern |
| plaid flannel | flannel, pattern check | no type |
| roll neck | turtleneck | no type |
| navy suit | unsupported | no type |
| black belt | unsupported | no type |
| blue jeans | jeans Denim | right |
| dark wash jeans | jeans Indigo | White |
| green bomber jacket | bomber Olive | right |
| beige chinos | chinos Stone | right |
| linen shirt | oxford, material linen | no type |
| gym shorts | shorts | right type, White |
| swim trunks | unsupported | no type |
| Allbirds | runners | no type |
| Ultraboosts | runners | no type |
| On Clouds | runners | no type |
| doc martens | boots Black | no type |
| timberlands | boots Camel | no type |
| uggs | boots Camel, suede | no type |
| blundstones | boots Brown | no type |
| cashmere sweater | crewneck, knit, Navy (usual) | White |
| navy cardigan | cardigan Navy | right |
| puffer vest | gilet | puffer |
| denim shirt | oxford Denim, material denim | no type |
| chambray shirt | oxford Sky | no type |
| corduroy trousers | trousers, corduroy | White |
| cords | chinos, corduroy | no type |
| black slim jeans | jeans Black, fit slim | no fit |
| wide leg trousers | trousers, fit wide | no fit |
| polo shirt | polo | White |
| pink polo | polo Pink | right |
| purple hoodie | hoodie, colour missing | White |
| orange beanie | unsupported | no type |
| yellow rain jacket | rain-shell Mustard | no type |

## Appendix B: vocabulary

**Table 1: garment words to existing types**

| Words | Type | Also set |
| --- | --- | --- |
| shirt, dress shirt, button-down, button down, button-up, OCBD | oxford | |
| linen shirt | oxford | material linen |
| denim shirt, chambray shirt | oxford | denim: material denim; chambray: usual colour Sky |
| plaid shirt, check shirt, lumberjack shirt, flannel | flannel | pattern check |
| hawaiian shirt, cuban shirt, resort shirt, bowling shirt | camp-shirt | |
| long sleeve, longsleeve, long-sleeve tee | long-sleeve | |
| roll neck, rollneck, polo neck | turtleneck | |
| jumper, sweater, pullover, crew neck | crewneck | |
| zip-up, zip up hoodie, zip hoodie | hoodie | |
| half-zip, half zip, 1/4 zip, quarter zip | quarter-zip | |
| crewneck sweatshirt, sweat | sweatshirt | |
| vest, puffer vest, down vest, bodywarmer, body warmer | gilet | |
| shacket, shirt jacket, field jacket | overshirt | |
| work jacket, chore jacket, worker jacket | chore-coat | |
| rain jacket, raincoat, rain coat, windbreaker, anorak, cagoule, waterproof, hardshell | rain-shell | |
| parka, down jacket, puffa, quilted jacket | puffer | |
| peacoat, pea coat, trench, trench coat, topcoat, mac, duffle coat | overcoat | |
| leather jacket, harrington, varsity jacket, coach jacket, flight jacket | bomber | leather jacket: material leather |
| suit jacket, sport coat, sports jacket | blazer | |
| khakis | chinos | usual colour Khaki |
| cords, corduroys | chinos | material corduroy |
| cargo pants, cargo trousers, cargos | cargos | |
| dress pants, dress trousers, suit trousers, slacks, pants | trousers | "pants" alone last |
| joggers, track pants, tracksuit bottoms, sweats | sweatpants | |
| oxfords (with no "shirt"), derbies, brogues, dress shoes, smart shoes, monk straps | loafers | material leather |
| desert boots, work boots, hiking boots, chelsea boots, chukkas | boots | hiking boots: trail instead |
| slip-ons, plimsolls, deck shoes, boat shoes, espadrilles | canvas | |
| slides, flip-flops, sliders | sandals | |

**Table 2: brands and models**

| Words | Type | Also set |
| --- | --- | --- |
| Levi's, Levis, 501, 511, 505, 514 | jeans | usual Indigo |
| Lululemon ABC, ABC pants, Bonobos | chinos | |
| Barbour, Bedale, Beaufort, Ashby | waxed-jacket | usual Olive |
| Better Sweater, Synchilla, Retro-X, Snap-T | fleece | |
| Nano Puff, Micro Puff, Down Sweater, Canada Goose, Moncler | puffer | |
| Arc'teryx, Arcteryx, Beta, Torrentshell, Gore-Tex jacket | rain-shell | |
| Dunks, Air Max, Blazers (Nike), Jordan lows | sneakers | material leather |
| Jordan 1s, Jordans, Chuck 70 high | high-tops | Jordans: material leather |
| Ultraboost, Pegasus, On Cloud, Cloudmonster, Allbirds, Brooks, Saucony, 990, 2002R, 1906 | runners | |
| Doc Martens, Docs, Dr Martens, 1460 | boots | usual Black, material leather |
| Timberlands, Timbs | boots | usual Camel |
| Blundstones, Blunnies, Red Wings, Iron Rangers, Wallabees, Clarks | boots | usual Brown |
| Uggs | boots | usual Camel, material suede |
| Sperrys, Top-Siders | canvas | usual Brown, material leather |
| Carhartt jacket, Detroit jacket | chore-coat | |
| Carhartt double knee, Dickies 874 | chinos | fit relaxed, material canvas |

**Table 3: colour words**

| Words | Swatch |
| --- | --- |
| orange, burnt orange, terracotta, brick | Rust |
| yellow, gold, ochre | Mustard |
| sand, bone, putty, greige | Stone |
| tan, caramel, tobacco, whisky | Camel |
| dark green, bottle green, hunter, emerald, teal | Forest |
| army, military green, moss | Olive |
| mint, light green, pistachio | Sage |
| royal blue, electric blue, bright blue | Cobalt |
| dark grey, slate, graphite, anthracite | Charcoal |
| light grey, silver, marl | Grey |
| salmon, rose, blush, coral | Pink |
| dark wash, raw, rinse, selvedge | Indigo |
| light wash, mid wash, stonewash, faded, bleached | Denim |
| washed black, faded black | Charcoal |
| purple, lilac, lavender, violet | none: `colorMissing` |
| multi, multicolour, various | ignore |

**Table 4: unsupported**

| Words | Reason shown |
| --- | --- |
| belt, hat, cap, beanie, scarf, gloves, tie, bow tie, watch, bag, backpack, tote, sunglasses, socks, pocket square, wallet, ring, necklace, bracelet | "OOTD doesn't plan accessories yet" |
| suit (alone), tuxedo, tux | "Add the jacket and trousers as two pieces" |
| swim trunks, swim shorts, boardshorts, swimsuit, wetsuit | "OOTD doesn't plan swimwear" |
| pyjamas, pajamas, robe, dressing gown, slippers | "OOTD doesn't plan nightwear" |
| underwear, boxers, briefs, undershirt | "OOTD doesn't plan underwear" |
| bib shorts, cycling jersey, running shorts, running tights, gym kit, football shirt, jersey (sport) | "OOTD doesn't plan sports kit" |

## Appendix C: starting an agent on this

Paste this as the whole instruction for one turn:

> You are working on the OOTD repository (github.com/cjarhodes/OOTD). Read `docs/LOOP.md` in full, then `docs/LOOP-LEDGER.md` if it exists. Do exactly one turn of the loop as section 2 describes: take the next task that is ready, complete it, verify it with `npm run check`, record it in the ledger, and open a pull request into `loop/wardrobe-entry`. Follow every rule in section 3. If you are blocked, say so in the ledger and stop. Reply with the task id, the pull request link, and the scorecard numbers.
