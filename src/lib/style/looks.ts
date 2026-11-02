// Style-quiz outfits, grouped by occasion. Each look lists its pieces by name
// and colour so a "like" teaches the stylist concrete combinations (e.g. navy
// shirt + beige chinos for the office). Real photos come from
// `npm run samples:photos` (Pexels) via `query`; until then the look renders as
// a flat-lay of product illustrations.

import type { Archetype, Palette } from "../types";
import { quizPhoto, type SamplePhoto } from "../samples/photos";
import type { StyleEvent, StylePiece } from "../engine/learning";

export type PieceKind =
  | "tee" | "shirt" | "blouse" | "knit" | "hoodie" | "blazer" | "coat" | "jacket"
  | "jeans" | "trousers" | "shorts" | "skirt" | "dress"
  | "sneakers" | "boots" | "heels" | "loafers" | "flats"
  | "bag" | "cap" | "hat" | "watch";

export interface LookPiece {
  kind: PieceKind;
  color: string;
  name: string; // "navy shirt", "beige chinos"
  pattern?: "stripes" | "floral";
}

export type QuizOccasion = "office" | "casual_date" | "formal_event" | "party" | "gym";
export const QUIZ_OCCASIONS: { key: QuizOccasion; label: string }[] = [
  { key: "office", label: "Office" },
  { key: "casual_date", label: "Casual Date" },
  { key: "formal_event", label: "Formal Event" },
  { key: "party", label: "Party" },
  { key: "gym", label: "Gym" },
];

export interface StyleLook {
  id: string;
  gender: "womens" | "mens";
  occasion: QuizOccasion;
  archetype: Archetype;
  palette: Palette;
  title: string;
  pieces: LookPiece[];
  /** photo search phrase for npm run samples:photos */
  query: string;
  image_url?: string;
  credit?: SamplePhoto;
}

type P = [PieceKind, string, string, LookPiece["pattern"]?];
const L = (id: string, gender: StyleLook["gender"], occasion: QuizOccasion, archetype: Archetype, palette: Palette, title: string, query: string, pieces: P[]): StyleLook => ({
  id,
  gender,
  occasion,
  archetype,
  palette,
  title,
  query,
  pieces: pieces.map(([kind, color, name, pattern]) => ({ kind, color, name, pattern })),
  image_url: quizPhoto(id)?.path,
  credit: quizPhoto(id) ?? undefined,
});

// colours
const NAVY = "#1F2A44", BEIGE = "#C8B494", CHARCOAL = "#3A3F45", BLACK = "#151515", WHITE = "#F5F4F0",
  LIGHTBLUE = "#A9C3E0", GREY = "#8C9096", BROWN = "#6B4226", TAN = "#8B5A2B", OLIVE = "#556B2F",
  CREAM = "#EDE6D8", BURGUNDY = "#6E1E2A", SAGE = "#9CAF88", DKGREEN = "#2F3F2E", TAUPE = "#8C7B6E", CAMEL = "#C19A6B";

export const STYLE_LOOKS: StyleLook[] = [
  // ---------------------------------------------------------- men · office
  L("m-off-navy-beige", "mens", "office", "smart_casual", "neutral", "Navy shirt & beige chinos", "man navy shirt beige chinos office outfit", [["shirt", NAVY, "navy shirt"], ["trousers", BEIGE, "beige chinos"], ["loafers", TAN, "brown loafers"], ["watch", "#C0C0C0", "steel watch"]]),
  L("m-off-lightblue-black", "mens", "office", "classic", "neutral", "Light blue & black", "man light blue shirt black trousers office", [["shirt", LIGHTBLUE, "light blue shirt"], ["trousers", BLACK, "black trousers"], ["loafers", BLACK, "black loafers"]]),
  L("m-off-white-charcoal", "mens", "office", "classic", "neutral", "White shirt & charcoal", "man white shirt charcoal trousers office", [["shirt", WHITE, "white shirt"], ["trousers", CHARCOAL, "charcoal trousers"], ["loafers", BLACK, "black loafers"]]),
  L("m-off-navy-knit-charcoal", "mens", "office", "minimal", "dark", "Navy knit & charcoal", "man navy sweater charcoal trousers office", [["knit", NAVY, "navy sweater"], ["trousers", CHARCOAL, "charcoal trousers"], ["loafers", BLACK, "black loafers"]]),
  L("m-off-navy-knit-beige", "mens", "office", "classic", "neutral", "Navy knit & chinos", "man navy crewneck sweater beige chinos", [["knit", NAVY, "navy sweater"], ["trousers", BEIGE, "beige chinos"], ["loafers", TAN, "brown loafers"]]),
  L("m-off-green-knit-navy", "mens", "office", "smart_casual", "earthy", "Forest knit & navy", "man green sweater navy trousers outfit", [["knit", DKGREEN, "green sweater"], ["trousers", NAVY, "navy trousers"], ["loafers", BROWN, "brown loafers"]]),
  L("m-off-olive-blazer", "mens", "office", "smart_casual", "dark", "Olive blazer, all black", "man olive blazer black t-shirt black trousers", [["blazer", OLIVE, "olive blazer"], ["tee", BLACK, "black t-shirt"], ["trousers", BLACK, "black trousers"], ["loafers", BLACK, "black loafers"]]),
  L("m-off-taupe-polo", "mens", "office", "minimal", "neutral", "Taupe knit polo", "man knit polo shirt black trousers", [["tee", TAUPE, "taupe knit polo"], ["trousers", BLACK, "black trousers"], ["loafers", BLACK, "black loafers"]]),
  L("m-off-cream-polo", "mens", "office", "minimal", "neutral", "Cream polo & black", "man cream polo black trousers", [["tee", CREAM, "cream knit polo"], ["trousers", BLACK, "black trousers"], ["loafers", BLACK, "black loafers"]]),
  L("m-off-navy-blazer-tee", "mens", "office", "smart_casual", "neutral", "Navy blazer & tee", "man navy blazer white t-shirt navy trousers sneakers", [["blazer", NAVY, "navy blazer"], ["tee", WHITE, "white t-shirt"], ["trousers", NAVY, "navy trousers"], ["sneakers", WHITE, "white sneakers"]]),
  L("m-off-burgundy-navy", "mens", "office", "classic", "earthy", "Burgundy & navy", "man burgundy shirt navy trousers", [["shirt", BURGUNDY, "burgundy shirt"], ["trousers", NAVY, "navy trousers"], ["loafers", TAN, "brown loafers"]]),
  L("m-off-beige-grey", "mens", "office", "classic", "neutral", "Beige shirt & grey", "man beige shirt grey trousers brown shoes", [["shirt", BEIGE, "beige shirt"], ["trousers", GREY, "grey trousers"], ["loafers", TAN, "brown loafers"]]),
  L("m-off-stripe-green", "mens", "office", "smart_casual", "neutral", "Stripes & forest green", "man striped shirt dark green trousers street style", [["shirt", LIGHTBLUE, "striped shirt", "stripes"], ["trousers", DKGREEN, "dark green trousers"], ["loafers", TAN, "brown loafers"]]),
  L("m-off-sage-beige", "mens", "office", "smart_casual", "earthy", "Sage & stone", "man sage green shirt beige chinos", [["shirt", SAGE, "sage shirt"], ["trousers", BEIGE, "beige chinos"], ["sneakers", WHITE, "white sneakers"]]),
  L("m-off-brown-beige", "mens", "office", "classic", "earthy", "Chocolate & sand", "man dark brown shirt beige trousers", [["shirt", BROWN, "brown shirt"], ["trousers", BEIGE, "beige trousers"], ["loafers", TAN, "brown loafers"]]),
  L("m-off-grey-knit", "mens", "office", "minimal", "neutral", "Grey knit & charcoal", "man grey quarter zip sweater charcoal trousers", [["knit", GREY, "grey sweater"], ["trousers", CHARCOAL, "charcoal trousers"], ["sneakers", WHITE, "white sneakers"]]),
  L("m-off-grey-blazer-jeans", "mens", "office", "smart_casual", "neutral", "Grey blazer & denim", "man light grey blazer white t-shirt jeans", [["blazer", "#B9BCC0", "light grey blazer"], ["tee", WHITE, "white t-shirt"], ["jeans", NAVY, "dark jeans"], ["sneakers", WHITE, "white sneakers"]]),
  L("m-off-navy-polo", "mens", "office", "minimal", "dark", "Tonal navy", "man navy polo navy trousers", [["tee", NAVY, "navy polo"], ["trousers", NAVY, "navy trousers"], ["loafers", BLACK, "black loafers"]]),
  // ------------------------------------------------------- men · other
  L("m-date-linen", "mens", "casual_date", "bohemian", "earthy", "Relaxed linen", "man linen shirt summer outfit", [["shirt", "#D6C7A6", "linen shirt"], ["trousers", "#F0EBE0", "cream trousers"], ["loafers", TAN, "brown loafers"]]),
  L("m-date-breton", "mens", "casual_date", "romantic", "pastel", "Breton & stone", "man breton striped shirt chinos sneakers", [["tee", "#F5F3EE", "breton tee", "stripes"], ["trousers", "#D9CFC0", "stone chinos"], ["sneakers", WHITE, "white sneakers"]]),
  L("m-date-oxford-jeans", "mens", "casual_date", "smart_casual", "neutral", "Oxford & denim", "man oxford shirt jeans casual outfit", [["shirt", WHITE, "oxford shirt"], ["jeans", "#3B5278", "blue jeans"], ["sneakers", WHITE, "white sneakers"]]),
  L("m-date-hoodie", "mens", "casual_date", "streetwear", "earthy", "Hoodie & cargos", "man hoodie cargo pants sneakers streetwear", [["hoodie", "#3F4A3C", "olive hoodie"], ["trousers", "#6B6450", "cargo pants"], ["sneakers", "#F2F2F2", "white sneakers"]]),
  L("m-party-leather", "mens", "party", "edgy", "dark", "Leather jacket", "man black leather jacket white t-shirt jeans boots", [["jacket", BLACK, "leather jacket"], ["tee", WHITE, "white t-shirt"], ["jeans", "#3A3A3A", "black jeans"], ["boots", BLACK, "black boots"]]),
  L("m-party-black-shirt", "mens", "party", "minimal", "dark", "All black", "man black shirt black trousers night out", [["shirt", BLACK, "black shirt"], ["trousers", BLACK, "black trousers"], ["boots", BLACK, "black chelsea boots"]]),
  L("m-party-colour", "mens", "party", "streetwear", "bright", "Colour block", "man red jacket jeans sneakers street style", [["jacket", "#E2553C", "red jacket"], ["tee", WHITE, "white t-shirt"], ["jeans", "#5277B5", "blue jeans"], ["sneakers", WHITE, "white sneakers"]]),
  L("m-formal-charcoal-suit", "mens", "formal_event", "classic", "dark", "Charcoal suit", "man charcoal suit white shirt", [["blazer", CHARCOAL, "charcoal suit jacket"], ["shirt", WHITE, "white dress shirt"], ["trousers", CHARCOAL, "charcoal suit trousers"], ["loafers", BLACK, "black dress shoes"]]),
  L("m-formal-navy-suit", "mens", "formal_event", "classic", "neutral", "Navy suit", "man navy suit brown shoes", [["blazer", NAVY, "navy suit jacket"], ["shirt", LIGHTBLUE, "light blue dress shirt"], ["trousers", NAVY, "navy suit trousers"], ["loafers", TAN, "brown dress shoes"]]),
  L("m-gym-training", "mens", "gym", "sporty", "bright", "Training day", "man gym workout t-shirt shorts sneakers", [["tee", "#2563EB", "training t-shirt"], ["shorts", BLACK, "training shorts"], ["sneakers", "#E5E7EB", "running shoes"]]),
  L("m-gym-black", "mens", "gym", "sporty", "dark", "Black training kit", "man black gym outfit joggers", [["tee", BLACK, "training t-shirt"], ["trousers", BLACK, "joggers"], ["sneakers", WHITE, "running shoes"]]),
  // -------------------------------------------------------- women · office
  L("w-off-white-black", "womens", "office", "classic", "neutral", "White blouse & black", "woman white blouse black trousers office", [["blouse", WHITE, "white blouse"], ["trousers", BLACK, "black trousers"], ["heels", BLACK, "black heels"]]),
  L("w-off-camel-blazer", "womens", "office", "smart_casual", "earthy", "Camel blazer", "woman camel blazer white t-shirt black trousers", [["blazer", CAMEL, "camel blazer"], ["tee", WHITE, "white t-shirt"], ["trousers", BLACK, "black trousers"], ["loafers", BLACK, "black loafers"]]),
  L("w-off-navy-knit-cream", "womens", "office", "minimal", "neutral", "Navy knit & cream", "woman navy sweater cream trousers", [["knit", NAVY, "navy sweater"], ["trousers", CREAM, "cream trousers"], ["loafers", TAN, "brown loafers"]]),
  L("w-off-blue-shirt-beige", "womens", "office", "classic", "neutral", "Blue shirt & beige", "woman light blue shirt beige trousers", [["shirt", LIGHTBLUE, "light blue shirt"], ["trousers", BEIGE, "beige trousers"], ["flats", TAN, "tan flats"]]),
  L("w-off-trench", "womens", "office", "classic", "neutral", "Trench & loafers", "woman beige trench coat loafers outfit", [["coat", "#C8A97E", "trench coat"], ["shirt", "#F4F2EC", "white shirt"], ["trousers", "#2B2F3A", "navy trousers"], ["loafers", "#3A2A1E", "brown loafers"]]),
  L("w-off-navy-skirt", "womens", "office", "classic", "neutral", "Navy & ivory", "woman navy blazer midi skirt heels", [["blazer", NAVY, "navy blazer"], ["blouse", "#F7F3EA", "ivory blouse"], ["skirt", "#C9B79C", "beige midi skirt"], ["heels", BLACK, "black heels"]]),
  L("w-off-tonal-cream", "womens", "office", "minimal", "neutral", "Tonal cream", "woman cream knit sweater trousers minimalist", [["knit", "#E9E4DA", "cream sweater"], ["trousers", "#DDD6C9", "cream trousers"], ["sneakers", WHITE, "white sneakers"], ["bag", BLACK, "black bag"]]),
  L("w-off-sage-blouse", "womens", "office", "smart_casual", "earthy", "Sage blouse & white", "woman sage green blouse white trousers", [["blouse", SAGE, "sage blouse"], ["trousers", WHITE, "white trousers"], ["flats", BEIGE, "beige flats"]]),
  L("w-off-grey-blazer-jeans", "womens", "office", "smart_casual", "neutral", "Grey blazer & denim", "woman grey blazer jeans loafers", [["blazer", GREY, "grey blazer"], ["tee", WHITE, "white t-shirt"], ["jeans", "#3B5278", "blue jeans"], ["loafers", BLACK, "black loafers"]]),
  // ------------------------------------------------------- women · other
  L("w-date-boho", "womens", "casual_date", "bohemian", "earthy", "Boho florals", "woman boho floral dress boots", [["dress", "#C98B5E", "floral dress", "floral"], ["boots", "#6B4226", "brown boots"], ["bag", "#A9744F", "tan bag"]]),
  L("w-date-pastels", "womens", "casual_date", "romantic", "pastel", "Soft pastels", "woman pastel pink blouse skirt", [["blouse", "#F4D3D6", "pink blouse"], ["skirt", "#E3D6F0", "lilac skirt"], ["heels", "#F1E3D3", "nude heels"]]),
  L("w-date-colour-pop", "womens", "casual_date", "streetwear", "bright", "Colour pop", "woman orange sweater blue jeans", [["knit", "#E2553C", "orange sweater"], ["jeans", "#5277B5", "blue jeans"], ["sneakers", WHITE, "white sneakers"]]),
  L("w-date-linen", "womens", "casual_date", "smart_casual", "earthy", "Linen ease", "woman linen shirt wide trousers summer", [["shirt", "#DCCBB0", "linen shirt"], ["trousers", "#F2EEE5", "wide trousers"], ["flats", "#B08960", "tan flats"]]),
  L("w-party-leather", "womens", "party", "edgy", "dark", "Leather & black", "woman black leather jacket jeans boots", [["jacket", "#1A1A1A", "leather jacket"], ["tee", WHITE, "white t-shirt"], ["jeans", "#2A2A2A", "black jeans"], ["boots", BLACK, "black boots"]]),
  L("w-party-all-black", "womens", "party", "minimal", "dark", "All black", "woman all black outfit night out", [["tee", "#151515", "black top"], ["trousers", "#1C1C1C", "black trousers"], ["heels", BLACK, "black heels"], ["bag", "#2A2A2A", "black bag"]]),
  L("w-formal-black-dress", "womens", "formal_event", "classic", "dark", "Little black dress", "woman black cocktail dress heels", [["dress", BLACK, "black dress"], ["heels", BLACK, "black heels"], ["bag", "#C9B48A", "gold clutch"]]),
  L("w-formal-satin", "womens", "formal_event", "romantic", "neutral", "Satin & black", "woman satin blouse black skirt formal", [["blouse", "#E8D9BF", "champagne satin blouse"], ["skirt", BLACK, "black skirt"], ["heels", BLACK, "black heels"]]),
  L("w-gym-athleisure", "womens", "gym", "sporty", "bright", "Athleisure", "woman athleisure leggings jacket sneakers", [["jacket", "#7BA3C9", "track jacket"], ["tee", "#E8E2D9", "sports top"], ["trousers", "#222222", "leggings"], ["sneakers", WHITE, "running shoes"]]),
];

/** Photo search phrases (used by scripts/fetch-sample-photos.ts). */
export const LOOK_PHOTO_QUERY: Record<string, string> = Object.fromEntries(STYLE_LOOKS.map((l) => [l.id, l.query]));

export function looksFor(department: "womens" | "mens" | "unisex", occasion?: QuizOccasion): StyleLook[] {
  const pool = STYLE_LOOKS.filter((l) => !occasion || l.occasion === occasion);
  if (department === "unisex") {
    const w = pool.filter((l) => l.gender === "womens");
    const m = pool.filter((l) => l.gender === "mens");
    const out: StyleLook[] = [];
    for (let i = 0; i < Math.max(w.length, m.length); i++) out.push(...[m[i], w[i]].filter(Boolean));
    return out;
  }
  return pool.filter((l) => l.gender === department);
}

const CATEGORY: Record<PieceKind, StylePiece["category"]> = {
  tee: "top", shirt: "top", blouse: "top", knit: "top", hoodie: "outerwear", blazer: "outerwear", coat: "outerwear", jacket: "outerwear",
  jeans: "bottom", trousers: "bottom", shorts: "bottom", skirt: "bottom", dress: "one_piece",
  sneakers: "footwear", boots: "footwear", heels: "footwear", loafers: "footwear", flats: "footwear",
  bag: "accessory", cap: "accessory", hat: "accessory", watch: "accessory",
};

/** A look's pieces in the same shape as wardrobe items, for preference learning. */
export function lookPieces(look: StyleLook): StylePiece[] {
  return look.pieces.map((p) => ({
    category: CATEGORY[p.kind],
    subcategory: p.name,
    color_hex: p.color,
    pattern: p.pattern === "stripes" ? "vertical_stripes" : p.pattern === "floral" ? "floral" : "solid",
    fit: "regular",
  }));
}

/** Liked quiz looks become positive style events for the learner. */
export function quizEvents(likedIds: string[]): StyleEvent[] {
  const liked = new Set(likedIds);
  return STYLE_LOOKS.filter((l) => liked.has(l.id)).map((l) => ({ pieces: lookPieces(l), positive: true, occasion: l.occasion, source: "quiz" as const }));
}

/** Turn liked looks into archetype + palette affinities (0..1, relative to the most-liked one). */
export function scoreStyle(shown: StyleLook[], liked: string[]) {
  const likedSet = new Set(liked);
  const tally = <K extends string>(key: (l: StyleLook) => K) => {
    const counts = new Map<K, number>();
    for (const l of shown) if (likedSet.has(l.id)) counts.set(key(l), (counts.get(key(l)) ?? 0) + 1);
    const max = Math.max(0, ...counts.values());
    const out: Partial<Record<K, number>> = {};
    for (const [k, n] of counts) out[k] = Math.round((n / max) * 100) / 100;
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
