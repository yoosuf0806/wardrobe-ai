import "server-only";
import { claudeEnabled, describeClaudeError } from "../ai/claude";
import { styleWithClaude } from "../ai/stylist";
import { analyzeMatchGaps, type StyleGap } from "../engine/gaps";
import { resolveOccasion } from "../engine/occasions";
import { REJECT_COOLDOWN_DAYS, describe, itemIds, outfitKey, recommendOutfits, type OutfitCandidate } from "../engine/recommend";
import { lookTitle } from "../engine/titles";
import { HISTORY_DAYS, learnTaste } from "./taste";
export { HISTORY_DAYS };
import type { Repository } from "../data/repository";
import { getShoppingProvider } from "../shopping/providers";
import { pickForGap } from "./shop-service";
import type { RankedProduct } from "../shopping/types";
import { getWeather, manualWeather } from "../weather";
import type { WardrobeItem, Weather } from "../types";

export interface RecommendRequest {
  occasion: string;
  formality?: number | null;
  lat?: number | null;
  lon?: number | null;
  manual_temp_c?: number | null;
  manual_rain?: boolean;
  exclude_item_ids?: string[];
  avoid_item_ids?: string[];
  exclude_outfit_ids?: string[];
}

export interface OutfitView {
  id: string;
  title: string;
  note: string;
  score: number;
  formality: number;
  harmony: string;
  complete: boolean;
  items: { role: string; item: WardrobeItem }[];
  item_ids: string[];
}

export interface RecommendResponse {
  occasion: { label: string; formality: [number, number] };
  weather: Weather;
  weather_summary: string;
  outfits: OutfitView[];
  gaps: StyleGap[];
  stylist: "claude" | "engine";
  stylist_error: string | null;
  excluded: number;
  /** true when this round had to reuse pieces from rejected outfits */
  relaxed: boolean;
  relaxed_categories: string[];
  in_laundry: number;
}

function toView(c: OutfitCandidate, title: string, note: string): OutfitView {
  const items = (
    [
      ["Outerwear", c.outerwear],
      ["Top", c.top],
      ["Dress / One-piece", c.onePiece],
      ["Bottom", c.bottom],
      ["Shoes", c.footwear],
      ["Accessory", c.accessory],
    ] as const
  )
    .filter(([, i]) => !!i)
    .map(([role, item]) => ({ role, item: item! }));
  return { id: c.id, title, note, score: c.score, formality: c.formality, harmony: c.harmony.scheme, complete: c.complete, items, item_ids: itemIds(c) };
}

/** Short stylist-style note from the engine's reasons (formality line is for the LLM only). */
function engineNote(c: OutfitCandidate): string {
  const pieces = [c.top ?? c.onePiece, c.bottom].filter(Boolean).map((i) => describe(i!));
  const lead = pieces.length === 2 ? `${cap(pieces[0])} over ${pieces[1]}.` : pieces.length ? `${cap(pieces[0])} as the hero piece.` : "";
  const learned = c.reasons.find((r) => r.startsWith("You keep coming back"));
  const rest = c.reasons.slice(1).filter((r) => r !== learned);
  return [lead, learned, ...rest].filter(Boolean).slice(0, 4).join(" ");
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function engineTitle(c: OutfitCandidate): string {
  return lookTitle(c.id, c.formality, c.harmony.scheme);
}

export async function recommend(repo: Repository, req: RecommendRequest): Promise<RecommendResponse> {
  const [profile, swipes] = await Promise.all([repo.getProfile(), repo.listSwipes(HISTORY_DAYS)]);
  const { learned, items } = await learnTaste(repo, profile);
  const cooldownSince = Date.now() - REJECT_COOLDOWN_DAYS * 86_400_000;
  const recentRejects = swipes.filter((s) => s.decision === "reject" && new Date(s.at).getTime() >= cooldownSince).map((s) => s.item_ids);
  const occasion = resolveOccasion(req.occasion, req.formality);
  // Outfits rejected in the last 2 days aren't suggested again until the cooldown passes
  const byId = new Map(items.map((i) => [i.id, i]));
  const cooled = recentRejects.map((ids) => {
    const clothes = ids.map((id) => byId.get(id)).filter((i): i is WardrobeItem => !!i && i.category !== "accessory");
    return outfitKey({
      top: clothes.find((i) => i.category === "top") ?? null,
      bottom: clothes.find((i) => i.category === "bottom") ?? null,
      onePiece: clothes.find((i) => i.category === "one_piece") ?? null,
      footwear: clothes.find((i) => i.category === "footwear") ?? null,
      outerwear: clothes.find((i) => i.category === "outerwear") ?? null,
    });
  });
  const weather =
    typeof req.manual_temp_c === "number" ? manualWeather(req.manual_temp_c, !!req.manual_rain, req.lat ?? null) : await getWeather(req.lat ?? null, req.lon ?? null);

  const result = recommendOutfits({
    items,
    profile,
    occasion,
    weather,
    excludeItemIds: req.exclude_item_ids,
    avoidItemIds: req.avoid_item_ids,
    excludeOutfitIds: [...(req.exclude_outfit_ids ?? []), ...cooled],
    learned,
  });
  const gaps = analyzeMatchGaps(items, profile, occasion, result);
  const completePool = result.pool.filter((c) => c.complete);

  let outfits: OutfitView[] = [];
  let stylist: RecommendResponse["stylist"] = "engine";
  let stylist_error: string | null = null;

  if (claudeEnabled() && completePool.length > 0) {
    try {
      const styled = await styleWithClaude({ candidates: completePool, profile, occasion, weather, weatherProfile: result.weatherProfile, learned });
      if (styled) {
        outfits = styled.outfits.map((o) => toView(o.candidate, o.title, o.note));
        stylist = "claude";
        if (styled.gapSuggestion && gaps.length === 0) {
          // The LLM spotted a softer gap (e.g. "a statement accessory would elevate this")
          const cat = styled.gapSuggestion.category as StyleGap["spec"]["category"];
          gaps.push({
            trigger: "incomplete_match",
            occasion: occasion.label,
            urgency: 0.4,
            headline: "Suggested by your stylist",
            message: styled.gapSuggestion.description,
            spec: {
              category: cat,
              subcategory: styled.gapSuggestion.description.slice(0, 60),
              color_hex: "#1F2A44",
              color_name: "",
              formality: Math.round((occasion.formality[0] + occasion.formality[1]) / 2),
              max_price: profile.budget.max_per_item,
              currency: profile.budget.currency,
              department: profile.department,
              avoid_fits: [],
              size: null,
              query: `${profile.department === "unisex" ? "" : profile.department === "womens" ? "women's " : "men's "}${styled.gapSuggestion.description}`.slice(0, 100),
            },
          });
        }
      }
    } catch (err) {
      stylist_error = describeClaudeError(err);
      console.error("stylist LLM failed, using engine output", err);
    }
  }

  if (outfits.length === 0) {
    outfits = result.candidates.map((c) => toView(c, engineTitle(c), engineNote(c)));
  }

  return {
    occasion: { label: occasion.label, formality: occasion.formality },
    weather,
    weather_summary: result.weatherProfile.summary,
    outfits,
    gaps,
    stylist,
    stylist_error,
    excluded: result.rejected.length,
    relaxed: result.relaxed,
    relaxed_categories: result.relaxedCategories,
    in_laundry: result.rejected.filter((r) => r.reason === "in the laundry").length,
  };
}

export async function shopForGap(repo: Repository, gap: StyleGap): Promise<{ products: RankedProduct[]; provider: string; search_url: string; sample: boolean }> {
  const provider = getShoppingProvider();
  const { pick, sample, ranked } = await pickForGap(gap, provider);
  const products = ranked.slice(0, 3);
  await repo.saveGap(pick.gap, products).catch((err) => console.error("failed to persist gap", err));
  return { products, provider: provider.store, search_url: pick.search_url, sample };
}
