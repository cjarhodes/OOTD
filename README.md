# OOTD

**Outfit of the day, from the wardrobe you already own.** OOTD plans a layered outfit for the weather from photos of your own clothes. It is built for iPhone first, open source, and made by [Alex Rhodes](https://www.cjarhodes.com).

**Try it:** [ootd.cjarhodes.com](https://ootd.cjarhodes.com). The sample wardrobe needs no account. To keep your own, sign in with your email (we send a link and a 6-digit code, no password) and add photos of your clothes.

[![Deploy your own with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fcjarhodes%2FOOTD&project-name=ootd&repository-name=ootd&env=RESEND_API_KEY%2COOTD_EMAIL_FROM&envDescription=A%20Resend%20API%20key%20for%20sign-in%20emails%2C%20and%20the%20sender%20address%20on%20your%20Resend-verified%20domain&envLink=https%3A%2F%2Fgithub.com%2Fcjarhodes%2FOOTD%23run-your-own-copy&stores=%5B%7B%22type%22%3A%22blob%22%2C%22access%22%3A%22private%22%7D%5D)

## How it handles your data

- **Your wardrobe belongs to your account.** Pieces, photos, plans, trips and wear history are saved to your account a few seconds after each change, and are on every device you sign in on. They're kept in private storage that only your signed-in session can read or change.
- **It works offline.** Each device keeps a copy (IndexedDB, one per account), so the app is fast and keeps working without a connection; changes are saved when it's back.
- **Two devices, both changed?** You're asked, never overwritten: **Combine both** keeps every piece, wear, plan and trip from each (`src/lib/merge.ts`), or keep just one copy; the other stays in Earlier versions.
- **Nothing is lost by accident.**
  - Photos are stored under their own SHA-256 and are never overwritten.
  - If two devices both change your wardrobe, OOTD asks which copy to keep.
  - A nearly empty device can't overwrite a full wardrobe without your say-so.
  - A copy from before each hour's first change is kept (the last 30), under **Earlier versions**.
- **Delete it any time.** Settings → Your data → Delete my account and data removes your wardrobe, every photo, the hourly copies and your sign-in from storage, and this device's copy. You confirm by typing your email. Other signed-in devices are signed out, and can't write it back.
- **Export any time.** Settings → Export downloads a ZIP that is useful without OOTD:
  - `wardrobe.csv`: one row per piece; opens in Numbers, Excel or Sheets
  - `wears.csv`: your wear log
  - your photos as ordinary image files (JPEG, PNG or WebP)
  - `wardrobe.json`: everything, in a documented format
  - a README that describes every field

  OOTD restores from that ZIP on any device.
- **No tracking or ads.** There's no analytics. Your email is used only to sign you in, and sign-in codes are stored only as keyed hashes.
- **AI tagging is optional.** It sends one small copy of a photo to Claude only when you tap **Tag with AI**, with a monthly allowance per person.
- **Weather** comes from [Open-Meteo](https://open-meteo.com), which is sent only the coordinates of the city you choose. Your location is never requested.

## What it does

- **Layering engine** (`src/lib/engine`). Builds base, mid and outer stacks with hard rules:
  - Layers get thicker towards the outside.
  - Lengths stay in a sensible order.
  - Necklines must be compatible: a camp collar goes only under open layers, a hood only under an open front.
  - Only one busy pattern per outfit.
  - A warmth budget across the day, plus a strip test: whatever is left after a layer comes off must still suit the warmest part of the day.
  - Rain handling, and a sense of season: no shells on dry days, no knits or boots in a heatwave, camp collars kept for warm weather.
  - When nothing is warm enough, it shows the closest look and says what to add.
- **Modern layering moves.** A shirt worn open over a tee, a hoodie or sweatshirt under a coat or blazer, a roll neck under tailoring, tonal dressing (cream, grey, brown, blue) and a one-colour column. Bold looks always carry one of these ideas, and muddy dark-on-dark stacks are scored down.
- **Fit and proportion.** Every piece has a cut (slim, regular, relaxed, boxy or wide). The engine favours modern silhouettes, such as a slim knit over wide trousers, a roomy top over relaxed trousers, or a cropped boxy layer over a longer one, and scores down skinny-on-skinny or a layer squeezed over a roomier one. `src/lib/engine/style-audit.test.ts` runs 150 looks across ten kinds of day and holds the engine to it.
- **Lookbook:** every look you loved or wore, as flat-lays: loved, most worn, and favourites you haven’t worn lately, each one tap from being today’s plan.
- **Three looks a day:** Easy, Fresh and Bold, each named after its recipe and labelled like a museum piece. Swap or pin a piece, favourite or skip a look, plan ahead and log what you wore.
- **Live weather:** a 16-day forecast split into morning, midday and evening.
- **Week view,** with looks that vary from day to day.
- **Trips and capsules.** Pick a destination, dates and the kind of trip. OOTD packs a small capsule that dresses every day in that city's weather:
  - Re-wear limits keep a fresh base layer most days.
  - The bulkiest jacket and shoes are worn on the journey.
  - It gives you a packing checklist.
  - Trips beyond the forecast use last year's weather on the same dates.
- **Four ways to add pieces,** under one **+ Add** button on Wardrobe, and the same four, in the same words and order, on the empty Wardrobe, the first-run card and `/add`: **Quick add**, **Type a list**, **Swipe the basics** and **Photos**. The first three need no photo; pieces are drawn until you add one.
- **Quick add** (Wardrobe → + Add, or `/wardrobe?add=quick`): the 56 starter pieces drawn and grouped by part of the wardrobe, with a search box. Typing a name the deck doesn't have ("sambas") offers to add it as that type. Tap a piece and its colours show as large swatches with the first already picked, so a white tee is three taps from Quick add. Pick several colours at once, or "Other colour" for any of the 25. Colours you already have show as "In your wardrobe" and can't be added twice. After each add it returns to the grid, so you can add several in a row.
- **Add another colour:** on the sheet of any piece without a photo, one button adds a copy in each colour you pick (the colour swapped at the start of the name, "Navy merino crewneck" to "Grey merino crewneck"); colours you already have for the same piece aren't offered.
- **Swipe the basics** (`/start`, titled "Swipe your wardrobe"): a deck of 56 menswear pieces in four rounds, the twelve basics first so a first look comes quickly, then layers and jackets, shoes and what's current. Swipe right for "I have it", left for "not mine", up for "want it", or use the three buttons or the arrow keys. A short, quick flick counts as well as a long drag, and fast tapping never drops a choice. Tap every colour you own before swiping (three tees in white, black and grey is one swipe), or "+ Other colour" for one the card doesn't list; with nothing tapped, the colour shown is the one meant. A card you already own in every colour is skipped; owning one colour never hides the card. Pieces you have go straight into the wardrobe as illustrations, so Today can dress you in a minute, and "You can get dressed now" appears as soon as there is a top, trousers and shoes.
  - **Rounds and resume:** the count reads "The basics · 4 of 12". Each choice is remembered on this device (per account), so leaving and coming back resumes the deck, and "not mine" cards stay gone until you choose "Go through the ones you skipped". At the end of a round a short panel shows what was added with "See today's look" and "Keep going".
  - **Fix on the finish screen:** the round-end panel and the finish screen show what you added as tiles. Tap one to change its colour or remove it; wishlist additions are listed with Remove. Undo is there too, and says which piece it undoes.
  - **Swipe one part:** with a part of the wardrobe chosen on Wardrobe, "Swipe more in Shoes (6)" opens the swipe with only that part's cards (`/start?slot=shoes`).
  - **Feel and access:** the card follows your finger without re-rendering the page, the next card rises as you drag, and a hint shows how once per device. Everything respects Reduce Motion, and a screen reader hears "Added white tee", "Skipped", "On your wishlist: suede loafers" or "Undone".
- **Type a list** (Wardrobe → + Add, or `/wardrobe?add=list`): paste pieces one per line or separated by commas ("White Converse high tops, brown Birkenstock Arizonas, Black Salewa Wildfires"). Each is matched to a type, colour, material, pattern and cut from its words (`src/lib/typed.ts`), including everyday garment words (khakis, parka, roll neck), brands and shoe models (Levi's 501, Barbour Bedale, Dunks, Blundstones), and denim washes.
  - **Colour lists and counts:** "white, black and grey tees" is three tees; "3 white tees", "2x black jeans" and "a couple of white tees" add that many (up to 10). With no colour typed, the piece gets the type's usual colour, tagged "guessed", and never silently white.
  - **Headings:** a pasted note with headings ("Shoes:", "Jackets") uses them to settle ambiguous lines, and "jeans and chinos" makes two pieces.
  - **Things OOTD doesn't dress with:** a belt, a suit or swim trunks say why they are skipped and don't count.
  - **Partial add:** "Add 7 pieces" adds every line that has a type and a colour. Lines that need a type or a colour stay in the box with a note, each row has a × to remove it, and "Pick a colour" is shown for colours with no swatch (purple, lilac). The type is picked from a sheet of drawings.
- **Wishlist**: wanted pieces are tracked on their own (`PersonalState.wishlist`, `src/lib/wishlist.ts`), never in the wardrobe, so looks only use clothes you can wear. Wardrobe → Wishlist lists them; "Got it" moves one into the wardrobe. Older backups that stored wanted pieces as items are moved across on load and import.
- **Best next buys**: OOTD adds each wishlist piece (and pieces from the deck you don't have) to your wardrobe in turn and runs the outfit engine across warm, mild, cold and wet days, at work and at the weekend. It suggests the pieces that go into the most looks, and especially the ones that make new looks possible, one per part of the wardrobe (`src/lib/recommend.ts`).
- **Adding pieces** from ordinary phone photos. OOTD removes the background on the device (`src/lib/cutout.ts`): it learns the floor, bed or wall from the photo's corners and edges, grows it inwards, clears background showing through gaps (matched on colour and grain, so prints stay), and refuses rather than guesses when the background is too busy or the piece fills the frame. It runs in a Web Worker, with no model to download and nothing uploaded until you save. Cut-outs are stored as WebP. You can keep the background for any photo, and remove it later from a piece's sheet. Photos already cut out (Lift Subject) are kept as they are. Colour is read from the garment alone and matched in Lab.
- **Gallery design:** Bodoni Moda, Hanken Grotesk and Azeret Mono, in light and dark themes. Installable to the Home Screen.

## Run your own copy

OOTD runs its own sign-in, so all it needs is a Vercel account and a free [Resend](https://resend.com) account for the sign-in emails.

1. In Resend, verify a domain you own and create an API key.
2. Click the deploy button above. It creates a private Blob store for accounts, wardrobes and photos, and asks for two values:
   - `RESEND_API_KEY`: the key from step 1.
   - `OOTD_EMAIL_FROM`: the sender, on your verified domain, for example `OOTD <signin@example.com>`.

Once it's deployed, open Settings and sign in with your email. The **Account** section should read "Saved to your account" after your first change.

**How sign-in works.**
- **The email:** OOTD emails a link and a 6-digit code. Both work once, within 15 minutes, and the code locks after five wrong tries.
- **The link:** it opens a confirmation page, so mail apps that scan links can't use it up.
- **The code:** it works anywhere a link can't reach: inside a Home Screen app, or when an email app opens links in its own browser.
- **The session:** a signed, HttpOnly cookie that lasts 180 days.
- **The signing key:** generated on first use and kept in the private store, unless you set `OOTD_SESSION_SECRET` yourself.

**AI tagging (optional).** This fills in a piece's details from its photo with Claude, against a monthly spending cap. Add these to the Production environment:

- `ANTHROPIC_API_KEY`: from a dedicated Anthropic Console workspace with its own spend limit, as a hard backstop.
- Upstash Redis from Vercel → Storage (Marketplace). It sets `KV_REST_API_URL` and `KV_REST_API_TOKEN`, which the spend tracker and the per-person allowance use.
- `OOTD_AI_MONTHLY_CAP_USD`: the overall monthly cap across everyone, $3 by default.
- `OOTD_AI_TAGS_PER_MONTH`: tags each person may use per month, 20 by default. Emails in `OOTD_OWNER_EMAILS` have no per-person limit.

The model defaults to `claude-opus-5-5`; `OOTD_AI_MODEL=claude-haiku-5-5` is the cheapest. Tagging fails closed: without the key or the tracker, the button simply isn't offered. Every variable is described in [`.env.example`](.env.example).

## Develop

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev        # http://localhost:3000
npm run check      # typecheck, then tests and a production build
```

`.npmrc` sets `legacy-peer-deps` to work around an npm resolver bug with Vitest's optional browser peer dependencies. In `npm run dev`, sign-in emails are printed to the terminal instead of sent. To try accounts without a Blob store, set `OOTD_FAKE_BLOB_DIR` to an empty folder: storage then goes to files there (local testing only).

```
src/app/              routes: / (Today), /wardrobe, /week, /trips, /add, /settings, /api/auth/*, /api/wardrobe, /api/photos/*, /api/tag
src/components/       app shell, flat-lay composer, museum label, garment illustrations, sign-in and account panels
src/lib/engine/       layering rules, weather budget, scoring, naming, generation, capsule packing (+ tests)
src/lib/              types, palette, garment defaults, sample wardrobe, dates, export ZIP (archive.ts), sync rules (sync.ts), account helpers
src/state/            sign-in, wardrobe state (sample: localStorage, yours: IndexedDB per account), saving to the account, forecast, AI
src/server/           sign-in, sessions, accounts, wardrobe and photo storage, email, and the AI spending cap (server only)
docs/ROADMAP.md       research, decisions and progress
```

Issues and pull requests are welcome. Please run `npm run check` first. For security reports, see [SECURITY.md](SECURITY.md).

## Licence

[MIT](LICENSE). Fonts are from Google Fonts under the SIL Open Font License; weather data is from Open-Meteo (CC BY 4.0).
