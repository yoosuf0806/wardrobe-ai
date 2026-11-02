import "server-only";
import { analyzeMatchGaps, analyzeThinInventory, analyzeWearFrequency, type StyleGap } from "../engine/gaps";
import { QUICK_OCCASIONS } from "../engine/occasions";
import { isInLaundry, recommendOutfits } from "../engine/recommend";
import type { Repository } from "../data/repository";
import { amazonSearchUrl, getShoppingProvider } from "../shopping/providers";
import { rankProducts } from "../shopping/rank";
import type { RankedProduct } from "../shopping/types";
import { getWeather } from "../weather";

export interface ShopPick {
  gap: StyleGap;
  product: RankedProduct | null;
  search_url: string;
}

export interface ShopBoard {
  budget: { max_per_item: number; currency: string };
  in_laundry: number;
  within_budget: ShopPick[];
  above_budget: ShopPick[];
  provider: string;
}

const MAX_GAPS = 8;

/**
 * Gap analysis across the user's main occasions (Office, Casual Date, Formal
 * Event, Gym, Party), their outfit history and what's in the laundry – one
 * best Amazon pick per gap, split by budget.
 */
export async function buildShopBoard(repo: Repository, lat: number | null = null, lon: number | null = null): Promise<ShopBoard> {
  const [profile, items, logs, weather] = await Promise.all([repo.getProfile(), repo.listItems(), repo.listLogs(60), getWeather(lat, lon)]);

  const gaps: StyleGap[] = [];
  for (const occasion of QUICK_OCCASIONS) {
    const result = recommendOutfits({ items, profile, occasion, weather });
    gaps.push(...analyzeMatchGaps(items, profile, occasion, result), ...analyzeThinInventory(items, profile, occasion, result));
  }
  gaps.push(...analyzeWearFrequency(logs, items, profile));

  // One pick per distinct need (same category + subcategory + colour), most urgent first
  const seen = new Set<string>();
  const unique = gaps
    .sort((a, b) => b.urgency - a.urgency)
    .filter((g) => {
      const k = `${g.spec.category}|${g.spec.subcategory}|${g.spec.color_name}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, MAX_GAPS);

  const provider = getShoppingProvider();
  const picks = await Promise.all(
    unique.map(async (gap): Promise<ShopPick> => {
      try {
        const listings = await provider.search(gap.spec, 10);
        // allow above-budget listings so we can show an "above your budget" pick when nothing fits
        const ranked = rankProducts(listings, { ...gap.spec, max_price: gap.spec.max_price * 2 }, gap.urgency, provider.name, 10).map((p) => ({
          ...p,
          within_budget: p.price !== null && p.price <= gap.spec.max_price,
        }));
        const product = ranked.find((p) => p.within_budget) ?? ranked[0] ?? null;
        return { gap, product, search_url: amazonSearchUrl(gap.spec) };
      } catch (err) {
        console.error("shop search failed", err);
        return { gap, product: null, search_url: amazonSearchUrl(gap.spec) };
      }
    }),
  );

  return {
    budget: profile.budget,
    in_laundry: items.filter((i) => isInLaundry(i)).length,
    within_budget: picks.filter((p) => p.product?.within_budget),
    above_budget: picks.filter((p) => !p.product?.within_budget),
    provider: provider.name,
  };
}
