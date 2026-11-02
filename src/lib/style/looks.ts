// Style-quiz outfits. Each look is tagged with a style archetype and colour
// palette; the user's likes become their StyleProfile. `image_url` can point
// at curated photography later – until then the look renders as a flat-lay
// illustration from its pieces.

import type { Archetype, Palette } from "../types";

export type PieceKind =
  | "tee" | "shirt" | "blouse" | "knit" | "hoodie" | "blazer" | "coat" | "jacket"
  | "jeans" | "trousers" | "shorts" | "skirt" | "dress"
  | "sneakers" | "boots" | "heels" | "loafers" | "flats"
  | "bag" | "cap" | "hat" | "watch";

export interface LookPiece {
  kind: PieceKind;
  color: string;
  pattern?: "stripes" | "floral";
}

export interface StyleLook {
  id: string;
  gender: "womens" | "mens";
  archetype: Archetype;
  palette: Palette;
  title: string;
  pieces: LookPiece[];
  image_url?: string;
}

const L = (id: string, gender: StyleLook["gender"], archetype: Archetype, palette: Palette, title: string, pieces: [PieceKind, string, LookPiece["pattern"]?][]): StyleLook => ({
  id,
  gender,
  archetype,
  palette,
  title,
  pieces: pieces.map(([kind, color, pattern]) => ({ kind, color, pattern })),
});

export const STYLE_LOOKS: StyleLook[] = [
  // ---------------------------------------------------------------- women
  L("w-trench", "womens", "classic", "neutral", "Trench & loafers", [["coat", "#C8A97E"], ["shirt", "#F4F2EC"], ["trousers", "#2B2F3A"], ["loafers", "#3A2A1E"]]),
  L("w-navy-pearls", "womens", "classic", "neutral", "Navy & ivory", [["blazer", "#1F2A44"], ["blouse", "#F7F3EA"], ["skirt", "#C9B79C"], ["heels", "#1A1A1A"]]),
  L("w-tonal-cream", "womens", "minimal", "neutral", "Tonal cream", [["knit", "#E9E4DA"], ["trousers", "#DDD6C9"], ["sneakers", "#FFFFFF"], ["bag", "#1A1A1A"]]),
  L("w-all-black", "womens", "minimal", "dark", "All black", [["tee", "#151515"], ["trousers", "#1C1C1C"], ["boots", "#111111"], ["bag", "#2A2A2A"]]),
  L("w-weekday-smart", "womens", "smart_casual", "earthy", "Weekday smart", [["blazer", "#A48A6A"], ["tee", "#FAFAF7"], ["jeans", "#3B5278"], ["loafers", "#2B1E16"]]),
  L("w-linen-ease", "womens", "smart_casual", "earthy", "Linen ease", [["shirt", "#DCCBB0"], ["trousers", "#F2EEE5"], ["flats", "#B08960"], ["bag", "#7A5236"]]),
  L("w-street-layers", "womens", "streetwear", "earthy", "Street layers", [["hoodie", "#9AA5B1"], ["trousers", "#4A4F3A"], ["sneakers", "#F2F2F2"], ["cap", "#151515"]]),
  L("w-colour-pop", "womens", "streetwear", "bright", "Colour pop", [["knit", "#E2553C"], ["jeans", "#5277B5"], ["sneakers", "#FFFFFF"], ["bag", "#F3C443"]]),
  L("w-athleisure", "womens", "sporty", "bright", "Athleisure", [["jacket", "#7BA3C9"], ["tee", "#E8E2D9"], ["trousers", "#222222"], ["sneakers", "#FFFFFF"]]),
  L("w-boho", "womens", "bohemian", "earthy", "Boho florals", [["dress", "#C98B5E", "floral"], ["boots", "#6B4226"], ["bag", "#A9744F"], ["hat", "#D8C3A0"]]),
  L("w-pastels", "womens", "romantic", "pastel", "Soft pastels", [["blouse", "#F4D3D6"], ["skirt", "#E3D6F0"], ["heels", "#F1E3D3"], ["bag", "#FFFFFF"]]),
  L("w-leather", "womens", "edgy", "dark", "Leather & black", [["jacket", "#1A1A1A"], ["tee", "#FFFFFF"], ["jeans", "#2A2A2A"], ["boots", "#111111"]]),
  // ----------------------------------------------------------------- men
  L("m-navy-blazer", "mens", "classic", "neutral", "Navy blazer", [["blazer", "#1F2A44"], ["shirt", "#FFFFFF"], ["trousers", "#8C8C88"], ["loafers", "#3A2418"]]),
  L("m-camel-coat", "mens", "classic", "earthy", "Camel overcoat", [["coat", "#C19A6B"], ["knit", "#36454F"], ["trousers", "#2E2E2E"], ["boots", "#3A2A1E"]]),
  L("m-tonal-grey", "mens", "minimal", "neutral", "Tonal grey", [["knit", "#9CA3AF"], ["trousers", "#6B7280"], ["sneakers", "#FFFFFF"], ["watch", "#C0C0C0"]]),
  L("m-all-black", "mens", "minimal", "dark", "All black", [["tee", "#151515"], ["trousers", "#1A1A1A"], ["sneakers", "#111111"], ["watch", "#C0C0C0"]]),
  L("m-oxford-chinos", "mens", "smart_casual", "neutral", "Oxford & chinos", [["shirt", "#A7C4E2"], ["trousers", "#C3B091"], ["loafers", "#5C3A1E"], ["watch", "#C0C0C0"]]),
  L("m-knit-polo", "mens", "smart_casual", "earthy", "Knit & stone", [["knit", "#556B2F"], ["trousers", "#E8E1D3"], ["loafers", "#2B1E16"]]),
  L("m-hoodie-cargo", "mens", "streetwear", "earthy", "Hoodie & cargos", [["hoodie", "#3F4A3C"], ["trousers", "#6B6450"], ["sneakers", "#F2F2F2"], ["cap", "#151515"]]),
  L("m-colour-block", "mens", "streetwear", "bright", "Colour block", [["jacket", "#E2553C"], ["tee", "#FFFFFF"], ["jeans", "#5277B5"], ["sneakers", "#FFFFFF"]]),
  L("m-training", "mens", "sporty", "bright", "Training day", [["tee", "#2563EB"], ["shorts", "#151515"], ["sneakers", "#E5E7EB"], ["cap", "#2563EB"]]),
  L("m-linen", "mens", "bohemian", "earthy", "Relaxed linen", [["shirt", "#D6C7A6"], ["trousers", "#F0EBE0"], ["loafers", "#8B5A2B"], ["hat", "#C8B48C"]]),
  L("m-breton", "mens", "romantic", "pastel", "Breton & stone", [["tee", "#F5F3EE", "stripes"], ["trousers", "#D9CFC0"], ["sneakers", "#FFFFFF"], ["watch", "#C9B37E"]]),
  L("m-leather", "mens", "edgy", "dark", "Leather jacket", [["jacket", "#111111"], ["tee", "#F5F5F5"], ["jeans", "#3A3A3A"], ["boots", "#111111"]]),
];

export function looksFor(department: "womens" | "mens" | "unisex"): StyleLook[] {
  if (department === "unisex") {
    // interleave so both are represented
    const w = STYLE_LOOKS.filter((l) => l.gender === "womens");
    const m = STYLE_LOOKS.filter((l) => l.gender === "mens");
    return w.flatMap((l, i) => [l, m[i]]).filter(Boolean);
  }
  return STYLE_LOOKS.filter((l) => l.gender === department);
}

/** Turn liked/disliked looks into archetype + palette affinities (0..1). */
export function scoreStyle(shown: StyleLook[], liked: string[]) {
  const likedSet = new Set(liked);
  const tally = <K extends string>(key: (l: StyleLook) => K) => {
    const shownBy = new Map<K, number>();
    const likedBy = new Map<K, number>();
    for (const l of shown) {
      shownBy.set(key(l), (shownBy.get(key(l)) ?? 0) + 1);
      if (likedSet.has(l.id)) likedBy.set(key(l), (likedBy.get(key(l)) ?? 0) + 1);
    }
    const out: Partial<Record<K, number>> = {};
    for (const [k, n] of shownBy) {
      const v = (likedBy.get(k) ?? 0) / n;
      if (v > 0) out[k] = Math.round(v * 100) / 100;
    }
    return out;
  };
  return {
    archetypes: tally((l) => l.archetype),
    palettes: tally((l) => l.palette),
    liked_looks: shown.filter((l) => likedSet.has(l.id)).map((l) => l.id),
    disliked_looks: shown.filter((l) => !likedSet.has(l.id)).map((l) => l.id),
  };
}

/** "Classic & Minimal" – the user's top one or two archetypes. */
export function topArchetypes(archetypes: Partial<Record<Archetype, number>>, n = 2): Archetype[] {
  return (Object.entries(archetypes) as [Archetype, number][])
    .filter(([, w]) => w >= 0.5)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([a]) => a);
}

/** Search keyword per archetype for shopping queries. */
export const ARCHETYPE_KEYWORD: Record<Archetype, { womens: string; mens: string; unisex: string }> = {
  classic: { womens: "classic", mens: "classic", unisex: "classic" },
  minimal: { womens: "minimalist", mens: "minimalist", unisex: "minimalist" },
  smart_casual: { womens: "smart casual", mens: "smart casual", unisex: "smart casual" },
  streetwear: { womens: "streetwear", mens: "streetwear", unisex: "streetwear" },
  sporty: { womens: "athleisure", mens: "athletic", unisex: "athletic" },
  bohemian: { womens: "boho", mens: "linen", unisex: "boho" },
  romantic: { womens: "feminine", mens: "", unisex: "" },
  edgy: { womens: "edgy", mens: "edgy", unisex: "edgy" },
};
