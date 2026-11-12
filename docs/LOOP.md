# The improvement loop

One goal, worked on in small rounds. Each round measures, fixes the weakest number, and proves the fix.

## The goal

**Anyone can build a wardrobe in one sitting, and the looks OOTD makes from it are as good as the ones it makes from the sample wardrobe.**

The two halves depend on each other. A wardrobe that is quick to build but dresses badly is no use, and the style rules only matter on wardrobes people can actually build. Today the style audit (`src/lib/engine/style-audit.test.ts`) only checks the sample wardrobe, which nobody owns.

## Scorecard

Baseline measured on 11 November 2026. Targets are proposals; change them before round 1 if they're wrong.

### Building the wardrobe

| # | Measure | Now | Target |
| --- | --- | --- | --- |
| B1 | Steps before a new visitor's first swipe | Sign in first (email, then a link or code) | None: swipe first, sign in to keep it |
| B2 | Swipes to a first look | 3 | 3 (hold) |
| B3 | Swipes until all of Easy, Fresh and Bold fill on a mild weekend | 7 | 6 |
| B4 | Looks carrying a "not warm enough" warning after 8 swipes | 60 of 120 | 0 of 150 |
| B5 | Typed list: type recognised correctly (40 everyday pieces, list below) | 40 of 40 (was 24) | 36 of 40 |
| B6 | Typed list: a stated colour lost or wrong | 0 (was 3) | 0 |
| B7 | Photos: pieces saved without a correction | Not measured yet | Set after first measurement |
| B8 | Changing a saved piece's colour on a phone | 2 taps, no scrolling (was 4 taps and two screens of scrolling) | 2 taps |

B4 is the gap between "a look" and "a look you'd wear". After tee, jeans and sneakers, Today shows a tee and jeans on a 9° morning with a warning, because the first jacket is card 10 of 44.

B5 misses at the baseline, as typed: Levi's 501, Barbour jacket, breton top, Patagonia fleece, linen shirt, leather jacket, Dr Martens, brogues, peacoat, denim shirt, parka, Air Max 90, checked shirt, dress shoes. Two were read as the wrong type: polo neck (as a polo) and v-neck jumper (as a crewneck). B6: "light wash jeans" and "desert boots sand" came out white, and "Patagonia fleece, cream" split into two pieces.

### Style of the looks

The same 150-look audit (ten kinds of day, five occasions, three tiers), run on wardrobes built by swiping the deck in order and keeping the colour shown.

| Wardrobe | Looks filled | With a warning | Bold looks with an idea | Styled looks with a silhouette idea | Styled looks with an accent | Distinct looks |
| --- | --- | --- | --- | --- | --- | --- |
| First 8 cards | 120 / 150 | 60 | 60% | 0% | 0% | 13% |
| First 15 cards | 150 / 150 | 0 | 58% | 37% | 0% | 49% |
| Essentials only (23) | 150 / 150 | 0 | 92% | 6% | 0% | 61% |
| Whole deck (44) | 150 / 150 | 0 | 90% | 74% | 0% | 78% |
| Sample wardrobe (today's bar) | 150 / 150 | 0 | 98% | 71% | 47% | 83% |

No wardrobe produced a muddy look or a colour clash.

| # | Measure | Now | Target |
| --- | --- | --- | --- |
| S1 | Bold looks with an idea, at 15 cards | 58% | 85% (the sample's rule) |
| S2 | Styled looks with a silhouette idea, at 15 cards and for essentials only | 37% and 6% | 50% (the sample's rule) |
| S3 | Styled looks with an accent, whole deck | 0% | 35% (the sample's rule) |
| S4 | Distinct looks at 15 cards | 49% | 65% |

S3 is zero because every card's first colour is a neutral, so someone who swipes without tapping colours owns no colour at all. The fix may belong in the deck, not the engine.

## One round

1. **Measure.** Run the scorecard. Walk the new-account path once in a phone-sized browser and note anything that made you stop.
2. **Pick one number**, the one furthest from its target. If the last round was a B, prefer an S, and the reverse.
3. **Read the failures, not the number.** The unrecognised lines, the actual looks. Write down the cause in a sentence.
4. **Make the smallest change** that fixes the cause.
5. **Measure again.** Keep the change only if the number moved and no other number fell. `npm run check` must pass.
6. **Ratchet.** Raise that measure's test threshold to the new value, so it can't slip back.
7. **Log the round** in the table below and ship it as one pull request.

## Rules

- One number per round. A round that moves nothing is reverted and logged as such.
- Never loosen a check, shrink the typed list or drop a wardrobe to make a number pass.
- Each round, add one thing from real use to the measures: a list someone really typed, a look that was skipped, a photo that needed fixing. The 40-piece list was written for this baseline, so it needs real lists to stay honest.
- When every target has held for two rounds, raise the targets or add a harder wardrobe (shoe-heavy, tailoring-heavy, summer-only).

## Round 0

The baseline came from a one-off script. Before round 1, put the scorecard in the repository as tests with today's numbers as their thresholds: the typed list as a fixture beside `src/lib/typed.test.ts`, and the built wardrobes as extra inputs to `runAudit` in `src/lib/engine/style-audit.test.ts`.

## Log

| Round | Date | Measure | Before | After | What changed |
| --- | --- | --- | --- | --- | --- |
| Baseline | 11 Nov 2026 | All | | | First measurement |
| 1 | 11 Nov 2026 | B5, B6, B8 | 24 of 40; 3; 4 taps | 40 of 40; 0; 2 taps | Type a list reads everyday words, washes and a colour after a comma. The piece editor leads with a one-screen colour grid that saves on tap. Add actions sit under the Wardrobe title. The 40-piece list was used to find the gaps, so it now needs new lines from real use to mean anything |
| 2 | 11 Nov 2026 | Style on a real 42-piece swiped wardrobe | 8 clashing looks; 20 of 50 Easy looks with a bright; 82% bold with an idea | 0; 6 of 50; 86% | A rain shell can go over a knit on wet or windy days (it was barred for being thinner). Two non-neutral colours in a look are a last resort. On a wet day every waterproof layer stays in the search. Easy prefers a neutral look. A swiped wardrobe with colour now runs in the style audit. Still open: on cold wet days that wardrobe has one top half warm enough, so the three looks share it; and one pair of boots is in 92 of 150 looks because it has three pairs of shoes |
| 3 | 11 Nov 2026 | Style, scored by reviewers: 150 looks from a real 77-piece wardrobe, each scored 1 to 5 as a stylist would | 2.6 average | 3.3 average | Three reviewer agents scored the looks and a fourth gathered styling principles and current trends; their rules went into the engine in two rounds, re-scored after each (2.6, 3.1, 3.3). The engine now knows cloth has a season, shoes have to survive the weather, what a customer meeting needs, what goes under what, and that one colour is an accent and two compete. Scores come from AI reviewers reading descriptions, a different reviewer each round, so treat a tenth either way as noise. Still open, by their count: the three looks for a day are often one recipe three ways (shirt, crewneck, coat), "bold" is rarely bold, black with navy, and baggy on baggy |
| 4 | 12 Nov 2026 | Style, scored from the pictures: today's 15 looks drawn for the sample wardrobe and for a real 82-piece wardrobe | 3.0 and 3.1 average | 3.2 and 3.3 average | The first review of what the app draws, not what it says. The flat-lay hid a jacket behind the layers under it, so a coat over a shirt read as a boiler suit; jackets are now drawn open. A short-sleeved top alone under a coat on a 7° morning is out, each of the three looks gets its own coat where another is nearly as good, and trainers, work boots and nylon bombers stay away from dinner and pressed trousers. Still open, by the second reviewer: "bold" is rarely bold, one coat still carries half a wardrobe's looks across occasions, wind is under-weighted for blazers and bombers, and several notes are boilerplate |

## The typed list

```
navy chinos
2 white tees
grey marl sweatshirt
black levi's 501
uniqlo airism tee black
olive bomber
barbour jacket
tan chelsea boots
light wash jeans
striped breton top
beige trench coat
black north face puffer
patagonia fleece, cream
linen shirt white
navy suit trousers
dark green corduroy trousers
burgundy v neck jumper
white linen trousers
grey wool trousers
black leather jacket
tweed blazer
khaki shorts
swim shorts navy
white stan smiths
black dr martens
brown brogues
desert boots sand
navy peacoat
camel overcoat
pink oxford shirt
black polo neck
grey joggers
blue denim shirt
cream cable knit jumper
black vans old skool
green parka
nike air max 90 white
checked shirt red
charcoal suit jacket
black dress shoes
```
