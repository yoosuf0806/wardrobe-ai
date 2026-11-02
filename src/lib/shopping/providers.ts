import "server-only";
import type { GapSpec } from "../engine/gaps";
import type { ProductListing, ShoppingProvider } from "./types";

/**
 * Google Shopping results via SerpAPI (https://serpapi.com/google-shopping-api).
 * Swap for an affiliate feed (Rakuten, Impact, ShopStyle Collective, Amazon PA-API)
 * by implementing ShoppingProvider – the ranking layer is provider-agnostic.
 */
export class SerpApiShoppingProvider implements ShoppingProvider {
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
    });
    // Price ceiling filter (+15% headroom so near-budget items can still be ranked)
    params.set("tbs", `mr:1,price:1,ppr_max:${Math.ceil(spec.max_price * 1.15)}`);
    const res = await fetch(`https://serpapi.com/search.json?${params}`, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`SerpAPI ${res.status}`);
    const json = (await res.json()) as {
      shopping_results?: {
        title: string;
        source?: string;
        extracted_price?: number;
        product_link?: string;
        link?: string;
        thumbnail?: string;
        rating?: number;
        reviews?: number;
      }[];
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

/** Deterministic mock catalogue for development and demos. */
export class MockShoppingProvider implements ShoppingProvider {
  name = "mock";
  async search(spec: GapSpec, limit: number): Promise<ProductListing[]> {
    const merchants = ["Northwind Apparel", "Atelier Nine", "Common Thread", "Fieldhouse & Co", "Linea Studio", "Basecamp Supply"];
    const adjectives = ["Classic", "Essential", "Tailored", "Modern", "Everyday", "Premium"];
    const seed = [...spec.query].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
    return Array.from({ length: limit + 3 }, (_, i) => {
      const r = ((seed >>> (i % 16)) + i * 97) % 100;
      const price = Math.round(spec.max_price * (0.35 + (r / 100) * 0.9));
      const colorWord = i % 4 === 3 ? "black" : spec.color_name;
      return {
        title: `${adjectives[i % adjectives.length]} ${colorWord} ${spec.subcategory}`.replace(/\b\w/g, (m) => m.toUpperCase()),
        merchant: merchants[(i + seed) % merchants.length],
        price,
        currency: spec.currency,
        url: `https://example.com/shop?q=${encodeURIComponent(spec.query)}&item=${i}`,
        image_url: null,
        rating: 3.6 + ((r % 14) / 10),
        reviews: 10 + r * 7,
      };
    });
  }
}

export function getShoppingProvider(): ShoppingProvider {
  const key = process.env.SERPAPI_API_KEY;
  return key ? new SerpApiShoppingProvider(key, process.env.SHOPPING_COUNTRY || "us") : new MockShoppingProvider();
}
