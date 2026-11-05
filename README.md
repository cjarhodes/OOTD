# OOTD

**Outfit of the day, from the wardrobe you already own.** OOTD plans a layered outfit for the weather from photos of your own clothes. It is built for iPhone first, open source, and made by [Alex Rhodes](https://www.cjarhodes.com).

**Try it:** [ootd.cjarhodes.com](https://ootd.cjarhodes.com). There's no account to make. Start with the sample wardrobe, or switch to **My wardrobe** in Settings and add your own photos. Whatever you add stays in your browser.

[![Deploy your own with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fcjarhodes%2FClothing&project-name=ootd&repository-name=ootd&env=OOTD_OWNER_PASSPHRASE&envDescription=A%20long%20passphrase%20%2812%2B%20characters%29%20that%20unlocks%20cloud%20backup%20on%20your%20devices&envLink=https%3A%2F%2Fgithub.com%2Fcjarhodes%2FClothing%23run-your-own-copy&stores=%5B%7B%22type%22%3A%22blob%22%2C%22access%22%3A%22private%22%7D%5D)

## How it handles your data

- **No accounts.** There are no sign-ups, no tracking, and no analytics.
- **Your wardrobe lives on your device.** Photos, pieces, plans and wear history are kept in your browser (IndexedDB). On ootd.cjarhodes.com, nothing you add ever reaches the server.
- **Export any time.** Settings → Export downloads a ZIP that is useful without OOTD:
  - `wardrobe.csv`: one row per piece; opens in Numbers, Excel or Sheets
  - `wears.csv`: your wear log
  - your photos as ordinary PNG and JPEG files
  - `wardrobe.json`: everything, in a documented format
  - a README that describes every field

  OOTD restores from that ZIP on any device.
- **Cloud backup and AI tagging belong to whoever runs a copy.** On your own deployment, you unlock them with a passphrase only you know. There is one owner per deployment, which is why the hosted demo doesn't offer them to visitors. [Run your own copy](#run-your-own-copy) to get both.
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

The deploy button above clones this repository into your GitHub account and creates a Vercel project. It also creates a private Blob store for the cloud backup and asks for one value:

- `OOTD_OWNER_PASSPHRASE`: at least 12 characters. Use something long and random, such as four or more unrelated words; the unlock is only rate limited when Redis is configured (see AI tagging below). You type it once in Settings on each device. Changing it signs every device out, and the backup is untouched.

Once it's deployed, open Settings, unlock, and the **Cloud backup** section should read "Backed up".

- **What you get:** every change, photos included, is copied to your private store a few seconds after you make it, and a new phone offers to restore.
- **Two devices:** if both changed, OOTD asks which copy to keep.
- **Refused overwrites:** a nearly empty device can't overwrite a full backup.
- **Photos:** each is stored under its own SHA-256, so photos are never replaced or deleted.
- **Rollback:** a copy from before each hour's first change is kept (the last 30), under **Earlier versions**.

**AI tagging (optional).** This fills in a piece's details from its photo with Claude, against a monthly spending cap. Add these to the Production environment:

- `ANTHROPIC_API_KEY`: from a dedicated Anthropic Console workspace with its own spend limit, as a hard backstop.
- Upstash Redis from Vercel → Storage (Marketplace). It sets `KV_REST_API_URL` and `KV_REST_API_TOKEN`, which the spend tracker and the unlock rate limit use.
- `OOTD_AI_MONTHLY_CAP_USD`: the monthly cap, $3 by default.

The model defaults to `claude-opus-5-5`; `OOTD_AI_MODEL=claude-haiku-5-5` is the cheapest. Tagging fails closed: without the key or the tracker, the button simply isn't offered. Every variable is described in [`.env.example`](.env.example).

## Develop

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev        # http://localhost:3000
npm run check      # typecheck, then tests and a production build
```

`.npmrc` sets `legacy-peer-deps` to work around an npm resolver bug with Vitest's optional browser peer dependencies. Without a Blob store or passphrase, the app runs as the public demo does.

```
src/app/              routes: / (Today), /wardrobe, /week, /trips, /add, /settings, /api/owner, /api/tag, /api/cloud/*
src/components/       app shell, flat-lay composer, museum label, garment illustrations, cloud backup panel
src/lib/engine/       layering rules, weather budget, scoring, naming, generation, capsule packing (+ tests)
src/lib/              types, palette, garment defaults, sample wardrobe, dates, export ZIP (archive.ts), sync rules (sync.ts)
src/state/            wardrobe state (sample: localStorage, personal: IndexedDB), cloud sync, forecast, owner session
src/server/           owner session signing, the AI spending cap and the private Blob backup (server only)
docs/ROADMAP.md       research, decisions and progress
```

Issues and pull requests are welcome. Please run `npm run check` first. For security reports, see [SECURITY.md](SECURITY.md).

## Licence

[MIT](LICENSE). Fonts are from Google Fonts under the SIL Open Font License; weather data is from Open-Meteo (CC BY 4.0).
