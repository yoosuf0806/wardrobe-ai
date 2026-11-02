import "server-only";
import { analyzeMatchGaps, analyzeThinInventory, analyzeWearFrequency, type GapSpec, type StyleGap } from "../engine/gaps";
import { learnPreferences, likedColorFamilies } from "../engine/learning";
import { QUICK_OCCASIONS } from "../engine/occasions";
import { isInLaundry, recommendOutfits } from "../engine/recommend";
import type { Repository } from "../data/repository";
import { convert } from "../shopping/fx";
import { MockShoppingProvider, getShoppingProvider } from "../shopping/providers";
import { rankProducts } from "../shopping/rank";
import type { RankedProduct, ShoppingProvider } from "../shopping/types";
import { getWeather } from "../weather";
import type { Profile } from "../types";

export interface ShopPick {
  gap: StyleGap;
  product: RankedProduct | null;
  search_url: string;
}

export interface ShopBoard {
  budget: { max_per_item: number; currency: string };
  /** budget converted to the marketplace currency */
  store_budget: { max_per_item: number; currency: string };
  in_laundry: number;
  within_budget: ShopPick[];
  above_budget: ShopPick[];
  store: string;
  /** true when live listings were unavailable and samples are shown */
  sample: boolean;
  disclosure: string;
}

const MAX_GAPS = 8;

/** Gap spec expressed in the marketplace's currency. */
function forStore(spec: GapSpec, provider: ShoppingProvider): GapSpec {
  if (spec.currency === provider.currency) return spec;
  return { ...spec, max_price: Math.round(convert(spec.max_price, spec.currency, provider.currency)), currency: provider.currency };
}

/** Search the marketplace for one gap; returns the best pick (within budget if possible). */
export async function pickForGap(gap: StyleGap, provider: ShoppingProvider): Promise<{ pick: ShopPick; sample: boolean; ranked: RankedProduct[] }> {
  const spec = forStore(gap.spec, provider);
  let source: ShoppingProvider = provider;
  let listings;
  try {
    listings = await provider.search(spec, 10);
    if (listings.length === 0) throw new Error("no results");
  } catch (err) {
    if (provider.name !== "mock") console.warn(`${provider.store} search failed – showing sample listings`, err instanceof Error ? err.message : err);
    source = provider.name === "mock" ? provider : new MockShoppingProvider(provider);
    listings = await source.search(spec, 10);
  }
  // rank with headroom so an "above your budget" pick exists when nothing fits
  const ranked = rankProducts(listings, { ...spec, max_price: spec.max_price * 2 }, gap.urgency, source.name, 10).map((p) => ({
    ...p,
    within_budget: p.price !== null && p.price <= spec.max_price,
  }));
  const product = ranked.find((p) => p.within_budget) ?? ranked[0] ?? null;
  return { pick: { gap: { ...gap, spec }, product, search_url: provider.searchUrl(spec) }, sample: source.name === "mock", ranked };
}

/** Profile with learned colour likes attached (runtime only) so gap specs reflect taste. */
export async function profileWithTaste(repo: Repository, profile: Profile) {
  const [items, logs, swipes] = await Promise.all([repo.listItems(), repo.listLogs(180), repo.listSwipes(180)]);
  const learned = learnPreferences({ logs, swipes, items, style: profile.style_profile });
  return { profile: { ...profile, style_profile: { ...profile.style_profile, learned_colors: likedColorFamilies(learned) } }, items, logs, learned };
}

/**
 * Gap analysis across the user's main occasions (Office, Casual Date, Formal
 * Event, Gym, Party), their outfit history and what's in the laundry – one
 * best pick per gap from the active marketplace, split by budget.
 */
export async function buildShopBoard(repo: Repository, lat: number | null = null, lon: number | null = null): Promise<ShopBoard> {
  const [base, weather] = await Promise.all([repo.getProfile(), getWeather(lat, lon)]);
  const { profile, items, logs } = await profileWithTaste(repo, base);

  const gaps: StyleGap[] = [];
  for (const occasion of QUICK_OCCASIONS) {
    const result = recommendOutfits({ items, profile, occasion, weather });
    gaps.push(...analyzeMatchGaps(items, profile, occasion, result), ...analyzeThinInventory(items, profile, occasion, result));
  }
  gaps.push(...analyzeWearFrequency(logs, items, profile));

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
  const results = await Promise.all(unique.map((g) => pickForGap(g, provider)));
  const picks = results.map((r) => r.pick);

  return {
    budget: profile.budget,
    store_budget: { max_per_item: Math.round(convert(profile.budget.max_per_item, profile.budget.currency, provider.currency)), currency: provider.currency },
    in_laundry: items.filter((i) => isInLaundry(i)).length,
    within_budget: picks.filter((p) => p.product?.within_budget),
    above_budget: picks.filter((p) => !p.product?.within_budget),
    store: provider.store,
    sample: results.some((r) => r.sample),
    disclosure: provider.disclosure,
  };
}
