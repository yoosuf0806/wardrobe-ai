# SmartStylist – Architecture & Requirements Evaluation

## 1. Decisions taken for the MVP

| Area | Decision | Why |
|---|---|---|
| Client | **Next.js 16 PWA** (App Router, Tailwind 4, mobile-first, installable) | Fastest path to a usable product; camera upload works in mobile browsers. A React Native/Expo app can reuse `src/lib/engine` and the same API later. |
| Backend | **Supabase** – Postgres + pgvector, private Storage bucket, RLS on every table, magic-link auth | As specified. |
| Vision + stylist LLM | **Claude** via `@anthropic-ai/sdk`, structured outputs (Zod schemas), server-side refusal fallback | One provider, typed JSON output, no hand-rolled parsing. |
| Body analysis | **Measurements only** (bust/chest, waist, hip) → shape classification; the user can override it | Decided in v3: sizes and measurements give the same information without photo processing. Less complexity, and no biometric data. |
| Shopping | **Amazon**: SerpAPI's Amazon engine for listings, with links rewritten to `/dp/{ASIN}?tag=…`; a "See more on Amazon" search link that needs no API key; a mock catalogue for the demo | Your choice of retailer. Legal and stable. Swappable for Amazon's own product API (PA-API / Creators API) once the Associates account qualifies. Scraping (Puppeteer) was deliberately not built; see §3. |
| Core flow | Login → occasion → **swipe deck** (3 per round) → laundry prompt → next round | Defined by you (v2). |
| Platform plan | Web app first, then mobile | The engine is plain TypeScript and portable to Expo/React Native unchanged. |
| Weather | OpenWeatherMap current + 12h forecast (max precipitation probability), cached for 15 min | Rain probability is only available from the forecast endpoint. |

## 2. System overview

```
 Browser (PWA)                                  Next.js server (route handlers)                  External
 ───────────────                                ────────────────────────────────                 ────────
 /profile ─ measurements → shape ─────────┐
                                         │  PATCH /api/profile ─────────────► Supabase (RLS)
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
| 8 | "3D mesh (SMPL)" from a single photo needs a GPU model server, and MediaPipe Pose has no waist landmark | v1 used on-device MediaPipe silhouette widths. In v3 it was replaced by typed measurements plus a manual shape choice, at your request. |
| 9 | Puppeteer scraping: retailer ToS / bot protection, and it can't run in Supabase Edge Functions (Deno, short limits) | Replaced with a `ShoppingProvider` interface (SerpAPI now; affiliate feeds next). |
| 10 | Whole wardrobe sent to the LLM; IDs not validated | Engine-first architecture (above). |
| 11 | No department / sizing for shopping queries | Added `department`. Sizes are an open question. |
| 12 | Body photo is biometric data (GDPR Art. 9, BIPA in Illinois) | Never uploaded; only ratios stored; deleting the account cascades. |

## 4. Swipe-deck flow (v2, UI refreshed in v3)

```
pick occasion ──► POST /api/recommend (round 1) ──► 3 cards
   swipe right ─► POST /api/swipes {accept} + POST /api/outfits (log, wear_count++) ─► rate 1–5
   swipe left  ─► POST /api/swipes {reject}; remember the card's clothing items
   3 × left    ─► popup: the distinct pieces from those 3 outfits (photos)
                    ├─ "Mark N as in laundry & show more" ─► POST /api/laundry ─► round N+1
                    └─ "Skip – show me more outfits"      ─────────────────────► round N+1
round N+1: POST /api/recommend { avoid_item_ids: all rejected pieces,
                                 exclude_item_ids: marked unavailable,
                                 exclude_outfit_ids: all shown }
   no outfits left ─► "that's every combination" + gap analysis (Amazon suggestions)
```

- **Avoidance is per category.** Rejected pieces are excluded wherever that category still has alternatives. A required category that would otherwise be empty (e.g. footwear when you own two office-appropriate pairs) re-admits them with a score penalty, and the UI says "Reusing your shoes".
- **Laundry** is `wardrobe_items.in_laundry_since`. Items are excluded until marked clean, or automatically after 2 days (`LAUNDRY_DAYS`).
- **Rejected outfits** (from `outfit_swipes`) aren't suggested again for 2 days (`REJECT_COOLDOWN_DAYS`), across sessions.
- **Every swipe is stored** in `outfit_swipes`. It's not used yet; it's the training data for learning personal taste (see roadmap).
- **Accessories** are picked per ensemble *after* the clothes, so they never multiply the search space. One is added only if it doesn't lower colour harmony, and accessories don't count toward outfit diversity.

## 5. Mobile app (next phase)

- An Expo (React Native) app reusing `src/lib/engine`, `src/lib/types.ts` and the same API routes.
- **Needed first:** the API currently authenticates via Supabase session cookies (web). The native app will send the Supabase access token as `Authorization: Bearer …`. A small change in `getRepository()`: build the Supabase client from the bearer token when present.
- The swipe card would use `react-native-gesture-handler` + `reanimated`, and the camera would use `expo-camera`. No body-scan port is needed, since measurements are typed in.

## 6. Open questions for you

Answered in v2: sizes ✔, Amazon ✔, accessories ✔, occasion-first flow (no calendar) ✔, swipe + laundry ✔, web first then mobile ✔.

Answered in v3: affiliate revenue via Amazon Associates ✔, amazon.com for testing ✔, laundry returns after 2 days ✔, deal until combinations run out ✔, no body photos (measurements instead) ✔, UI per supplied designs ✔.

Still open:
1. **Data retention**: how long to keep outfit logs and swipes; account deletion already cascades.
2. **Production Amazon data**: SerpAPI (paid per search) now, or apply for Amazon's own product API once the Associates account has qualifying sales.

## 7. Roadmap

- Fashion-CLIP embeddings → "you already own something similar" warnings in shopping results (`match_wardrobe_items` RPC is in place).
- Learn from `outfit_swipes` and `outfit_logs.feedback`: per-user weights for colour/body/freshness, and "never pair these two" memory.
- Background jobs (Supabase cron → Edge Function) for weekly wear-frequency insights and notifications.
- Batch API for re-tagging the wardrobe when the tagging prompt improves.
