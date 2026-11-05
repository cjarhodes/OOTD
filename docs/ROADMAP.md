# FORM v2 — plan

FORM v1 already works: a local-first wardrobe, three outfit directions, weather-aware rules, a planner and a wear journal. v2 is about four things:

1. **The whole wardrobe**: capturing everything, accessories included, quickly and cleanly.
2. **Layering**: outfits built as stacks (base → mid → outer), not a single "Layers" slot.
3. **Aesthetic output**: every outfit shown as an editorial flat-lay, not a grid of tiles.
4. **Portfolio fit**: FORM looks like it belongs on cjarhodes.com, with a public demo and a case study.

---

## 1. What other apps teach us

Most 2026 "best wardrobe app" roundups are written by the apps they rank. The table below uses those roundups, store listings and product pages as feature references only. They are not quality verdicts.

| App | Known for | Borrow | Avoid |
| --- | --- | --- | --- |
| **Stylebook** | Deep manual cataloguing, calendar, packing lists, stats | Calendar-first planning, packing lists, cost-per-wear | Setup is slow and fiddly. Tagging effort is why people quit. |
| **Whering** | Free, "Dress Me" shuffle, clean cut-outs | One-tap shuffle with locks (FORM's pin already does this) | Social/shopping clutter |
| **Acloset** | AI auto-tagging and background removal at upload | Remove friction at capture: cut-out + colour + category in one pass | Marketplace upsell |
| **Indyx** | Human stylists, closet digitisation service, resale | Resale hooks for pieces you don't wear | Paid human layer, out of budget |
| **Cladwell** | Capsules: outfits drawn only from a chosen subset | **Capsules** (Work week, Trip, Season) as a filter on the engine | Inconsistent AI picks, restrictive free tier |
| **Alta** | AI stylist, trip/event planning, home-screen widget | Trip planning; "today's look" as a glanceable card | Avatar try-on and "AI slop" feel. Reviewers push back on it. |
| **GetWardrobe / Outfitly / Outfit Studio** | Drag-and-drop outfit **canvas** on cut-outs | Flat-lay canvas as the main way outfits are shown | Premium-gating basic canvas tools |

**Takeaways**

- **Capture friction kills wardrobe apps.** The winning move is making a clean cut-out and tags from one photo.
- **Cut-outs on a canvas** are what make these apps look good. Tile grids of raw photos don't.
- **No app reviewed does layering well.** Most treat outerwear as one optional slot. That gap is FORM's opportunity.
- Explainable picks ("why it works") beat black-box AI for trust. FORM already has this, so keep it.

---

## 2. The whole wardrobe

### Capture pipeline (free, on-device first)

1. **iPhone "Lift subject"**: long-press a garment in Photos, choose Share, then save it as a transparent PNG. This is the zero-cost, best-quality option on iPhone. Document it in onboarding and accept PNGs with alpha.
2. **In-browser fallback**: an optional on-device segmentation model, lazy-loaded only when the user taps "Remove background". Check licences before choosing: `@imgly/background-removal` is AGPL, RMBG-1.4 is non-commercial, BiRefNet is MIT.
3. **Auto colour**: k-means over non-transparent pixels, mapped to the named palette, plus a secondary colour and pattern flag (solid, stripe, check, print).
4. **Closet sprint mode**: shoot 30 in a row on the same backdrop, then review in a swipe stack (category → colour → done).

### Expanded taxonomy

| Slot | Examples |
| --- | --- |
| Base (tops) | tee, polo, oxford, camp collar, henley, mock neck, turtleneck |
| Mid | crewneck knit, cardigan, quarter-zip, hoodie, sweatshirt, overshirt, gilet/vest |
| Outer | chore coat, waxed jacket, blazer, bomber, rain shell, overcoat, puffer |
| Bottoms | jeans, chinos, trousers, shorts |
| Shoes | sneakers, runners, loafers, boots |
| Accessories | cap/beanie, scarf, belt, watch, bag, sunglasses |

New item attributes: `slot`, `thickness` (1–5), `length` (cropped / waist / hip / thigh / knee), `neckline` (crew / collar / v / mock / hood / lapel), `front` (closed / button / zip / open), `material` (cotton, denim, knit, wool, suede, leather, waxed, technical), `pattern`, `purchasePrice` (optional, for cost-per-wear). Keep the existing `formality`, `warmth`, `boldness`, `waterproof` and `delicate`.

Schema version 2, with a migration: existing `Layers` items map to `mid` or `outer` by `kind`.

---

## 3. The layering system

### Recipes (archetypes the engine builds from)

| Recipe | Stack | Notes |
| --- | --- | --- |
| Open overshirt | tee → overshirt (open) | Base must contrast with overshirt |
| Collar out | oxford → crewneck knit | Collar sits over the knit; shirt hem may peek 2–4 cm |
| Three-layer weekend | tee → knit → chore coat / waxed jacket | Classic texture stack |
| High-low | hoodie → overcoat or waxed jacket | Casual under tailored; hood out |
| Smart soft | polo or mock neck → unstructured blazer | Customer-meeting default |
| Gilet | oxford or knit → gilet | Transitional weather |
| Tonal | any stack in 2–3 adjacent shades of one hue | The "adventurous" tier's favourite |

### Rules

Hard constraints run before scoring:

- **Thickness increases outward** (`base ≤ mid ≤ outer`).
- **Length order**: outer ≥ mid, except a deliberate cropped outer.
- **Neckline compatibility**: a collar can go under a crew or v, a hood under an open outer, and mock/turtleneck under lapels. Avoid crew-over-crew with no contrast and collar-over-collar.
- **Strip test**: with the outer layer removed, the outfit must still be a complete, good-scoring outfit. This makes the outer layer truly removable for the warm part of the day.
- **Visible upper layers**: at most 3 (plus one accessory).

Scoring rules:

- **Colour flow**: light-to-dark outward, or a dark "sandwich" where the outer layer and shoes share a colour.
- **Texture**: reward exactly one texture contrast (knit vs denim, suede vs cotton, waxed vs knit). Penalise three different "loud" textures.
- **Pattern**: at most one patterned piece, two only if the scales clearly differ.

### Weather → layers

- Use Open-Meteo **hourly** data (free): feels-like temperature at roughly 8am, 1pm and 6pm, plus wind and precipitation.
- Build a **warmth budget**: sum of `warmth × thickness` across the stack, compared with the coldest window. The strip test covers the warmest window.
- The styling note says when to take a layer off: *"Shed the overshirt by noon; you'll want it back after 5."*

### Engine change

Replace the single `layer` loop in `generate()` with: choose a recipe for the day's requirements → fill each slot from bounded pools → apply hard rules → score. Keep the existing diversity, underuse and feedback scoring. Every rule needs a unit test, as in v1.

---

## 4. Aesthetic presentation

- **Auto flat-lay composer**: cut-outs placed on a 4:5 canvas using 3–4 editorial templates. Layered pieces overlap in true order: the outer layer sits behind and offset, and the base collar peeks out. Use one consistent soft shadow, a paper background and a mono caption.
- **Look card**: name, date, weather glyph and "why it works", exportable as a PNG for an Instagram story or a message to a friend.
- **Rule-based look names**: e.g. *"Tonal olive, weekend"* or *"Collar out, client day"*.
- **Manual canvas** (later): drag to nudge, pinch to scale. Saved per outfit.
- Sample wardrobe illustrations are redrawn as cut-out style so the demo looks like the real thing.

---

## 5. Planning

- **Week view**: seven look cards with hourly-weather glyphs; tap to swap.
- **Occasions**: Office, Customer meeting, Weekend, Dinner, Travel, Training. Optional calendar import (.ics) maps event keywords to occasions.
- **Client no-repeat**: tag a wear with a client or venue, and FORM avoids repeating the same outfit for that tag. This is useful for an AE's customer meetings.
- **Capsules and trips**: pick dates and destination → forecast-aware capsule (e.g. 9 pieces → 12 looks) plus a packing checklist.
- **Laundry-aware**: planned items stay reserved without changing status. Show a soft warning instead.

---

## 6. Learning and sustainability

- Wear journal, love/skip feedback and overlooked pieces (already built).
- **Cost-per-wear** when a price is entered.
- **"Ready to pass on"**: items unworn for 6+ months, and never picked when suggested, get a gentle resale prompt. This ties into the existing Poshmark/Barbour resale habit from the portfolio's sustainability section.

---

## 7. Optional AI (budgeted, opt-in)

Local-first stays the default. If tagging friction remains after the capture pipeline:

- A single serverless function (Vercel, already used for the portfolio) sends one compressed cut-out to a Claude vision model and gets back category, slot, colour, material, pattern and thickness as JSON.
- Uploads happen only on an explicit tap. The function enforces a monthly spend cap, and the API key stays server-side.
- Check current per-image pricing before enabling. A full-wardrobe tag pass should be a one-off cost, well inside the $5/month target.
- Not planned: avatar try-on, generated "AI fashion" images, shopping feeds.

---

## 8. Branding: FORM as a sub-brand of cjarhodes.com

The portfolio is minimal and text-first: Geist and Geist Mono on warm paper, near-black ink, a burgundy accent, light/dark themes, and first-person, informal copy. FORM should feel like **the same person's design system wearing its weekend clothes**.

### Shared with the portfolio

| Token | Value | Use |
| --- | --- | --- |
| `--bg` | `#faf9f6` (dark `#121110`) | Paper |
| `--bg-alt` | `#f3f1ec` | Flat-lay canvas |
| `--ink` | `#15130f` (dark `#f3f0ea`) | Text |
| `--ink-3` | `#6f6a62` | Muted text |
| `--rule` | `#e7e3db` | Hairlines |
| Sans | **Geist** 400/500/600 | UI and body (replaces DM Sans + Manrope) |
| Mono | **Geist Mono** 400/500 | Eyebrows, metadata, captions, e.g. `01 — THE PHILOSOPHY` |
| Radii / easing | 6 / 10 / 16px, `cubic-bezier(0.22,1,0.36,1)` | Match the parent |

### FORM's own

| Token | Value | Use |
| --- | --- | --- |
| `--olive` | `#4c5b3f` (dark: lift to ~`#a3b18a`) | FORM's accent: buttons, active tab |
| `--burgundy` | `#7a1f2b` (portfolio accent) | Used sparingly in FORM, e.g. ♥ favourites. It visually links back to the parent. |
| Display serif | **Instrument Serif** (italic for emphasis) | Editorial headlines only: "Good clothes. *New possibilities.*" Replaces the Georgia fallback. |
| Wordmark | `FORM` in Geist 600, tracked +8%, with a small mono `®`-style mark | App icon: "F" cut-out on olive |

### Rules

- Flat-lays use cut-outs on `--bg-alt`, one shadow style, and no gradients.
- Photography: daylight, top-down, the same backdrop every time. For portfolio lifestyle shots, use the Ricoh GR IIIx/X-T5 work already planned for the photography page.
- **Dark mode** is required, because the portfolio has a theme toggle.
- **Voice**: in-app copy is short and editorial ("Your day, considered."). The case study uses the portfolio's casual first-person voice.

---

## 9. Portfolio integration

- **Subdomain**: `form.cjarhodes.com`, matching `training.` and `chess.`. The public build runs **sample wardrobe mode only**; the personal wardrobe stays on-device.
- **Builds entry**: "form.cjarhodes.com — Wardrobe & outfit planner. Wear more of what you own, layered properly." Tag: `tool · personal`.
- **Case study**, as a Writing post in the "Building" category using the existing post template: standfirst, then *The problem* (same five outfits), *What other apps get wrong* (layering), *How FORM layers*, *Making it look good* (flat-lay), *Keeping it cheap & private*, *What I learned*. Add three images: a hero flat-lay, a week view, and a layering diagram.
- Only claim measured outcomes. Run the two-week validation in PRODUCT.md first.

---

## 10. Phased roadmap

| Phase | Scope | Done when |
| --- | --- | --- |
| **1. Brand alignment** | Geist/Instrument Serif, shared tokens, dark mode, new wordmark/icon | App and portfolio look like siblings side by side |
| **2. Layering engine** | Schema v2 + migration, slots, recipes, hard rules, strip test, tests | The engine produces 2–3-layer looks that pass all rules |
| **3. Capture + flat-lay** | PNG cut-out import, auto colour, closet sprint, flat-lay composer, look card export | Real wardrobe photographed in one sitting; outfits look editorial |
| **4. Hourly weather + planning** | Hourly windows, warmth budget, shed-by notes, week view, capsules/trips, client no-repeat | A full week planned in under 5 minutes |
| **5. Portfolio launch** | `form.` subdomain (demo only), Builds entry, case study post | Live and linked |
| **6. Optional AI tagging** | Vercel function + spend cap | Only if capture friction remains after phase 3 |

## Open decisions

1. **Name**: the repo says "C.J. Rhodes" and the portfolio says "Alex Rhodes". Which goes in the case study?
2. **Background removal**: rely on iPhone Lift Subject only, or also ship an in-browser model (larger download, licence check)?
3. **AI tagging**: stay strictly zero-cost, or allow a capped opt-in?
4. **Hosting**: move from the current host to Vercel alongside the portfolio?
