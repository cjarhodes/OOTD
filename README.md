# OOTD

**Outfit of the day, from the wardrobe you already own.** A personal wardrobe and outfit planner built by [Alex Rhodes](https://cjarhodes.com). It is designed for iPhone first and layers outfits for the weather.

Status: v2. The sample demo and your own on-device wardrobe both work. See [the roadmap](docs/ROADMAP.md) for what comes next.

## What works

- **Two wardrobes.** The **sample wardrobe** is the public demo, with illustrated pieces. **My wardrobe** holds your own photos and history, stored in IndexedDB on your device and copied automatically to a private cloud backup once you unlock as the owner. Switch between them in Settings or from the header badge.
- **Add pieces** from cut-out photos: a Shortcuts batch running Remove Background, or Lift Subject in Photos. Each photo is trimmed, resized and colour-matched on the device, then goes through a quick review step: what it is, its colour and name, with optional extra details.
- **AI tagging (owner only, capped).** In the review step, *Tag with AI* sends one small copy of the photo to Claude, which fills in the details. It only works after you unlock with your passphrase. Spend is counted against a monthly cap, and the feature fails closed if the key or the spend tracker is missing.
- **Layering engine** (`src/lib/engine`). It builds base → mid → outer stacks with hard rules:
  - Layers get thicker towards the outside.
  - Layer lengths stay in a sensible order.
  - Necklines must be compatible.
  - Only one busy pattern per outfit.
  - A warmth budget across the day, plus a strip test: whatever remains after a layer comes off must still suit the warmest part of the day.
  - Rain handling.
  - When nothing in the wardrobe is warm enough, it shows the closest look and says what to add.
- **Three looks a day:** Easy, Fresh and Bold. Looks are named after their recipe and come with notes. You can swap or pin a piece, favourite or skip a look, save a plan and log a wear.
- **Live weather.** Set a city in Settings to get a 16-day Open-Meteo forecast, split into morning, midday and evening. Without a city, the app uses a sample forecast and labels it as one.
- **Trips and capsules** (`/trips`, linked from Week). Pick a destination, dates and the kind of trip, and OOTD packs a small capsule that dresses every day in that city's weather, with a packing checklist.
  - **Re-wear limits:** a fresh base layer most days, knits and trousers re-worn, and the bulkiest jacket and shoes worn on the journey.
  - **Weather:** the live forecast where it reaches, and last year's weather on the same dates for trips further ahead. Both are labelled.
  - **Week and Today** show each trip day's look in the destination's weather.
- **Week view**, with suggestions that vary from day to day. **Nothing gets lost.** Once you unlock as the owner, every change, photos included, is copied to a private Vercel Blob store a few seconds after you make it. A new phone offers to restore from that copy. If two devices both change, OOTD asks which copy to keep, and it won't let a nearly empty device overwrite a full backup. Photos are stored under their own SHA-256 and never deleted, and a copy from before each hour's first change is kept (the last 30), so you can roll back.
- **Portable export.** Settings → Export downloads a ZIP that works without OOTD: `wardrobe.csv` (one row per piece, opens in Numbers or Excel), `wears.csv`, the photos as ordinary PNG and JPEG files, a documented `wardrobe.json`, and a README describing every field. OOTD restores from that ZIP and from older JSON backups.
- **Gallery brand:** Bodoni Moda, Hanken Grotesk and Azeret Mono. Museum-style look labels. Light and dark themes. Installable to the Home Screen.

## Run it

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev        # http://localhost:3000
npm run check      # typecheck, then tests + production build
```

`.npmrc` sets `legacy-peer-deps` to work around an npm resolver bug with Vitest's optional browser peer dependencies.

## Deploy (Vercel)

1. Import `cjarhodes/Clothing` at vercel.com/new into the `rhodescja-2073's projects` team, as the project `ootd-cjarhodes`. Vercel detects Next.js with no extra configuration.
2. Add the domain `ootd.cjarhodes.com` under Project → Domains. In Cloudflare DNS for cjarhodes.com, add a `CNAME` record from `ootd` to `cname.vercel-dns.com`, set to **DNS only** (grey cloud).
3. The sample demo works as soon as the project is deployed. To turn on owner access and AI tagging, add the variables in `.env.example` to the **Production** environment:
   - Add Upstash Redis from Vercel → Storage (Marketplace). This sets `KV_REST_API_URL` and `KV_REST_API_TOKEN`.
   - Create a separate Anthropic Console workspace for OOTD, give it a monthly spend limit (the hard backstop), and use an API key from that workspace.
4. For cloud backup, set `OOTD_OWNER_PASSPHRASE`, then in Vercel → Storage create a **Blob** store and connect it to `ootd-cjarhodes` (Production). Redeploy, unlock in Settings, and the Cloud backup section reads "Backed up".

The tagging model defaults to `claude-opus-5-5`, with server-side refusal fallback enabled. Set `OOTD_AI_MODEL=claude-haiku-5-5` for the cheapest tagging.

## Layout

```
src/app/              routes: / (Today), /wardrobe, /week, /trips, /add, /settings, /api/owner, /api/tag, /api/cloud/*
src/components/       app shell, flat-lay composer, museum label, garment illustrations
src/lib/engine/       layering rules, weather budget, scoring, naming, generation (+ tests)
src/lib/              types, palette, garment defaults, sample wardrobe, dates, export ZIP (archive.ts), sync rules (sync.ts)
src/state/            wardrobe state (sample: localStorage, personal: IndexedDB), cloud backup sync, forecast, owner session
src/server/           owner session signing, the monthly AI spending cap and the private Blob backup (server only)
legacy/v1/            the original v1 app, kept for reference only
```
