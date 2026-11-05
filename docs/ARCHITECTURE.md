# Architecture decisions

## Delivery

Static HTML, CSS and native JavaScript modules, served from `dist/`. No framework runtime and no production dependencies. Dependencies are test and formatting tools only. Deployment configuration is `.openai/hosting.json`.

- `app.js`: UI, accessible native dialogs, event handlers and explicit mutations.
- `core.js`: pure outfit selection, date helpers, suggestions, statistics and backup validation.
- `storage.js`: IndexedDB persistence and client-side photo compression.
- `weather.js`: city search, daily forecast, cache and date lookup.
- `sw.js`: same-origin app-shell caching only; no external weather/API cache or image uploads.

The app intentionally does not require an AI key. Paid visual recognition can be introduced later behind a server-side budget and an explicit upload step. Never ship API secrets to the browser.

## Persistence

IndexedDB database `form-wardrobe-v1`, object store `wardrobes`, separate `demo` and `personal` keys. Each state has schema version 1, items, date-keyed plans, confirmed wear events, outfit feedback and preferences. A single transaction saves a wardrobe; UI state updates only after the transaction succeeds. Photo files are decoded locally, resized to at most 1100 pixels on the longest side, and stored as JPEG data URLs.

Backups are validated before restoration, including image URLs and garment references. The UI requires explicit replacement confirmation. A removed garment is removed from plans; old wear events retain the remaining item references. Archive a piece to retain its full history.

Local data is not a cloud backup or authentication system. No personal data is committed to the source repo.

## Outfit engine

Hard constraints: one top, bottom and shoes; available items only; pinned piece included; warm layer for cold weather; exclude rain-sensitive pieces in wet weather; use a rain-ready layer when available. For cold days below 7°C, require a warm layer. No layers above 26°C.

Rank candidates by color compatibility, occasion/formality, user style appetite, underuse, recent outfit repetition, explicit feedback, and stable daily variation. Choose distinct combinations with progressively bolder targets and a diversity penalty. Per-category pools are bounded for large wardrobes and rotate on refresh; pinned items remain eligible. This is an explainable heuristic, not professional stylist or fit validation.

Swap actions preserve the rest of the outfit and guard against obvious rain/cold mismatches. Saved plans are immutable until the user explicitly changes or replaces them. A plan may become unavailable if laundry/archiving changes; the planner flags that state.

## External services and cost

Open-Meteo geocoding and forecast APIs, directly from the browser, with request timeouts and optional session caching. No forecast is invented for dates outside the response. Current demo weather is synthetic and labeled. Review provider terms for public commercial use. Google Fonts has system-font fallbacks; original garment illustrations have no external image dependencies.

Static delivery and no AI inference keep runtime costs low. Hosting charges depend on the selected account; no billing limit is programmatically enforced.

## Verification

Unit tests check constraints, date arithmetic, references, ranking, weather lookup/cache/errors, backup validation, and bounded search. DOM integration tests run the application against fake IndexedDB and exercise planning, swaps, feedback, wears, editing, filtering, real upload review orchestration, mode isolation, preferences and escaping. Image decode/compression is stubbed in the DOM test and needs real-device verification.

No supported browser QA runtime was available in this environment. jsdom cannot verify layout, browser caching, native camera input, touch interactions, or Safari installation.
