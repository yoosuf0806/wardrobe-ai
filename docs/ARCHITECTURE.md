# SmartStylist – Architecture & Requirements Evaluation

## 1. Decisions taken for the MVP

| Area | Decision | Why |
|---|---|---|
| Client | **Next.js 16 PWA** (App Router, Tailwind 4, mobile-first, installable) | Fastest path to a usable product; camera upload works in mobile browsers. A React Native/Expo app can reuse `src/lib/engine` and the same API later. |
| Backend | **Supabase** – Postgres + pgvector, private Storage bucket, RLS on every table, magic-link auth | As specified. |
| Vision + stylist LLM | **Claude** via `@anthropic-ai/sdk`, structured outputs (Zod schemas), server-side refusal fallback | One provider, typed JSON output, no hand-rolled parsing. |
| Body analysis | **On-device MediaPipe Pose Landmarker** + segmentation mask; tape-measure alternative | The body photo is sensitive biometric data. It never leaves the device; only ratios are stored. |
| Shopping | **Provider interface**: SerpAPI Google Shopping, plus a mock catalogue | Legal, stable, and able to earn affiliate revenue. Scraping (Puppeteer) was deliberately not built; see §3. |
| Weather | OpenWeatherMap current + 12h forecast (max precipitation probability), cached for 15 min | Rain probability is only available from the forecast endpoint. |

## 2. System overview

```
 Browser (PWA)                                  Next.js server (route handlers)                  External
 ───────────────                                ────────────────────────────────                 ────────
 /body  ── MediaPipe (WASM, on-device) ──┐
        photo discarded, ratios only     │  PATCH /api/profile ─────────────► Supabase (RLS)
 /wardrobe/new ─ downscale + strip EXIF ─┼─ POST /api/wardrobe/analyze ──► Claude vision ─► attributes (user reviews)
                                         ├─ POST /api/wardrobe ──► remove.bg? ─► Fashion-CLIP? ─► Storage + wardrobe_items
 /stylist ─ geolocation ─────────────────┼─ POST /api/recommend
                                         │     1. weather  ───────────────────────────────► OpenWeatherMap
                                         │     2. rules engine (deterministic, src/lib/engine)
                                         │     3. Claude re-rank + stylist notes (candidate IDs only)
                                         │     4. gap analysis
                                         ├─ POST /api/shop ──► ShoppingProvider ─► rank ──► style_gaps / product_suggestions
                                         └─ POST /api/outfits (log, trigger bumps wear_count) / GET /api/insights
```

### The key design choice: engine first, LLM second

The brief sent the **whole wardrobe JSON** to the LLM and asked it to pick IDs. That design has three problems: token cost grows with the wardrobe, the model can return item IDs that don't exist, and hard constraints like "never cropped tops" become suggestions the model may ignore.

SmartStylist splits the work instead:

1. **Deterministic engine** (`src/lib/engine/recommend.ts`): applies hard filters (user overrides, then weather, then the formality window), builds a top-K pool per role, enumerates `[top+bottom | one-piece] × footwear × (outerwear | none)`, and scores each ensemble:
   `0.30 formality + 0.25 colour harmony + 0.20 body rules + 0.15 weather + 0.10 freshness`.
2. **Claude** receives only the ~8 best *diverse* candidates, labelled C1…C8, and picks and explains 1–3 of them. Returned IDs are validated and anything unknown is dropped. If Claude is unavailable or refuses, the engine's picks are shown with the engine's own reasons.

This makes every recommendation grounded and every hard rule enforced, and the cost per request stays flat as the wardrobe grows.

### Override precedence (brief §3A)

`src/lib/engine/body-rules.ts`:

1. **User "Never"** (`allow_x === false`, avoid colours/patterns, sleeve whitelist) is a hard filter: the item is never considered.
2. **User "Always OK"** (`allow_x === true`) or an unticked baseline rule switches off the matching baseline rules.
3. **Baseline body-type rules** are soft score nudges only and never filter anything.

Gap specs respect the same layer: an oval profile gets `avoid_fits: ["slim"]` unless the user allowed slim fits.

### Gap analysis (brief §3D)

- **Incomplete match / formality ceiling / weather**: computed from what survived the filters for this request.
- **Wear-frequency balancing**: over the last 60 days, an occasion with 3 or more logs that rotates at most 50% distinct items in a role, with fewer than 3 suitable items owned, produces a gap.
- **Product spec**: category and subcategory come from a formality × department table. Colour is the "bridge" staple that harmonises with the most owned items you don't already have; formalwear uses convention (white shirt, black everything else). Price cap comes from the profile budget.
- **Ranking**: `0.45 budget + 0.40 style match + 0.15 rating`, scaled by gap urgency. Listings more than 15% over budget are dropped.

## 3. Evaluation of the original brief – issues found & how they were handled

| # | Issue in the brief | Resolution |
|---|---|---|
| 1 | `wardrobe_items.category` used `shoes` while the JSON contract used `footwear`; dresses/jumpsuits had no category | Unified on `footwear`; added `one_piece`. |
| 2 | `seasonality` was in the JSON contract but missing from the table | Added a `text[]` column. |
| 3 | "Never suggest cropped tops" / slim-fit overrides couldn't be evaluated: no `fit` or `length` attributes | Added `fit` and `length` columns, extracted by the vision model. |
| 4 | `outfit_logs` had no timestamp, so wear-frequency analysis was impossible | Added `worn_on` and `created_at`; `item_ids uuid[]`; a trigger keeps `wear_count` / `last_worn_at` in sync. |
| 5 | `image_url TEXT` implied public URLs for personal photos | Private bucket; per-user folder policies; signed URLs. |
| 6 | No RLS policies defined | Owner-only policies on every table and on storage objects. |
| 7 | No tables for gaps or product suggestions | Added `style_gaps` and `product_suggestions`. |
| 8 | "3D mesh (SMPL)" from a single photo needs a GPU model server, and MediaPipe Pose has no waist landmark | Silhouette widths from the pose segmentation mask; ratios use thresholds tuned for frontal widths; tape-measure fallback; the user can override the result. SMPL can be added later as a server option. |
| 9 | Puppeteer scraping: retailer ToS / bot protection, and it can't run in Supabase Edge Functions (Deno, short limits) | Replaced with a `ShoppingProvider` interface (SerpAPI now; affiliate feeds next). |
| 10 | Whole wardrobe sent to the LLM; IDs not validated | Engine-first architecture (above). |
| 11 | No department / sizing for shopping queries | Added `department`. Sizes are an open question. |
| 12 | Body photo is biometric data (GDPR Art. 9, BIPA in Illinois) | Never uploaded; only ratios stored; deleting the account cascades. |

## 4. Open questions for you

1. **Sizing**: should profiles store sizes (S/M/L, waist/inseam, EU/US shoe) so shopping queries filter by size?
2. **Affiliate programs**: which retailers or networks (Amazon Associates, Rakuten, ShopStyle Collective, Impact)? This decides the production `ShoppingProvider`.
3. **Accessories**: they are catalogued but not yet placed in outfits. Should the stylist add a bag, belt or jewellery slot?
4. **Planning**: is a calendar integration wanted (Google Calendar → upcoming occasions → proactive gap alerts, e.g. "dinner on Friday")?
5. **Laundry state**: should items be markable as "in the wash" so they're excluded for a few days?
6. **Native app timing**: when should the Expo app start? The engine is plain TypeScript and portable as-is.
7. **Monetisation and data retention**: needed before the privacy policy can be finalised.

## 5. Roadmap after MVP

- Fashion-CLIP embeddings → "you already own something similar" warnings in shopping results (`match_wardrobe_items` RPC is in place).
- Learn from `outfit_logs.feedback`: per-user weights for colour/body/freshness.
- Background jobs (Supabase cron → Edge Function) for weekly wear-frequency insights and notifications.
- Batch API for re-tagging the wardrobe when the tagging prompt improves.
