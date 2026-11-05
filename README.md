# OOTD

**Outfit of the day, from the wardrobe you already own.** A personal wardrobe and outfit planner built by [Alex Rhodes](https://cjarhodes.com). It is designed for iPhone first and layers outfits for the weather.

Status: v2 rebuild in progress. This first milestone covers the Gallery brand, the layering engine, and the Today, Wardrobe and Week screens, all on the sample wardrobe. See [the roadmap](docs/ROADMAP.md) for what comes next.

## What works

- **Layering engine** (`src/lib/engine`). It builds base → mid → outer stacks with hard rules:
  - Layers get thicker towards the outside.
  - Layer lengths stay in a sensible order.
  - Necklines must be compatible (collar out over a crew, hoods only under open layers).
  - Only one busy pattern per outfit.
  - A warmth budget across the day, plus a strip test: if a layer comes off at midday, what remains must still suit the warmest part of the day.
- **Three looks a day:** Easy (familiar), Fresh (new combinations) and Bold (more adventurous). Each comes with a name ("Collar out, client day") and plain-language notes on why it works and when to take a layer off.
- **Swap a piece**, pin a piece from the wardrobe, favourite or skip a look, save a plan for a future day, and log what you wore.
- **Week view.** Suggestions vary from day to day, and saved plans are kept.
- **Gallery brand:** Bodoni Moda, Hanken Grotesk and Azeret Mono on a white wall and stone plinth, with one cobalt accent. Each look gets a museum-style label. Light and dark themes.
- **Installable** to the Home Screen (web app manifest).

The sample wardrobe uses original illustrations and a **sample forecast**, and the UI labels both as samples. Actions in sample mode are saved in this browser only.

## Run it

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev        # http://localhost:3000
npm run check      # typecheck, then tests + production build
```

`.npmrc` sets `legacy-peer-deps` to work around an npm resolver bug with Vitest's optional browser peer dependencies.

## Deploy

The app is built for Vercel. Import the repository in Vercel; it detects Next.js with no extra configuration. The planned address is `ootd.cjarhodes.com`.

## Layout

```
src/app/              routes: / (Today), /wardrobe, /week, manifest, icon
src/components/       app shell, flat-lay composer, museum label, garment illustrations
src/lib/engine/       layering rules, weather budget, scoring, naming, generation (+ tests)
src/lib/              types, palette, garment defaults, sample wardrobe, dates
src/state/            sample-mode state (localStorage)
legacy/v1/            the original v1 app, kept for reference only
```
