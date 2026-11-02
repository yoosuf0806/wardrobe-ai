import "server-only";
import type { GapSpec } from "../engine/gaps";
import type { ProductListing, ShoppingProvider } from "./types";

// Daraz (daraz.lk / .pk / .com.bd / .com.np) – free, no API key.
//
// TESTING ONLY: listings come from the JSON the daraz.lk website itself loads
// (/catalog/?ajax=true). It is undocumented and can change without notice, and
// automated use may conflict with Daraz's terms. For production, join the
// Daraz Affiliate Programme and use its official product feed/links.
// Affiliate links: set DARAZ_AFFILIATE_URL_TEMPLATE to the deep-link format
// from your affiliate dashboard, with {url} where the product URL goes, e.g.
//   DARAZ_AFFILIATE_URL_TEMPLATE="https://<your-tracking-domain>/...?...&url={url}"

const CURRENCY: Record<string, string> = { "daraz.lk": "LKR", "daraz.pk": "PKR", "daraz.com.bd": "BDT", "daraz.com.np": "NPR" };

export function darazDomain() {
  return process.env.DARAZ_DOMAIN || "daraz.lk";
}

export function darazAffiliate(url: string): string {
  const tpl = process.env.DARAZ_AFFILIATE_URL_TEMPLATE;
  return tpl && tpl.includes("{url}") ? tpl.replace("{url}", encodeURIComponent(url)) : url;
}

interface DarazListItem {
  name?: string;
  price?: string | number;
  image?: string;
  itemUrl?: string;
  ratingScore?: string | number;
  review?: string | number;
  sellerName?: string;
  brandName?: string;
}

const absolute = (u: string) => (u.startsWith("//") ? `https:${u}` : u.startsWith("/") ? `https://www.${darazDomain()}${u}` : u);

export class DarazShoppingProvider implements ShoppingProvider {
  name = "daraz";
  store = "Daraz";
  currency = CURRENCY[darazDomain()] ?? "LKR";
  disclosure = "Links to Daraz may earn SmartStylist a commission. Prices and availability can change.";

  searchUrl(spec: GapSpec): string {
    const url = new URL(`https://www.${darazDomain()}/catalog/`);
    url.searchParams.set("q", spec.query);
    url.searchParams.set("price", `-${Math.ceil(spec.max_price)}`);
    return darazAffiliate(url.toString());
  }

  async search(spec: GapSpec, limit: number): Promise<ProductListing[]> {
    const url = new URL(`https://www.${darazDomain()}/catalog/`);
    url.searchParams.set("ajax", "true");
    url.searchParams.set("q", spec.query);
    url.searchParams.set("price", `-${Math.ceil(spec.max_price * 1.15)}`);
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "SmartStylist/0.1 (+testing)" },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`Daraz ${res.status}`);
    const json = (await res.json()) as { mods?: { listItems?: DarazListItem[] } };
    const items = json.mods?.listItems;
    if (!Array.isArray(items)) throw new Error("Daraz: unexpected response shape");
    return items
      .filter((i) => i.name && i.itemUrl)
      .slice(0, limit * 3)
      .map((i) => {
        const price = Number(String(i.price ?? "").replace(/[^\d.]/g, ""));
        const rating = Number(i.ratingScore);
        const reviews = Number(i.review);
        return {
          title: i.name!,
          merchant: i.sellerName || i.brandName || "Daraz",
          price: Number.isFinite(price) && price > 0 ? price : null,
          currency: this.currency,
          url: darazAffiliate(absolute(i.itemUrl!)),
          image_url: i.image ? absolute(i.image) : null,
          rating: Number.isFinite(rating) && rating > 0 ? Math.round(rating * 10) / 10 : null,
          reviews: Number.isFinite(reviews) ? reviews : null,
        };
      });
  }
}
