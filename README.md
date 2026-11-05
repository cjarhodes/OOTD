# OOTD

**Outfit of the day, from the wardrobe you already own.** A personal wardrobe and outfit planner built by [Alex Rhodes](https://cjarhodes.com). It is designed for iPhone first and layers outfits for the weather.

Status: v2. The sample demo and your own on-device wardrobe both work. See [the roadmap](docs/ROADMAP.md) for what comes next.

## What works

- **Two wardrobes.** The **sample wardrobe** is the public demo, with illustrated pieces. **My wardrobe** holds your own photos and history, stored in IndexedDB on your device only. Switch between them in Settings or from the header badge.
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
- **Week view**, with suggestions that vary from day to day. **Backup and restore** as a JSON file that includes the photos.
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

The tagging model defaults to `claude-opus-5-5`, with server-side refusal fallback enabled. Set `OOTD_AI_MODEL=claude-haiku-5-5` for the cheapest tagging.

## Layout

```
src/app/              routes: / (Today), /wardrobe, /week, /add, /settings, /api/owner, /api/tag
src/components/       app shell, flat-lay composer, museum label, garment illustrations
src/lib/engine/       layering rules, weather budget, scoring, naming, generation (+ tests)
src/lib/              types, palette, garment defaults, sample wardrobe, dates
src/state/            wardrobe state (sample: localStorage, personal: IndexedDB), forecast, owner session
src/server/           owner session signing and the monthly AI spending cap (server only)
legacy/v1/            the original v1 app, kept for reference only
```
