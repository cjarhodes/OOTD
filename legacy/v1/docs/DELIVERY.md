# Delivery and portfolio notes

## Build–test–review loop

1. Built a functional vertical slice with original sample assets and a local-first data model.
2. Added pure recommendation, data and weather tests plus UI integration tests.
3. Reviewed performance, isolation, future-date semantics, destructive actions, weather uncertainty and data portability.
4. Corrected saved-plan adventure-level rendering and bounded candidate pools for large wardrobes.
5. Checked live Open-Meteo geocoding and a 16-day forecast response successfully.
6. Ran syntax checks and all automated tests before source publication.

## Second review pass

- Simplified batch-upload review: essential fields first, optional styling details in a disclosure.
- Unified weather checks for generation, swaps and saved-plan warnings, including cool daily lows and wind.
- Preserved the only suitable layer in large wardrobe searches; pinned pieces cannot bypass weather eligibility.
- Fixed invalid local data causing startup to hang. Original records are preserved, and explicit backup restoration can recover the application.
- Added regression coverage for those cases: 34 tests pass locally. Browser and device verification remains outstanding.

## On-device review checklist

- Open the private preview on an iPhone 17 Pro Max in Safari.
- Check Today, Wardrobe, Planner and Progress in portrait and landscape, with larger text and VoiceOver.
- Batch import camera-library images, including iPhone photos. Check orientation, compression and unsupported HEIC guidance.
- Try the sample wardrobe and a small personal wardrobe; verify isolation after switching.
- Set the city, check daily temperatures, try an out-of-range future date and offline access.
- Save a future outfit, return on the day, confirm a wear, export a backup, and restore it.
- Add to Home Screen and verify persistence across app restarts. If storage differs from the Safari tab, export/import.

## Portfolio case-study draft

**FORM — A considered wardrobe**

A personal wardrobe app designed to help an account executive move beyond the same few outfits. The challenge was to make existing clothes feel full of possibility while keeping daily decisions easy and the operating budget small.

The experience combines an editable visual wardrobe, three degrees of styling adventure, weather-aware recommendations and simple future-day planning. Outfit explanations make the styling decision understandable, and progress is measured through confirmed wears rather than saved ideas.

Key tradeoffs: a local-first installable web app instead of a native release; an explainable recommendation engine instead of metered AI; and a separate sample collection to demonstrate the product without exposing personal data.

**Status:** functional first version; personal-use validation and on-device design review remain. Do not claim wardrobe-use improvements until measured.

When preparing the public portfolio, publish the sample experience and link it from cjarhodes.com with this case study. The existing portfolio has not been edited as part of this first app build. No public exposure of personal wardrobe data is needed.
