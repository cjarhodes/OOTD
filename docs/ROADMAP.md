# Wardrobe app v2 — plan

> Working name **OOTD** (outfit of the day), replacing FORM. The owner is **Alex Rhodes**. v1 was generated with Codex, and none of it has to stay.

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

### Capture pipeline (decided: Apple's on-device cut-outs only)

Apple's subject lifting is the best free option: high quality, on-device, and no model to ship. Two ways to use it:

1. **Batch, the main path**: a shared iOS Shortcut, "Cut out for wardrobe". You select many photos, it runs the Shortcuts **Remove Background** action on each, and saves transparent PNGs to a "Wardrobe" album. The app then imports that album in one go. Verify the action's name and behaviour on the current iOS version during the on-device check.
2. **One-off**: long-press the garment in Photos, choose Lift Subject, then Share and save as a PNG.

Update (November 2026): ordinary photos now work too. OOTD removes the background itself, on the device, with classical image processing rather than a downloaded model (`src/lib/cutout.ts`, tested against real garment photos on floors, carpets, boards, beds and walls). It refuses rather than guesses on busy backgrounds or close-ups, and the person can always keep the background. Apple's cut-outs still import untouched.
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

## 7. AI tagging (decided: on, with a monthly spending cap)

- A Vercel serverless function sends one compressed cut-out (around 512px) to a Claude vision model. It gets back structured JSON: category, slot, colour(s), material, pattern, thickness, neckline, length, formality and a suggested name. Every field stays editable in the review stack.
- **Two-layer cap.** (1) A hard spend limit on a dedicated workspace in the Anthropic Console. (2) The function counts spend per calendar month in Vercel's KV/Redis store and returns "Monthly AI budget reached" once it hits the cap. Suggested cap: $3 of the $5 monthly budget.
- **Signed-in only, with an allowance.** The public sample wardrobe never calls the function. Each account gets a monthly allowance of AI tags (`OOTD_AI_TAGS_PER_MONTH`), inside the overall monthly cap. The API key stays server-side.
- Images are sent only during an explicit "Tag with AI" action and are not stored server-side.
- Check current per-image pricing when building, then show an estimated cost in the UI before a batch runs.
- Later, within the same cap: "Style this" on demand, where the model ranks the engine's top candidates and writes the "why it works" note. The rules engine still enforces the hard constraints.
- Not planned: avatar try-on, generated "AI fashion" images, shopping feeds.

---

## 8. Branding: its own brand

The app gets its own identity and doesn't inherit the portfolio's look. The portfolio links out to it as a separate build, the way it does for `training.` and `chess.`. The three directions explored are **Gallery**, **Selvedge** and **Chalk & Cloth**. They're shown side by side, each with a palette, type, components and the same layered flat-lay, on the brand board artifact.

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

- **Hosting (decided: Vercel)**: deploy on Vercel at a subdomain named after the app (e.g. `<name>.cjarhodes.com`), matching `training.` and `chess.`. The public build runs **sample wardrobe mode only**; the personal wardrobe stays on-device.
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

## Decisions

| Topic | Decision |
| --- | --- |
| Owner and case-study name | Alex Rhodes |
| Background removal | On the device in OOTD for ordinary photos (no model, no upload); Apple's Lift Subject cut-outs kept as they are |
| AI | Yes, behind a monthly spending cap and owner-only access |
| Hosting | Vercel |
| Brand | Gallery, independent of the portfolio |
| Name | OOTD (working), planned at `ootd.cjarhodes.com` |
| Codebase | Rebuild fresh: Next.js + TypeScript on Vercel, local-first storage, installable to the Home Screen. Useful v1 rules and tests get ported. v1 was removed from the tree when the repository went public; it remains in git history. |

## Progress

| Milestone | Status |
| --- | --- |
| Gallery brand system, light and dark | Done |
| Layering engine: slots, hard rules, warmth budget, strip test, recipes, naming, notes | Done |
| Today, Wardrobe and Week screens on the sample wardrobe | Done |
| Personal wardrobe: IndexedDB photo storage, cut-out import, review step, edit, wash and archive states, backup and restore | Done |
| Live 16-day forecast (Open-Meteo) with a city setting | Done |
| Trips and capsules: destination weather (forecast, else last year's), capsule packing with re-wear limits, packing checklist, per-day looks, shown in Week and Today | Done |
| Durability: automatic private cloud backup (Vercel Blob, photos content-addressed, conflict and shrink guards, hourly history), restore on a new device, portable ZIP export (CSV, JSON, photos) and import | Superseded by accounts (the ZIP export stays) |
| AI tagging: Claude structured output, monthly cap and per-person allowance in Redis, fails closed | Done (needs keys on Vercel) |
| Vercel project `ootd-cjarhodes` at `ootd.cjarhodes.com` | Waiting on the import in Vercel and a DNS record in Cloudflare |
| On-device check on iPhone: Safari, Add to Home Screen, Shortcut batch import | Next |
| Accounts: Supabase magic-link sign-in, wardrobe and photos saved per account with row-level security, version-checked saves with shrink guard, 30-slot history, per-device copy for offline use, per-person AI allowance. Replaces the owner passphrase and Vercel Blob backup | Superseded by OOTD's own sign-in |
| Own sign-in: emailed link plus 6-digit code through Resend, signed session cookie, accounts and wardrobes in a private Vercel Blob store. No Supabase, nothing shared with other apps | Done (needs a Resend key) |
| Style, round 1: open-shirt, high-low, roll-neck and column looks; tonal cream; season sense; bold must be creative and varied; muddy penalty; tiers never share a top half; style audit with checks; modern sample pieces | Done |
| Style, round 2: fit (slim, regular, relaxed, boxy, wide) on every piece, with kind defaults, an edit field and AI tagging; proportion scoring (A-line, easy line, cropped over long; no layer squeezed over a roomier one, no skinny on skinny); a hood under a bomber is no longer high-low; art drawn to the cut; audit checks on proportion and trouser spread | Done |
| Swipe your wardrobe and best next buys: a menswear starter deck (essentials and what's current) swiped right/left/up into the wardrobe or a wishlist, as illustrations with real photos addable later; next buys measured by running the outfit engine with each candidate added, one per category; wishlist in Wardrobe; first run leads with swiping | Done |
| Swiping by colour and a tracking-only wishlist: tap every colour you own on a card (one swipe adds three tees), "+ Other colour" for the rest; wanted pieces live on their own list, never in the wardrobe or its looks, with Got it to move one across; old wanted items migrate on load and import. Sync no longer asks for a decision when a save landed but the page closed before its reply (the cloud copy matches, so this device adopts it). Swipe buttons stay above the tab bar on shorter phones | Done |
| Easy, Fresh and Bold always respond: a small wardrobe fills every tier it can (each a different look, two pieces apart where possible, else one); on a day nothing suits, every fallback tier keeps the warmest top half; Today opens on a tier that has a look; a tier with none explains why when tapped instead of doing nothing | Done |
| Colour picking on a phone: other colours open in a grouped, full-height sheet with large targets (whites, greys and black, browns, blues, greens, reds) instead of a cramped scroll box inside the swipe card, whose drag blocked touch scrolling; only the picture and text start a swipe; swipe buttons stay pinned above the tab bar; the piece editor uses the same sheet, and a name that starts with the old colour follows the new one | Done |
| Casual weekend pieces: long-sleeve tee, flannel shirt (also worn open over a tee), rugby shirt, zip fleece, denim jacket (cropped, goes over a hoodie), cargo trousers, sweatpants and canvas sneakers, each with its own drawing, AI tagging hints and a starter card (deck now 40). Sweatpants are weekend and travel only, go with trainers, never boots or loafers, and stay an occasional pick; canvas sneakers finish relaxed weekend looks like runners | Done |
| Specific shoes and Type a list: high-tops, trail shoes, sandals (warm, dry weekends only, never under layers or with tailoring) and suede clogs (never in rain), each drawn; starter cards for each (deck now 44). Wardrobe → Type a list turns pasted names into pieces, recognising everyday garment words and common shoe models, with a type and colour to correct per line | Done |
| Sync that recovers: Combine both on a conflict (every piece, wear, plan, note, trip and wish from both copies, this device winning ties, the account's photos brought down first; the save names the merged version so a third device's change is still caught); every request times out (20 s, photos 60 s) so Safari can't leave a save stuck; a busy save never drops a choice made meanwhile; Keep this device's stays forced through retries until it lands | Done |
| Saves once a wardrobe passes about 1 KB: Blob downloads over that come through a compressing CDN whose weakened ETag (W/"…") never matched a conditional write, so after the first small saves every save (Keep this device's and Combine both included) was refused as a conflict. Versions now come from the Blob API, checked either side of the download; comparisons ignore weak prefixes and quotes; a forced save always lands. Tested against a strict mock of Blob that weakens large downloads | Done |
| Delete my data: Settings → Your data deletes the account (wardrobe, photos, history, sign-in and any pending sign-in) from storage and this device, confirmed by typing the email; writes from a deleted account's old cookie are refused and other devices are signed out | Done |
| Lookbook (`/lookbook`, from Wardrobe): every loved or worn look as a flat-lay, in three views (Loved, Most worn, Not lately: favourites gone quiet for two weeks), with Wear it today to make one today's plan | Done |
| Accessibility and performance: accessibility 100 on every page (tile caption contrast, accessible names that match visible text, decorative tile images); outfit generation about 3× faster (top-half checks hoisted, history worked out once per candidate, a 1,500 shortlist that changes none of the audit's 150 looks) and run in a Web Worker for Today and Week; background removal loaded only on Add; Today's frame rendered on the server; scrollbar room reserved so pages don't jump. Lighthouse desktop 100 on every page; mobile 89–96 | Done |
| Mobile Lighthouse to 95+ on every page: main content still paints at about 3.3 s on simulated slow 4G because it renders after the app's JavaScript. Server-render the sample wardrobe's look (or ship less JavaScript on first load) | Next |
| First run for new accounts: a checklist on Today and Week (a top, trousers, shoes, then a warm layer and your city) that ticks itself off and counts down to a first look; a next step after signing in; one empty state on Week instead of seven empty days; copy updated for on-device background removal | Done |
| Style, round 3: one deliberate accent colour in fresh and bold looks; shoes that finish the look (tone with the trousers or outer, white trainers to lift a dark look, loafers with tailoring, boots for weather and weight, runners for easy casual days) with a line in Why it works; audit checks for accents, colour clashes and shoe spread; a/an and wording fixes in the notes | Done |
| Adding photos, reworked after adding real photos end to end: background removed on the device in a worker, colour from the garment in Lab (a Red swatch added), first photo ready in about 0.3 s while the rest prepare, cut-outs saved as WebP, keep-the-background toggle, Remove background on saved pieces, photos with a background framed as prints in looks, and the review scrolls each new piece into view | Done |
| Open source: MIT licence, public README with a one-click Vercel deploy (private Blob store included), visitor-facing copy for the no-accounts model | Done |
| Portfolio Builds entry and case study | After two weeks of real use |
| Type a list never blocks: every line with a type and a colour is added ("Add 7 pieces") and the lines that need a type or colour stay in the box with a note; things OOTD doesn't dress with (a belt, a suit) say why and are skipped; "Pick a colour" for purple and the like; an × on each row; a hand-picked type re-guesses the colour; corrections follow their own line | Done |
| Type a list from anywhere, and it reads notes: pasted headings ("Shoes:", "Jackets") settle ambiguous lines, "jeans and chinos" makes two pieces, "a couple of white tees" two tees; a bare fleece, a rain mac and sweat shorts are read right; reachable from the first-run card and the banner on Add as well as Wardrobe (`/wardrobe?add=list`); the type is picked from a sheet of drawings instead of a native menu | Done |
| Quick add: Wardrobe → Quick add (or `/wardrobe?add=quick`) shows the 44 starter pieces drawn and grouped by layer, with a search box (typing "sambas" offers to add it as sneakers); tap one, its first colour is already picked, tap Add: three taps for a white tee. Pick several colours at once, "Other colour" for the rest; colours you already have show as in your wardrobe; it returns to the grid so several can be added in a row | Done |
| One add button: Wardrobe has a single "+ Add" chip opening a sheet with four ways in, each with one line of explanation: Quick add, Type a list, Swipe the basics, Photos. The empty state, the first-run card and the banner on Add offer the same four, in the same words and order | Done |
| Another colour of a piece: a drawn piece's sheet has "Add another colour", which opens the colour sheet and adds a copy of the piece in each colour picked (the colour swapped at the start of its name); colours you already have for the same piece aren't offered again | Done |
| Swipe no longer hides cards you only half own: a card is skipped only when you have its starter piece in every colour it lists. Colours you already have show ticked as "In your wardrobe" and aren't added twice, and "I have it" reads "Next" when there is nothing new to add. A typed or photographed piece never hides a card | Done |
| Swipe remembers where you were: each choice is kept on this device (per account), so leaving and coming back resumes the deck and "not mine" cards stay gone; the count reads "21 of 44"; the finish screen offers "Go through the ones you skipped (12)". Undo takes a remembered choice back too | Done |
| Undo on the finish screen: the last swipe can be taken back from the "pieces in, ready to dress" screen, and the Undo button says which piece it undoes to a screen reader | Done |
| Swipe keeps up with fast tapping: a choice applies the moment you tap or press an arrow, the next card is there at once, and the card you just answered finishes flying away on top. Nothing is dropped, and with reduced motion the old card simply goes | Done |
| A flick counts on the swipe: a short, quick movement sideways or up now decides the card (over 0.5 px/ms with at least 24 px travelled), a slow drag still needs about 90 px (a quarter of the card's width on a narrow one), and a fast pull back towards the middle cancels. The speed and the 80 ms window are pure functions in `src/lib/swipe.ts` with tests | Done |
| Dragging a card is smooth: while you drag, nothing in the page re-renders (the card is moved with CSS variables set once a frame), the stamp fades in with the distance, and the drawings aren't redrawn when you tick a colour | Done |
| The card behind rises to meet you: it grows and brightens as you drag the top card towards the line, a card let go short springs back in 180 ms with a small bounce, and a decided card leaves in 160 ms; all of it off with reduced motion | Done |
| The swipe teaches itself once: on a new device the first card leans right then left with the stamps showing, 600 ms after the page opens, and never again (with reduced motion a line of text says it instead); whether it has played is kept beside the deck choices on the device | Done |
| The swipe fits a small phone: at 375 x 667 the card (drawing, name, note, colours), the counts line and the three buttons all show with no overlap and no scrolling; the drawing shrinks first, notes stop at two lines, a card shows four colours and folds the rest into "+ Other colour", the buttons come last on the page, and the swipe card's colour chips are 44 px tall | Done |
| The swipe goes in rounds: 12 essential cards first ("The basics · 4 of 12"), then layers and jackets, shoes and what's current. At the end of a round a short panel shows what was added with "See today's look" and "Keep going"; as soon as there is a top, trousers and shoes the counts line says "You can get dressed now". Coming back resumes in the first round with cards left | Done |
| The swipe's finish screen and round-end panel show what you just added as tiles you can fix: tap one to change its colour (the piece is swapped for the same card in the new colour) or remove it, and wishlist additions are listed with Remove. Undo stays correct afterwards | Done |
| Swipe one part of the wardrobe: with a layer chosen on Wardrobe, "Swipe more shoes (6)" opens the swipe with only that layer's cards left (`/start?slot=shoes`), counted within the layer | Done |
| Twelve more starter cards for common pieces the deck lacked (dress shirt, merino V-neck, slim black jeans, linen shirt and trousers, corduroy trousers, suede bomber, denim overshirt, chunky jumper, jersey polo, leather dress shoes, tailored trousers): the deck is now 56, each card in a round, and Quick add shows them too | Done |
