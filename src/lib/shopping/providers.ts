import "server-only";
import type { GapSpec } from "../engine/gaps";
import type { ProductListing, ShoppingProvider } from "./types";

// ---------------------------------------------------------------------------
// Amazon (primary)
// ---------------------------------------------------------------------------

export function amazonDomain(): string {
  return process.env.AMAZON_DOMAIN || "amazon.com";
}

/** Adds the Associates tag so qualifying purchases are credited. */
export function amazonAffiliateUrl(asinOrUrl: string): string {
  const tag = process.env.AMAZON_ASSOCIATE_TAG;
  const url = /^[A-Z0-9]{10}$/.test(asinOrUrl) ? new URL(`https://www.${amazonDomain()}/dp/${asinOrUrl}`) : new URL(asinOrUrl);
  if (tag) url.searchParams.set("tag", tag);
  return url.toString();
}

/** "See all results" link for a gap, always available (no API key needed). */
export function amazonSearchUrl(spec: GapSpec): string {
  const url = new URL(`https://www.${amazonDomain()}/s`);
  url.searchParams.set("k", spec.query);
  url.searchParams.set("high-price", String(Math.ceil(spec.max_price)));
  const tag = process.env.AMAZON_ASSOCIATE_TAG;
  if (tag) url.searchParams.set("tag", tag);
  return url.toString();
}

/**
 * Amazon product search via SerpAPI's Amazon engine (https://serpapi.com/amazon-search-api).
 * Links are rewritten to /dp/{ASIN}?tag={AMAZON_ASSOCIATE_TAG}.
 *
 * Production note: once the Associates account has qualifying sales, Amazon's own
 * product API (PA-API / Creators API) can replace SerpAPI behind this same class.
 * Amazon's operating agreement requires prices shown to be fresh (<24h) and an
 * Associates disclosure – both handled in the UI and the 1h cache below.
 */
export class AmazonShoppingProvider implements ShoppingProvider {
  name = "amazon";
  constructor(private serpApiKey: string) {}

  async search(spec: GapSpec, limit: number): Promise<ProductListing[]> {
    const params = new URLSearchParams({ engine: "amazon", k: spec.query, amazon_domain: amazonDomain(), api_key: this.serpApiKey });
    const res = await fetch(`https://serpapi.com/search.json?${params}`, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`SerpAPI Amazon ${res.status}`);
    const json = (await res.json()) as {
      organic_results?: {
        asin?: string;
        title: string;
        link?: string;
        link_clean?: string;
        thumbnail?: string;
        rating?: number;
        reviews?: number;
        extracted_price?: number;
        sponsored?: boolean;
      }[];
    };
    return (json.organic_results ?? [])
      .filter((r) => r.asin || r.link_clean || r.link)
      .slice(0, limit * 3)
      .map((r) => ({
        title: r.title,
        merchant: "Amazon",
        price: typeof r.extracted_price === "number" ? r.extracted_price : null,
        currency: spec.currency,
        url: amazonAffiliateUrl(r.asin ?? (r.link_clean || r.link)!),
        image_url: r.thumbnail ?? null,
        rating: r.rating ?? null,
        reviews: r.reviews ?? null,
      }));
  }
}

// ---------------------------------------------------------------------------
// Google Shopping (optional secondary)
// ---------------------------------------------------------------------------

export class GoogleShoppingProvider implements ShoppingProvider {
  name = "google_shopping";
  constructor(private apiKey: string, private country = "us") {}

  async search(spec: GapSpec, limit: number): Promise<ProductListing[]> {
    const params = new URLSearchParams({
      engine: "google_shopping",
      q: spec.query,
      gl: this.country,
      hl: "en",
      num: String(Math.min(40, limit * 3)),
      api_key: this.apiKey,
      tbs: `mr:1,price:1,ppr_max:${Math.ceil(spec.max_price * 1.15)}`,
    });
    const res = await fetch(`https://serpapi.com/search.json?${params}`, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`SerpAPI ${res.status}`);
    const json = (await res.json()) as {
      shopping_results?: { title: string; source?: string; extracted_price?: number; product_link?: string; link?: string; thumbnail?: string; rating?: number; reviews?: number }[];
    };
    return (json.shopping_results ?? [])
      .filter((r) => r.product_link || r.link)
      .map((r) => ({
        title: r.title,
        merchant: r.source ?? null,
        price: typeof r.extracted_price === "number" ? r.extracted_price : null,
        currency: spec.currency,
        url: (r.product_link || r.link)!,
        image_url: r.thumbnail ?? null,
        rating: r.rating ?? null,
        reviews: r.reviews ?? null,
      }));
  }
}

// ---------------------------------------------------------------------------
// Mock (demo / development)
// ---------------------------------------------------------------------------

export class MockShoppingProvider implements ShoppingProvider {
  name = "mock";
  async search(spec: GapSpec, limit: number): Promise<ProductListing[]> {
    const brands = ["Amazon Essentials", "Goodthreads", "Daily Ritual", "Northwind", "Linea Studio", "Basecamp"];
    const adjectives = ["Classic", "Essential", "Tailored", "Modern", "Everyday", "Premium"];
    const seed = [...spec.query].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
    return Array.from({ length: limit + 3 }, (_, i) => {
      const r = ((seed >>> (i % 16)) + i * 97) % 100;
      const price = Math.round(spec.max_price * (0.35 + (r / 100) * 0.9));
      const colorWord = i % 4 === 3 ? "black" : spec.color_name;
      const brand = brands[(i + seed) % brands.length];
      return {
        title: `${brand} ${adjectives[i % adjectives.length]} ${colorWord} ${spec.subcategory}`.replace(/\b\w/g, (m) => m.toUpperCase()),
        merchant: "Amazon (demo)",
        price,
        currency: spec.currency,
        url: amazonSearchUrl({ ...spec, query: `${brand} ${colorWord} ${spec.subcategory}` }),
        image_url: null,
        rating: 3.6 + (r % 14) / 10,
        reviews: 10 + r * 7,
      };
    });
  }
}

export function getShoppingProvider(): ShoppingProvider {
  const key = process.env.SERPAPI_API_KEY;
  if (!key) return new MockShoppingProvider();
  return process.env.SHOPPING_PROVIDER === "google_shopping"
    ? new GoogleShoppingProvider(key, process.env.SHOPPING_COUNTRY || "us")
    : new AmazonShoppingProvider(key);
}
