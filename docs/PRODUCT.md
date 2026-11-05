# Product brief

## Purpose

Help C.J. Rhodes confidently wear more of his existing wardrobe, try more adventurous combinations, and feel stylish at work and outside it.

C.J. is an account executive at Salesforce. His baseline is casual to smart casual: jeans, trousers, T-shirts, shirts, sweaters, sneakers, and layers. Looking cool is a product requirement. The primary device is an iPhone 17 Pro Max. The target operating budget is $5/month.

## Core loop

Upload a batch → review garment details → choose a day and occasion → explore three outfits → swap or pin a piece → save a plan → confirm what was actually worn → improve through feedback.

The sample collection is a separate, clearly labeled exploration environment. It contains 18 original garment illustrations, not C.J.'s real clothing. Personal uploads and history must not leak into demo state.

## First-release decisions

- Responsive, installable web app rather than an App Store release.
- Local device storage and explicit backup/restore instead of account infrastructure.
- Rules-based recommendations rather than a paid AI dependency.
- Three styling directions; no shopping recommendations or social feeds.
- Simple day-based planning, with no automatic rescheduling or laundry reservations.
- Location chosen by city search. No location permission on startup.
- Date-specific live weather where available. Labeled sample weather in the demo, and provisional suggestions beyond the forecast.
- A wear is a separate user action. Scheduling never increments wear counts.
- Every recommended item must exist and be available. Hard weather filters precede ranking.

## Success measures

1. Number and percentage of distinct wardrobe items actually worn.
2. Different combinations actually worn.
3. Adventurous-option wears.
4. Qualitative feedback: did the outfit feel stylish and confident?

No fabricated engagement counts or claimed personal outcomes in the demo or portfolio.

## Next user validation

C.J. adds 20–30 real pieces including shoes and at least five overlooked items. Use FORM for two weeks. Note recommendation misses, time spent choosing, and which combinations felt good. Real feedback should drive the next recommendation improvements.

## Deferred

Visual tagging, background removal, inspiration-photo preferences, hourly weather, automatic weather-change alerts, cloud sync, outfit selfies, weekly auto-planning, virtual try-on, social styling, shopping, and cost-per-wear.
