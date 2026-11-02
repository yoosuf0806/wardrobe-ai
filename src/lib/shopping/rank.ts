// Rank product listings by budget compliance, style compatibility and gap urgency.

import type { GapSpec } from "../engine/gaps";
import type { ProductListing, RankedProduct } from "./types";

const FIT_WORDS: Record<string, string[]> = {
  slim: ["slim", "skinny", "bodycon", "fitted"],
  oversized: ["oversized", "boxy", "oversize"],
};

function tokens(s: string) {
  return s.toLowerCase().split(/[^a-z0-9']+/).filter((t) => t.length > 2);
}

export function rankProducts(listings: ProductListing[], spec: GapSpec, urgency: number, provider: string, limit = 3): RankedProduct[] {
  const subTokens = tokens(spec.subcategory);
  const colorTokens = tokens(spec.color_name);
  const seen = new Set<string>();

  const ranked = listings
    .filter((l) => {
      const k = l.url.split("?")[0] + l.title.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .map((l): RankedProduct => {
      const title = l.title.toLowerCase();
      const notes: string[] = [];

      // 1. Budget compliance (hard-ish): at/below budget = 1, up to 15% over decays to 0
      let budget = 0.5;
      const within = l.price !== null && l.price <= spec.max_price;
      if (l.price !== null) {
        budget = within ? 1 - 0.3 * (l.price / spec.max_price) ** 2 : Math.max(0, 1 - ((l.price - spec.max_price) / spec.max_price) / 0.15);
        notes.push(within ? "Within budget" : "Slightly over budget");
      }

      // 2. Style compatibility: garment type + colour + fit words
      const subHit = subTokens.filter((t) => title.includes(t)).length / Math.max(1, subTokens.length);
      const colorHit = colorTokens.some((t) => title.includes(t)) ? 1 : 0;
      if (colorHit) notes.push(`Matches the ${spec.color_name} you need`);
      let fitPenalty = 0;
      for (const f of spec.avoid_fits) if ((FIT_WORDS[f] ?? [f]).some((w) => title.includes(w))) fitPenalty = 0.5;
      if (fitPenalty) notes.push("Cut may conflict with your fit preferences");
      const waterproofHit = spec.waterproof ? (/(waterproof|rain|water-resistant)/.test(title) ? 1 : 0) : 1;
      const style = Math.max(0, 0.55 * subHit + 0.3 * colorHit + 0.15 * waterproofHit - fitPenalty);

      // 3. Social proof (light touch)
      const quality = l.rating ? Math.min(1, (l.rating - 3) / 2) * Math.min(1, Math.log10((l.reviews ?? 0) + 1) / 3) : 0.3;

      const score = (0.45 * budget + 0.4 * style + 0.15 * quality) * (0.7 + 0.3 * urgency);
      return { ...l, score: Math.round(score * 1000) / 1000, within_budget: within, match_notes: notes, provider };
    })
    .filter((p) => p.price === null || p.price <= spec.max_price * 1.15);

  ranked.sort((a, b) => b.score - a.score);
  return ranked.slice(0, limit);
}
