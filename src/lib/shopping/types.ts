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
  prime?: boolean;
}

export interface RankedProduct extends ProductListing {
  score: number;
  within_budget: boolean;
  match_notes: string[];
  provider: string;
}

/** A source of product listings. */
export interface ShoppingProvider {
  name: string;
  /** Marketplace shown to the user ("Daraz", "Amazon") */
  store: string;
  /** Currency prices come back in */
  currency: string;
  search(spec: GapSpec, limit: number): Promise<ProductListing[]>;
  /** A search-results link for the spec (affiliate-tagged when configured) */
  searchUrl(spec: GapSpec): string;
  disclosure: string;
}
