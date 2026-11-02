# SmartStylist

An AI wardrobe and personal stylist. Photograph your clothes, get daily outfits matched to the occasion, the live weather, your body shape and **your own fit rules**, and get shopping suggestions within your budget when your wardrobe has a gap.

<p>
<img src="docs/screenshots/2-stylist.png" width="220" alt="Outfit recommendations">
<img src="docs/screenshots/3-gap.png" width="220" alt="Gap analysis with shopping options">
<img src="docs/screenshots/5-settings.png" width="220" alt="Fit overrides">
</p>

Architecture, design decisions and the evaluation of the original brief are in **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

## Features

- **Wardrobe onboarding**: photo → downscaled on-device (EXIF/GPS stripped) → Claude vision extracts category, colour hex, pattern, fabric, fit, length, formality 1–10 and seasons → you review → saved. Optional background removal (remove.bg) and Fashion-CLIP embeddings.
- **Body shape**: MediaPipe runs **in the browser** and measures shoulder, waist and hip from your silhouette. The photo never leaves the device. A tape-measure option and a manual override are available.
- **Daily stylist**: a deterministic rules engine (formality, colour harmony, body rules, weather, freshness) builds candidate outfits; Claude picks and explains the best 1–3. It works without an AI key too.
- **Override layer**: for each fit attribute, choose *Never / Stylist decides / Always OK*, plus avoid-colours, avoid-patterns, sleeve whitelist, per-rule toggles and free-text notes. Your rules always beat body-type advice.
- **Gap analysis and shopping**: missing pieces, formality ceilings, weather gaps and "you keep wearing the same shoes" insights turn into concrete product specs, ranked by budget, style match and urgency.

## Quick start

```bash
npm install
```

```bash
npm run dev
```

With no environment variables the app runs in **demo mode**: a seeded 16-piece wardrobe, an in-memory store, the rules-engine stylist, a mock shopping catalogue, and a default or manual temperature. Open http://localhost:3000.

### Full setup

1. Copy `.env.example` to `.env.local` and fill in what you have. Every integration is optional and degrades gracefully.
2. Create a Supabase project, then apply the schema:
   ```bash
   npx supabase db push
   ```
   or paste `supabase/migrations/20261102000000_init.sql` into the SQL editor.
3. In Supabase Auth, add `http://localhost:3000/auth/callback` (and your production URL) to the redirect URLs.

| Variable | Enables |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Accounts, persistence, image storage |
| `ANTHROPIC_API_KEY` | AI garment tagging and stylist notes (`STYLIST_MODEL`, `STYLIST_EFFORT` optional) |
| `OPENWEATHER_API_KEY` | Live weather from the device location |
| `SERPAPI_API_KEY` | Live Google Shopping listings |
| `REMOVE_BG_API_KEY` | Background removal when saving items |
| `FASHION_CLIP_ENDPOINT` | 512-d visual embeddings (pgvector) |

## Scripts

- `npm test`: engine test-suite (colour harmony, body classification, override precedence, recommendations, gaps, product ranking)
- `npm run lint`: TypeScript check
- `npm run build`: production build

## Project layout

```
src/lib/engine/     deterministic styling core (pure TS, portable to React Native)
src/lib/ai/         Claude: garment tagging + stylist re-ranker (structured outputs)
src/lib/body/       body-shape classifier + on-device MediaPipe measurement
src/lib/shopping/   provider interface (SerpAPI, mock) + ranking
src/lib/data/       Repository interface → Supabase or in-memory demo
src/app/            pages + API route handlers
supabase/migrations schema, RLS, storage policies, triggers, vector search
```
