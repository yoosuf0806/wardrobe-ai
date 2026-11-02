import "server-only";
import { claudeEnabled, describeClaudeError } from "../ai/claude";
import { styleWithClaude } from "../ai/stylist";
import { analyzeMatchGaps, type StyleGap } from "../engine/gaps";
import { resolveOccasion } from "../engine/occasions";
import { itemIds, recommendOutfits, type OutfitCandidate } from "../engine/recommend";
import type { Repository } from "../data/repository";
import { getShoppingProvider } from "../shopping/providers";
import { rankProducts } from "../shopping/rank";
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
}

function toView(c: OutfitCandidate, title: string, note: string): OutfitView {
  const items = (
    [
      ["Outerwear", c.outerwear],
      ["Top", c.top],
      ["Dress / One-piece", c.onePiece],
      ["Bottom", c.bottom],
      ["Shoes", c.footwear],
    ] as const
  )
    .filter(([, i]) => !!i)
    .map(([role, item]) => ({ role, item: item! }));
  return { id: c.id, title, note, score: c.score, formality: c.formality, harmony: c.harmony.scheme, complete: c.complete, items, item_ids: itemIds(c) };
}

function engineTitle(c: OutfitCandidate): string {
  const anchor = c.onePiece ?? c.top;
  if (!anchor) return "Your look";
  const firstColorWord = anchor.color_name.split(/[\s/]/)[0]?.toLowerCase() ?? "";
  const name = anchor.subcategory.toLowerCase().includes(firstColorWord) ? anchor.subcategory : `${anchor.color_name} ${anchor.subcategory}`;
  return name.replace(/\b\w/g, (m) => m.toUpperCase());
}

export async function recommend(repo: Repository, req: RecommendRequest): Promise<RecommendResponse> {
  const [profile, items] = await Promise.all([repo.getProfile(), repo.listItems()]);
  const occasion = resolveOccasion(req.occasion, req.formality);
  const weather =
    typeof req.manual_temp_c === "number" ? manualWeather(req.manual_temp_c, !!req.manual_rain, req.lat ?? null) : await getWeather(req.lat ?? null, req.lon ?? null);

  const result = recommendOutfits({ items, profile, occasion, weather });
  const gaps = analyzeMatchGaps(items, profile, occasion, result);
  const completePool = result.pool.filter((c) => c.complete);

  let outfits: OutfitView[] = [];
  let stylist: RecommendResponse["stylist"] = "engine";
  let stylist_error: string | null = null;

  if (claudeEnabled() && completePool.length > 0) {
    try {
      const styled = await styleWithClaude({ candidates: completePool, profile, occasion, weather, weatherProfile: result.weatherProfile });
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
    outfits = result.candidates.map((c) => toView(c, engineTitle(c), c.reasons.join(" ")));
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
  };
}

export async function shopForGap(repo: Repository, gap: StyleGap): Promise<{ products: RankedProduct[]; provider: string }> {
  const provider = getShoppingProvider();
  const listings = await provider.search(gap.spec, 12);
  const products = rankProducts(listings, gap.spec, gap.urgency, provider.name, 3);
  await repo.saveGap(gap, products).catch((err) => console.error("failed to persist gap", err));
  return { products, provider: provider.name };
}
