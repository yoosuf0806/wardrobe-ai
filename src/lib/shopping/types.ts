import type { GapSpec } from "../engine/gaps";

export interface ProductListing {
  title: string;
  merchant: string | null;
  price: number | null;
  currency: string;
  url: string;
  image_url: string | null;
  rating: number | null;
  reviews: number | null;
}

export interface RankedProduct extends ProductListing {
  score: number;
  within_budget: boolean;
  match_notes: string[];
  provider: string;
}

/** A source of product listings. Implementations must be legal to use (APIs/feeds, not scraping). */
export interface ShoppingProvider {
  name: string;
  search(spec: GapSpec, limit: number): Promise<ProductListing[]>;
}
