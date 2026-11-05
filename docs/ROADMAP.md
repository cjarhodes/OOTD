# FORM v2 — plan

FORM v1 already works: a local-first wardrobe, three outfit directions, weather-aware rules, a planner and a wear journal. v2 is about four things:

1. **The whole wardrobe**: capturing everything, accessories included, quickly and cleanly.
2. **Layering**: outfits built as stacks (base → mid → outer), not a single "Layers" slot.
3. **Aesthetic output**: every outfit shown as an editorial flat-lay, not a grid of tiles.
4. **Its own brand**: a distinct identity for FORM, plus a public demo and a case study linked from cjarhodes.com.

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

## 8. Branding: FORM as its own brand

FORM gets its own identity and doesn't inherit the portfolio's look. The portfolio links out to it as a separate build, the way it does for `training.` and `chess.`. The three directions explored are **Gallery**, **Selvedge** and **Chalk & Cloth**. They're shown side by side, each with a palette, type, components and the same layered flat-lay, on the brand board artifact.

### Recommended: Gallery

*The wardrobe, on display.* The clothes are the exhibition: a white wall, a stone plinth, one cobalt accent, and every look captioned like a museum object.

| Token | Light | Use |
| --- | --- | --- |
| `--wall` | `#FBFBF9` | App background |
| `--plinth` | `#EBE9E4` | Flat-lay canvas |
| `--graphite` | `#1A1A19` | Text, primary buttons |
| `--label` | `#6D6B66` | Metadata, captions |
| `--cobalt` | `#2335C8` | The single accent: active states, favourites, the dot in the icon |

The dark theme uses a graphite wall with a lifted cobalt. Both themes are required.

- **Type:** **Bodoni Moda** (italic for look names, used sparingly), **Hanken Grotesk** for UI and body text, **Azeret Mono** for museum-label metadata.
- **Signature element: the museum label** under each look. It gives the look's name in italic, the pieces, then a mono line with materials, temperature range and wear count (e.g. `Cotton · Wool · Waxed cotton — 11°→17°C — Worn 3×`).
- **Components:** pill buttons, an "F" app icon in Bodoni with a cobalt dot, and hairline dividers. Cards are used only for look labels.

### Alternatives kept on file

- **Selvedge:** workwear vocabulary. Raw indigo `#1E2A44`, canvas `#E7E2D6`, brass `#A8834A` and a selvedge red `#B5392F` used only as a stripe. Type is Archivo (condensed width) and Martian Mono. Each look gets a numbered care tag. It has more character but leans rugged for dressy days.
- **Chalk & Cloth:** a tailor's cutting table, dark first. Wool `#24252A`, chalk `#ECEBE6`, chalk blue `#8FB0DA`, thread gold `#C9A45C`. Type is DM Serif Display and Figtree. Temperature is drawn as a chalk measuring line. It's precise, but dark garments can sink into the background.

### Rules for every direction

- Layering is the signature: every look shows its stack in order, with collars and hems peeking through.
- Cut-outs sit on one canvas colour with one shadow style. No gradients and no raw photo backgrounds.
- Copy is short and specific. Look names come from the recipe, and notes say what to do and when ("Take the jacket off by noon").
- Naming: keep **FORM**, or rename for layering (**Strata**, **Ply**, or **Stack**, which suits Selvedge).

## 9. Portfolio integration

- **Subdomain**: `form.cjarhodes.com`, matching `training.` and `chess.`. The public build runs **sample wardrobe mode only**; the personal wardrobe stays on-device.
- **Builds entry**: "form.cjarhodes.com — Wardrobe & outfit planner. Wear more of what you own, layered properly." Tag: `tool · personal`.
- The portfolio keeps its own style. Only the case study post and the Builds entry live there, and they link out to FORM.
- **Case study**, as a Writing post in the "Building" category using the existing post template: standfirst, then *The problem* (same five outfits), *What other apps get wrong* (layering), *How FORM layers*, *Making it look good* (flat-lay), *Keeping it cheap & private*, *What I learned*. Add three images: a hero flat-lay, a week view, and a layering diagram.
- Only claim measured outcomes. Run the two-week validation in PRODUCT.md first.

---

## 10. Phased roadmap

| Phase | Scope | Done when |
| --- | --- | --- |
| **1. Brand system** | Chosen direction's tokens, type, light + dark themes, wordmark/icon, museum-label component | Every screen uses the new tokens; no old DM Sans/Manrope styles remain |
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
5. **Brand direction**: Gallery (recommended), Selvedge or Chalk & Cloth, and keep the FORM name or rename it?
