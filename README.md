# FORM

**A considered wardrobe.** An iPhone-first personal wardrobe and outfit planner, built for C.J. Rhodes and designed to be featured on [cjarhodes.com](https://cjarhodes.com).

FORM helps you wear more of what you own, find more adventurous combinations, and get dressed with less guesswork. The visual direction is editorial: ivory, charcoal, muted olive, original garment illustrations, and generous space.

## What works today

- Separate sample and personal wardrobes, stored locally in IndexedDB.
- Batch photo imports (30 at a time), automatic filename suggestions, and editable category, color, fit, warmth, formality, style character, and rain suitability.
- Three outfit directions: comfort zone, fresh combination, adventurous.
- Occasion-aware combinations using only available wardrobe pieces; pin an item or swap a piece.
- City search and a 16-day weather forecast from Open-Meteo. Sample weather is explicitly labeled; missing forecasts remain provisional.
- Date selection, a weekly planner, saved future outfits, and explicit replacement of existing plans.
- Confirmed wear journal, outfit favorites, negative feedback, overlooked-piece discovery, and progress based on actual wears.
- Laundry and archive states; JSON backup and restore with validation.
- Home Screen manifest, app icons, mobile bottom navigation, and offline app-shell caching.

## Run and verify

Requires Node.js 22 or newer. No production dependencies or compilation step.

```sh
npm ci
npm run build
python -m http.server 8000 --directory dist
```

Open `http://localhost:8000`. Static hosts can serve `dist/` directly. HTTPS is required for service workers and the full installable experience outside localhost.

`npm run build` checks JavaScript syntax and runs unit and DOM integration tests. Tests use jsdom and fake-indexeddb; they do not replace real Safari testing. Original SVG samples can be regenerated using `python make-assets.py` (Pillow or CairoSVG is needed for PNG icons).

## On iPhone

Open the deployed app in Safari → Share → Add to Home Screen. Choose **Use my wardrobe**, add photos, review the suggested details, then set your city in Preferences. Add at least a top, bottom, and pair of shoes to generate an outfit. An available warm layer is needed for cold weather.

## Privacy, cost, and portability

Clothing photos, plans, feedback, and wear history stay in your browser. There is no cloud account, server-side photo storage, or device sync. Clearing browser data removes the wardrobe; export backups regularly. A Home Screen installation can have a separate storage context from an ordinary browser tab, so export/import when moving between them.

Only city searches and coordinates are sent to Open-Meteo. Fonts currently load from Google Fonts with system fallbacks. Personal images are never sent to either service. Weather is cached for 30 minutes per city in session storage. Open-Meteo's free endpoint is intended for non-commercial use; review its license and terms before commercializing.

There are no metered AI calls or paid runtime services in this version. Static hosting can fit the $5/month target, depending on the hosting account's terms. This is an architecture target, not a billing cap enforced by the app. No paid subscription was provisioned.

## Current boundaries

- Tagging uses filenames, not visual AI. Photos need manual corrections; automatic background removal is not implemented.
- Outfit ranking is a transparent rules-based starting point. Fit is recorded for your reference; precise proportion assessment and learning from reference looks are future work.
- Weather uses daily highs/lows, precipitation probability, and wind. It does not model hourly commuting conditions or extreme-weather safety.
- Forecast changes do not silently alter saved outfits. Open a saved plan and use Fresh ideas to reconsider it.
- This version ships as an owner-private preview. Making a public portfolio demo and adding the case study to cjarhodes.com are separate delivery steps; the portfolio site has not been changed.
- Device camera/HEIC decoding, Safari storage behavior, layout, and offline installation require on-device verification. This environment did not provide the supported browser-QA runtime.

See [the product brief](docs/PRODUCT.md), [architecture decisions](docs/ARCHITECTURE.md), and [delivery notes](docs/DELIVERY.md).
