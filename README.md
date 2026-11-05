# OOTD

**Outfit of the day, from the wardrobe you already own.** OOTD plans a layered outfit for the weather from photos of your own clothes. It is built for iPhone first, open source, and made by [Alex Rhodes](https://www.cjarhodes.com).

**Try it:** [ootd.cjarhodes.com](https://ootd.cjarhodes.com). The sample wardrobe needs no account. To keep your own, sign in with your email (we send a link, no password) and add photos of your clothes.

[![Deploy your own with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fcjarhodes%2FClothing&project-name=ootd&repository-name=ootd&env=NEXT_PUBLIC_SUPABASE_URL%2CNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY&envDescription=Your%20Supabase%20project%20URL%20and%20publishable%20key%2C%20after%20applying%20supabase%2Fmigrations&envLink=https%3A%2F%2Fgithub.com%2Fcjarhodes%2FClothing%23run-your-own-copy)

## How it handles your data

- **Your wardrobe belongs to your account.** Pieces, photos, plans, trips and wear history are saved to your account a few seconds after each change, and are on every device you sign in on. Row-level security means only you can read or change them.
- **It works offline.** Each device keeps a copy (IndexedDB, one per account), so the app is fast and keeps working without a connection; changes are saved when it's back.
- **Nothing is lost by accident.**
  - Photos are stored under their own SHA-256 and are never overwritten.
  - If two devices both change your wardrobe, OOTD asks which copy to keep.
  - A nearly empty device can't overwrite a full wardrobe without your say-so.
  - A copy from before each hour's first change is kept (the last 30), under **Earlier versions**.
- **Export any time.** Settings → Export downloads a ZIP that is useful without OOTD:
  - `wardrobe.csv`: one row per piece; opens in Numbers, Excel or Sheets
  - `wears.csv`: your wear log
  - your photos as ordinary PNG and JPEG files
  - `wardrobe.json`: everything, in a documented format
  - a README that describes every field

  OOTD restores from that ZIP on any device.
- **No tracking or ads.** There's no analytics. Your email is used only to sign you in.
- **AI tagging is optional.** It sends one small copy of a photo to Claude only when you tap **Tag with AI**, with a monthly allowance per person.
- **Weather** comes from [Open-Meteo](https://open-meteo.com), which is sent only the coordinates of the city you choose. Your location is never requested.

## What it does

- **Layering engine** (`src/lib/engine`). Builds base, mid and outer stacks with hard rules:
  - Layers get thicker towards the outside.
  - Lengths stay in a sensible order.
  - Necklines must be compatible: a camp collar goes only under open layers, a hood only under an open front.
  - Only one busy pattern per outfit.
  - A warmth budget across the day, plus a strip test: whatever is left after a layer comes off must still suit the warmest part of the day.
  - Rain handling.
  - When nothing is warm enough, it shows the closest look and says what to add.
- **Three looks a day:** Easy, Fresh and Bold, each named after its recipe and labelled like a museum piece. Swap or pin a piece, favourite or skip a look, plan ahead and log what you wore.
- **Live weather:** a 16-day forecast split into morning, midday and evening.
- **Week view,** with looks that vary from day to day.
- **Trips and capsules.** Pick a destination, dates and the kind of trip. OOTD packs a small capsule that dresses every day in that city's weather:
  - Re-wear limits keep a fresh base layer most days.
  - The bulkiest jacket and shoes are worn on the journey.
  - It gives you a packing checklist.
  - Trips beyond the forecast use last year's weather on the same dates.
- **Adding pieces** from cut-out photos (Lift Subject in Photos, or a Shortcuts batch). Each photo is trimmed, resized and colour-matched on the device, then goes through a quick review step.
- **Gallery design:** Bodoni Moda, Hanken Grotesk and Azeret Mono, in light and dark themes. Installable to the Home Screen.

## Run your own copy

You need a [Supabase](https://supabase.com) project (the free plan is enough) and a Vercel account.

1. In Supabase, run [`supabase/migrations/20261105222014_ootd_accounts.sql`](supabase/migrations/20261105222014_ootd_accounts.sql) in the SQL editor, or link the project and run `supabase db push`. It creates the wardrobe and history tables, the save function and a private `ootd-photos` bucket. Everything is prefixed `ootd_`, so it can share a project with other apps.
2. Under **Authentication → URL Configuration**, set the Site URL to your domain and add `https://<your domain>/**` to the Redirect URLs.
3. Under **Authentication → Emails → SMTP**, add your own email sender (Resend, Postmark and others work). Supabase's built-in sender is only for testing: it sends a handful of emails an hour.
4. Click the deploy button above and paste in the project URL and publishable key (**Project Settings → API**).

Once it's deployed, open Settings and sign in. The **Account** section should read "Saved to your account" after your first change.

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

`.npmrc` sets `legacy-peer-deps` to work around an npm resolver bug with Vitest's optional browser peer dependencies. Without the Supabase values in `.env.local`, the app runs with the sample wardrobe only.

```
src/app/              routes: / (Today), /wardrobe, /week, /trips, /add, /settings, /api/tag
src/components/       app shell, flat-lay composer, museum label, garment illustrations, sign-in and account panels
src/lib/engine/       layering rules, weather budget, scoring, naming, generation, capsule packing (+ tests)
src/lib/              types, palette, garment defaults, sample wardrobe, dates, export ZIP (archive.ts), sync rules (sync.ts), account helpers
src/state/            sign-in, wardrobe state (sample: localStorage, yours: IndexedDB per account), saving to the account, forecast, AI
src/server/           checking the caller's sign-in, and the AI spending cap (server only)
supabase/migrations/  the database schema: tables, the save function, the photo bucket and its policies
docs/ROADMAP.md       research, decisions and progress
```

Issues and pull requests are welcome. Please run `npm run check` first. For security reports, see [SECURITY.md](SECURITY.md).

Accounts on ootd.cjarhodes.com live in a Supabase project shared with the [chess app](https://chess.cjarhodes.com); OOTD's tables and bucket are prefixed `ootd_` and its migration is mirrored in that project's repository so both stay in step.

## Licence

[MIT](LICENSE). Fonts are from Google Fonts under the SIL Open Font License; weather data is from Open-Meteo (CC BY 4.0).
