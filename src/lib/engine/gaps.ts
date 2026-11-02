// Style-gap analysis: turns "the wardrobe can't satisfy this" into a concrete,
// shoppable product specification.

import { STAPLE_COLORS, countDistinctColors, evaluateHarmony } from "./color";
import { activeItemRules } from "./body-rules";
import { OCCASIONS, resolveOccasion, type OccasionProfile } from "./occasions";
import type { RecommendResult } from "./recommend";
import type { Category, Department, Fit, OutfitLog, Profile, Sizes, WardrobeItem } from "../types";

export type GapTrigger = "incomplete_match" | "formality_ceiling" | "weather" | "wear_frequency";

export interface GapSpec {
  category: Category;
  subcategory: string;
  color_hex: string;
  color_name: string;
  formality: number;
  max_price: number;
  currency: string;
  department: Department;
  avoid_fits: Fit[];
  waterproof?: boolean;
  size: string | null; // e.g. "M", "32W x 30L", "10 US"
  query: string;
}

export interface StyleGap {
  trigger: GapTrigger;
  occasion: string;
  urgency: number; // 0..1
  message: string;
  spec: GapSpec;
}

const SUBCATEGORY: Record<Category, { max: number; womens: string; mens: string; unisex: string }[]> = {
  top: [
    { max: 3, womens: "athletic top", mens: "performance t-shirt", unisex: "athletic t-shirt" },
    { max: 5, womens: "knit top", mens: "crew neck t-shirt", unisex: "cotton t-shirt" },
    { max: 7, womens: "silk blouse", mens: "oxford button-down shirt", unisex: "button-down shirt" },
    { max: 10, womens: "satin blouse", mens: "dress shirt", unisex: "dress shirt" },
  ],
  bottom: [
    { max: 3, womens: "leggings", mens: "joggers", unisex: "joggers" },
    { max: 5, womens: "straight jeans", mens: "straight jeans", unisex: "straight jeans" },
    { max: 7, womens: "tailored trousers", mens: "chinos", unisex: "tailored trousers" },
    { max: 10, womens: "wide-leg dress trousers", mens: "suit trousers", unisex: "dress trousers" },
  ],
  one_piece: [
    { max: 5, womens: "casual midi dress", mens: "jumpsuit", unisex: "jumpsuit" },
    { max: 8, womens: "cocktail dress", mens: "jumpsuit", unisex: "jumpsuit" },
    { max: 10, womens: "evening gown", mens: "tuxedo", unisex: "formal jumpsuit" },
  ],
  footwear: [
    { max: 3, womens: "running shoes", mens: "running shoes", unisex: "running shoes" },
    { max: 5, womens: "white leather sneakers", mens: "white leather sneakers", unisex: "white leather sneakers" },
    { max: 7, womens: "leather loafers", mens: "leather loafers", unisex: "leather loafers" },
    { max: 10, womens: "pumps", mens: "oxford dress shoes", unisex: "leather dress shoes" },
  ],
  outerwear: [
    { max: 4, womens: "rain jacket", mens: "rain jacket", unisex: "rain jacket" },
    { max: 6, womens: "trench coat", mens: "chore jacket", unisex: "trench coat" },
    { max: 10, womens: "tailored blazer", mens: "navy blazer", unisex: "tailored blazer" },
  ],
  accessory: [{ max: 10, womens: "leather belt", mens: "leather belt", unisex: "leather belt" }],
};

function suggestSubcategory(category: Category, formality: number, dept: Department, opts: { cold?: boolean; rain?: boolean } = {}): string {
  if (category === "outerwear") {
    if (opts.rain && formality <= 6) return "waterproof rain jacket";
    if (opts.cold) return formality >= 7 ? "wool overcoat" : "insulated jacket";
  }
  const row = SUBCATEGORY[category].find((r) => formality <= r.max) ?? SUBCATEGORY[category].at(-1)!;
  return row[dept];
}

/** Pick the staple colour that harmonises with the most items the user already owns for this occasion. */
export function bridgeColor(items: WardrobeItem[]): { hex: string; name: string } {
  let best = STAPLE_COLORS[0];
  let bestScore = -1;
  for (const c of STAPLE_COLORS) {
    const owned = items.filter((i) => countDistinctColors([i.color_hex, c.hex]) === 1).length;
    const score = items.reduce((a, i) => a + evaluateHarmony([i.color_hex, c.hex]).score, 0) - owned * 0.5; // don't buy what you have
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best;
}

function fitsToAvoid(profile: Profile): Fit[] {
  const fits = new Set<Fit>();
  for (const r of activeItemRules(profile.body_shape, profile.fit_preferences)) {
    if (r.weight < 0 && r.id.includes("slim")) fits.add("slim");
    if (r.weight < 0 && r.id.includes("oversized")) fits.add("oversized");
  }
  if (profile.fit_preferences.allow_slim_fit === false) fits.add("slim");
  if (profile.fit_preferences.allow_oversized === false) fits.add("oversized");
  return [...fits];
}

/** Formalwear follows convention rather than wardrobe harmony: white shirts, black everything else. */
function formalColor(category: Category): { hex: string; name: string } {
  return category === "top" ? { hex: "#F5F5F0", name: "white" } : { hex: "#111111", name: "black" };
}

/** The user's size for a category, formatted the way retailers list it. */
export function sizeFor(category: Category, sizes: Sizes | undefined): string | null {
  if (!sizes) return null;
  switch (category) {
    case "top":
    case "outerwear":
      return sizes.top;
    case "bottom":
      if (sizes.bottom_waist && sizes.bottom_inseam) return `${sizes.bottom_waist}W x ${sizes.bottom_inseam}L`;
      return sizes.bottom_waist ? `${sizes.bottom_waist}W` : null;
    case "one_piece":
      return sizes.dress;
    case "footwear":
      return sizes.shoe ? `${sizes.shoe} ${sizes.shoe_system}` : null;
    default:
      return null;
  }
}

function makeSpec(category: Category, formality: number, profile: Profile, pool: WardrobeItem[], opts: { cold?: boolean; rain?: boolean } = {}): GapSpec {
  const color = formality >= 9 ? formalColor(category) : bridgeColor(pool);
  const subcategory = suggestSubcategory(category, formality, profile.department, opts);
  const dept = profile.department === "unisex" ? "" : profile.department === "womens" ? "women's " : "men's ";
  const avoid_fits = fitsToAvoid(profile);
  const fitWord = avoid_fits.includes("slim") ? "relaxed fit " : avoid_fits.includes("oversized") ? "tailored " : "";
  return {
    category,
    subcategory,
    color_hex: color.hex,
    color_name: color.name,
    formality,
    max_price: profile.budget.max_per_item,
    currency: profile.budget.currency,
    department: profile.department,
    avoid_fits,
    waterproof: opts.rain || undefined,
    size: sizeFor(category, profile.sizes),
    query: `${dept}${color.name} ${fitWord}${subcategory}${sizeFor(category, profile.sizes) ? ` size ${sizeFor(category, profile.sizes)}` : ""}`.replace(/\s+/g, " ").trim(),
  };
}

const ROLE_LABEL: Record<Category, string> = {
  top: "top",
  bottom: "bottom",
  one_piece: "dress or one-piece",
  footwear: "pair of shoes",
  outerwear: "outer layer",
  accessory: "accessory",
};

/** Trigger 1: the requested occasion can't be satisfied by the current inventory. */
export function analyzeMatchGaps(items: WardrobeItem[], profile: Profile, occasion: OccasionProfile, result: RecommendResult): StyleGap[] {
  const gaps: StyleGap[] = [];
  const [min, max] = occasion.formality;
  const target = Math.round((min + max) / 2);
  const { eligible, weatherProfile: wp } = result;
  const pool = [...eligible.top, ...eligible.bottom, ...eligible.one_piece, ...eligible.footwear];
  const fmt = (n: number) => `${profile.budget.currency === "USD" ? "$" : ""}${n}${profile.budget.currency === "USD" ? "" : " " + profile.budget.currency}`;

  const needs: Category[] = [];
  const hasCore = eligible.one_piece.length > 0 || (eligible.top.length > 0 && eligible.bottom.length > 0);
  if (!hasCore) {
    if (eligible.top.length === 0) needs.push("top");
    if (eligible.bottom.length === 0) needs.push("bottom");
  }
  if (eligible.footwear.length === 0) needs.push("footwear");

  for (const cat of needs) {
    const owned = items.filter((i) => i.category === cat);
    const ceiling = owned.length ? Math.max(...owned.map((i) => i.formality)) : 0;
    const isCeiling = owned.length > 0 && ceiling < min;
    const spec = makeSpec(cat, target, profile, pool);
    gaps.push({
      trigger: isCeiling ? "formality_ceiling" : "incomplete_match",
      occasion: occasion.label,
      urgency: isCeiling ? 0.9 : 0.8,
      message: isCeiling
        ? `${occasion.label} calls for formality ${min}+, but your most formal ${ROLE_LABEL[cat]} is a ${ceiling}. You're missing: ${spec.color_name} ${spec.subcategory}. Here are options within your ${fmt(spec.max_price)} budget.`
        : `You don't have a suitable ${ROLE_LABEL[cat]} for ${occasion.label.toLowerCase()} in this weather. Missing piece: ${spec.color_name} ${spec.subcategory}. Here are options within ${fmt(spec.max_price)}.`,
      spec,
    });
  }

  if (wp.outerwear === "required" && eligible.outerwear.length === 0) {
    const spec = makeSpec("outerwear", target, profile, pool, { cold: true, rain: wp.wantsRainProtection });
    gaps.push({
      trigger: "weather",
      occasion: occasion.label,
      urgency: 0.85,
      message: `It's ${wp.summary.split(",")[0]} and nothing in your wardrobe works as an outer layer for ${occasion.label.toLowerCase()}. Missing piece: ${spec.color_name} ${spec.subcategory}.`,
      spec,
    });
  } else if (wp.wantsRainProtection && !eligible.outerwear.some((o) => o.waterproof) && !items.some((i) => i.category === "outerwear" && i.waterproof)) {
    const spec = makeSpec("outerwear", Math.min(target, 6), profile, pool, { rain: true });
    gaps.push({ trigger: "weather", occasion: occasion.label, urgency: 0.5, message: `Rain is likely and you don't own a waterproof layer. Consider a ${spec.subcategory}.`, spec });
  }
  return gaps;
}

/** Trigger 2: frequent occasions where the user keeps repeating the same few pieces. */
export function analyzeWearFrequency(logs: OutfitLog[], items: WardrobeItem[], profile: Profile, now = new Date(), windowDays = 60): StyleGap[] {
  const since = now.getTime() - windowDays * 86_400_000;
  const recent = logs.filter((l) => new Date(l.worn_on).getTime() >= since);
  const byOcc = new Map<string, OutfitLog[]>();
  for (const l of recent) {
    const key = resolveOccasion(l.occasion).key;
    byOcc.set(key, [...(byOcc.get(key) ?? []), l]);
  }
  const itemById = new Map(items.map((i) => [i.id, i]));
  const gaps: StyleGap[] = [];

  for (const [key, ls] of byOcc) {
    if (ls.length < 3) continue;
    const occ = OCCASIONS.find((o) => o.key === key) ?? resolveOccasion(key);
    const [min, max] = occ.formality;
    for (const cat of ["top", "bottom", "footwear", "one_piece"] as Category[]) {
      const worn = ls.flatMap((l) => l.item_ids).map((id) => itemById.get(id)).filter((i): i is WardrobeItem => !!i && i.category === cat);
      if (worn.length < 3) continue;
      const distinct = new Set(worn.map((i) => i.id)).size;
      const available = items.filter((i) => i.category === cat && i.formality >= min - 1 && i.formality <= max + 1).length;
      if (distinct / worn.length <= 0.5 && available < 3) {
        const spec = makeSpec(cat, Math.round((min + max) / 2), profile, items.filter((i) => i.formality >= min - 1 && i.formality <= max + 1));
        gaps.push({
          trigger: "wear_frequency",
          occasion: occ.label,
          urgency: Math.min(1, 0.3 + ls.length / 15),
          message: `You've dressed for ${occ.label.toLowerCase()} ${ls.length} times in ${windowDays} days, rotating only ${distinct} ${ROLE_LABEL[cat]}${distinct === 1 ? "" : "s"}. Adding ${spec.color_name} ${spec.subcategory} would give you more variety.`,
          spec,
        });
      }
    }
  }
  return gaps.sort((a, b) => b.urgency - a.urgency);
}
