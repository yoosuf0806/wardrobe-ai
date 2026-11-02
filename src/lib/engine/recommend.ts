// Daily Outfit Recommendation Matrix (deterministic core).
//
// Pipeline:  hard filters (user overrides, laundry, unavailable items, weather, formality window)
//         -> per-role candidate pools (top-K by item score)
//         -> combinatorial ensembles  [top+bottom | one_piece] + footwear (+ outerwear)
//         -> optional accessory chosen per ensemble (only if it keeps the colour story)
//         -> ensemble scoring (formality, colour harmony, body rules, weather, freshness)
//         -> diverse top-N
//
// "Show me more" rounds pass the items from rejected outfits as `avoidItemIds`.
// They are excluded per category whenever that category still has alternatives;
// only a category that would otherwise be empty (e.g. you own two pairs of
// office shoes and both were shown) re-admits them with a score penalty.
//
// The LLM stylist (src/lib/ai/stylist.ts) re-ranks and explains these
// candidates; it never invents items, so the output is always grounded.

import { evaluateHarmony, type HarmonyResult } from "./color";
import { activeItemRules, activeOutfitRules, itemRuleHits, userReject, type RuleHit } from "./body-rules";
import type { OccasionProfile } from "./occasions";
import { profileWeather, weatherItemScore, weatherReject, type WeatherProfile } from "./weather-rules";
import type { Category, Profile, WardrobeItem, Weather } from "../types";

export const LAUNDRY_DAYS = 2; // items return to the closet automatically after this many days

export interface RecommendInput {
  items: WardrobeItem[];
  profile: Profile;
  occasion: OccasionProfile;
  weather: Weather;
  now?: Date;
  maxResults?: number;
  poolSize?: number;
  /** Items the user says are unavailable right now – never used. */
  excludeItemIds?: string[];
  /** Items from outfits the user already rejected – avoided when possible. */
  avoidItemIds?: string[];
  /** Outfit IDs already shown in this session – never repeated. */
  excludeOutfitIds?: string[];
}

export interface OutfitCandidate {
  id: string;
  top: WardrobeItem | null;
  bottom: WardrobeItem | null;
  onePiece: WardrobeItem | null;
  footwear: WardrobeItem | null;
  outerwear: WardrobeItem | null;
  accessory: WardrobeItem | null;
  score: number;
  formality: number;
  breakdown: { formality: number; color: number; body: number; weather: number; freshness: number };
  harmony: HarmonyResult;
  ruleHits: RuleHit[];
  reasons: string[];
  complete: boolean;
}

export interface RecommendResult {
  weatherProfile: WeatherProfile;
  candidates: OutfitCandidate[]; // ranked, diverse
  pool: OutfitCandidate[]; // larger ranked pool (for the LLM re-ranker)
  rejected: { item_id: string; reason: string }[];
  eligible: Record<Category, WardrobeItem[]>;
  /** true when previously suggested items had to be reused because nothing else fits */
  relaxed: boolean;
  /** categories where previously suggested items were reused */
  relaxedCategories: Category[];
}

const W = { formality: 0.3, color: 0.25, body: 0.2, weather: 0.15, freshness: 0.1 };
const AVOID_PENALTY = 0.12;

export function itemIds(c: Pick<OutfitCandidate, "top" | "bottom" | "onePiece" | "footwear" | "outerwear" | "accessory">): string[] {
  return [c.top, c.bottom, c.onePiece, c.footwear, c.outerwear, c.accessory].filter(Boolean).map((i) => i!.id);
}

/** Rejected outfits are hidden for this long, then may be suggested again. */
export const REJECT_COOLDOWN_DAYS = 2;

/** Outfit identity ignores the accessory, so "same clothes + different belt" counts as a repeat. */
export function outfitKey(parts: Pick<OutfitCandidate, "top" | "bottom" | "onePiece" | "footwear" | "outerwear">): string {
  return [parts.top, parts.bottom, parts.onePiece, parts.footwear, parts.outerwear]
    .filter(Boolean)
    .map((i) => i!.id)
    .sort()
    .join("+");
}

export function isInLaundry(item: Pick<WardrobeItem, "in_laundry_since">, now = new Date()): boolean {
  if (!item.in_laundry_since) return false;
  return now.getTime() - new Date(item.in_laundry_since).getTime() < LAUNDRY_DAYS * 86_400_000;
}

function formalityItemOk(item: WardrobeItem, [min, max]: [number, number]): boolean {
  // Accessories are forgiving (a watch works almost anywhere); clothes allow one notch either side.
  if (item.category === "accessory") return item.formality >= min - 3 && item.formality <= max + 2;
  return item.formality >= min - 1 && item.formality <= max + 1;
}

function formalityScore(avg: number, [min, max]: [number, number]): number {
  const d = avg < min ? min - avg : avg > max ? avg - max : 0;
  return Math.max(0, 1 - d / 2.5);
}

function freshness(items: WardrobeItem[], now: Date): number {
  let s = 1;
  for (const i of items) {
    if (i.category === "accessory") continue;
    if (i.last_worn_at) {
      const days = (now.getTime() - new Date(i.last_worn_at).getTime()) / 86_400_000;
      if (days < 2) s -= 0.25;
      else if (days < 5) s -= 0.1;
    }
  }
  return Math.max(0, s);
}

const COLD_ONLY_ACCESSORIES = /scarf|beanie|gloves|mittens|earmuff/i;
const SUN_ACCESSORIES = /sunglass|sun hat|straw hat|cap/i;

export function recommendOutfits(input: RecommendInput): RecommendResult {
  const { items, profile, occasion, weather } = input;
  const now = input.now ?? new Date();
  const maxResults = input.maxResults ?? 3;
  const poolSize = input.poolSize ?? 10;
  const wp = profileWeather(weather, now);
  const prefs = profile.fit_preferences;
  const itemRules = activeItemRules(profile.body_shape, prefs);
  const outfitRules = activeOutfitRules(profile.body_shape, prefs);
  const unavailable = new Set(input.excludeItemIds ?? []);
  const avoid = new Set(input.avoidItemIds ?? []);
  const avoided: Record<Category, WardrobeItem[]> = { top: [], bottom: [], one_piece: [], footwear: [], outerwear: [], accessory: [] };
  const seenOutfits = new Set(input.excludeOutfitIds ?? []);

  const rejected: RecommendResult["rejected"] = [];
  const eligible: Record<Category, WardrobeItem[]> = { top: [], bottom: [], one_piece: [], footwear: [], outerwear: [], accessory: [] };
  const itemScore = new Map<string, number>();

  for (const item of items) {
    const reason =
      (isInLaundry(item, now) ? "in the laundry" : null) ??
      (unavailable.has(item.id) ? "marked unavailable" : null) ??
      userReject(item, prefs) ??
      weatherReject(item, wp) ??
      (item.category === "accessory" && COLD_ONLY_ACCESSORIES.test(item.subcategory) && !["cool", "cold"].includes(wp.band) ? "too warm for it" : null) ??
      (formalityItemOk(item, occasion.formality) ? null : `formality ${item.formality} is outside ${occasion.formality[0]}–${occasion.formality[1]}`);
    if (reason) {
      rejected.push({ item_id: item.id, reason });
      continue;
    }
    if (avoid.has(item.id) && item.category !== "accessory") avoided[item.category].push(item);
    else eligible[item.category].push(item);
    const body = itemRuleHits(item, itemRules).reduce((a, h) => a + h.weight, 0);
    const mid = (occasion.formality[0] + occasion.formality[1]) / 2;
    const fScore = 1 - Math.min(1, Math.abs(item.formality - mid) / 4);
    itemScore.set(item.id, 0.5 * fScore + 0.3 * weatherItemScore(item, wp) + 0.2 * (0.5 + body));
  }
  // Re-admit previously suggested items only where a category would otherwise be empty
  const relaxedCategories: Category[] = [];
  for (const cat of Object.keys(avoided) as Category[]) {
    if (avoided[cat].length === 0) continue;
    const needed = cat === "footwear" || (cat === "outerwear" && wp.outerwear === "required") || ((cat === "top" || cat === "bottom") && eligible.one_piece.length === 0);
    if (eligible[cat].length === 0 && needed) {
      eligible[cat] = avoided[cat];
      relaxedCategories.push(cat);
    } else for (const i of avoided[cat]) rejected.push({ item_id: i.id, reason: "already suggested" });
  }
  if (wp.outerwear === "none") eligible.outerwear = eligible.outerwear.filter((o) => o.waterproof && wp.wantsRainProtection);

  const top = (list: WardrobeItem[]) => [...list].sort((a, b) => (itemScore.get(b.id) ?? 0) - (itemScore.get(a.id) ?? 0)).slice(0, poolSize);
  const tops = top(eligible.top);
  const bottoms = top(eligible.bottom);
  const onePieces = top(eligible.one_piece);
  const shoes: (WardrobeItem | null)[] = eligible.footwear.length ? top(eligible.footwear) : [null];
  const outer: (WardrobeItem | null)[] = [null, ...top(eligible.outerwear)];

  const cores: { top: WardrobeItem | null; bottom: WardrobeItem | null; onePiece: WardrobeItem | null }[] = [];
  for (const t of tops) for (const b of bottoms) cores.push({ top: t, bottom: b, onePiece: null });
  for (const o of onePieces) cores.push({ top: null, bottom: null, onePiece: o });

  const ctx = { wp, occasion, itemRules, outfitRules, now, accessories: eligible.accessory, avoid, preferLongSleeves: prefs.prefer_long_sleeves };
  const all: OutfitCandidate[] = [];
  for (const core of cores)
    for (const footwear of shoes)
      for (const outerwear of outer) {
        const parts = { ...core, footwear, outerwear };
        if (seenOutfits.has(outfitKey(parts))) continue;
        all.push(scoreEnsemble(parts, ctx));
      }

  all.sort((a, b) => b.score - a.score);
  return {
    weatherProfile: wp,
    candidates: pickDiverse(all, maxResults),
    pool: pickDiverse(all, Math.max(8, maxResults), 2),
    rejected,
    eligible,
    relaxed: relaxedCategories.length > 0,
    relaxedCategories,
  };
}

type Ctx = {
  wp: WeatherProfile;
  occasion: OccasionProfile;
  itemRules: ReturnType<typeof activeItemRules>;
  outfitRules: ReturnType<typeof activeOutfitRules>;
  now: Date;
  accessories: WardrobeItem[];
  avoid: Set<string>;
  preferLongSleeves: boolean;
};

/** Best accessory that keeps (or improves) the outfit's colour story, or null. */
function pickAccessory(pieces: WardrobeItem[], ctx: Ctx): WardrobeItem | null {
  if (ctx.accessories.length === 0) return null;
  const base = evaluateHarmony(pieces.map((p) => p.color_hex)).score;
  const mid = (ctx.occasion.formality[0] + ctx.occasion.formality[1]) / 2;
  let best: WardrobeItem | null = null;
  let bestScore = -Infinity;
  for (const a of ctx.accessories) {
    const harmony = evaluateHarmony([...pieces.map((p) => p.color_hex), a.color_hex]).score;
    if (harmony < base - 0.03) continue; // never let an accessory break the palette
    let s = harmony - Math.abs(a.formality - mid) * 0.05;
    if (SUN_ACCESSORIES.test(a.subcategory) && ctx.wp.band !== "hot" && ctx.wp.band !== "warm") s -= 0.3;
    if (COLD_ONLY_ACCESSORIES.test(a.subcategory)) s += 0.1; // it's cold (otherwise filtered out)
    if (ctx.avoid.has(a.id)) s -= 0.2;
    if (s > bestScore) {
      bestScore = s;
      best = a;
    }
  }
  return best;
}

function scoreEnsemble(parts: Pick<OutfitCandidate, "top" | "bottom" | "onePiece" | "footwear" | "outerwear">, ctx: Ctx): OutfitCandidate {
  const clothes = [parts.top, parts.bottom, parts.onePiece, parts.footwear, parts.outerwear].filter(Boolean) as WardrobeItem[];
  const core = [parts.top, parts.bottom, parts.onePiece, parts.footwear].filter(Boolean) as WardrobeItem[];
  const accessory = pickAccessory(clothes, ctx);
  const pieces = accessory ? [...clothes, accessory] : clothes;
  const reasons: string[] = [];

  // Formality – ensemble average of the core pieces (outerwear counts half, accessories not at all)
  const fw = core.reduce((a, i) => a + i.formality, 0) + (parts.outerwear ? parts.outerwear.formality * 0.5 : 0);
  const formality = fw / (core.length + (parts.outerwear ? 0.5 : 0));
  const fScore = formalityScore(formality, ctx.occasion.formality);

  // Colour harmony (accessory included)
  const harmony = evaluateHarmony(pieces.map((p) => p.color_hex));

  // Body rules
  const ruleHits: RuleHit[] = clothes.flatMap((p) => itemRuleHits(p, ctx.itemRules));
  const upper = [parts.top].filter(Boolean) as WardrobeItem[];
  const lower = [parts.bottom].filter(Boolean) as WardrobeItem[];
  for (const r of ctx.outfitRules) {
    const w = r.evaluate({ upper, lower, onePiece: parts.onePiece, outerwear: parts.outerwear });
    if (w !== 0) ruleHits.push({ id: r.id, description: r.description, weight: w });
  }
  const upperPiece = parts.top ?? parts.onePiece;
  if (ctx.preferLongSleeves && upperPiece && ctx.wp.band !== "hot") {
    const long = upperPiece.sleeve_length === "long_sleeve" || upperPiece.sleeve_length === "three_quarter";
    ruleHits.push({ id: "user_long_sleeves", description: long ? "Full-length sleeves, as you prefer" : "Shorter sleeves than you usually prefer", weight: long ? 0.12 : -0.08 });
  }
  const bodyRaw = ruleHits.reduce((a, h) => a + h.weight, 0);
  const body = Math.max(0, Math.min(1, 0.6 + bodyRaw));

  // Weather
  let weather = clothes.reduce((a, p) => a + weatherItemScore(p, ctx.wp), 0) / Math.max(1, clothes.length);
  const need = ctx.wp.outerwear;
  if (need === "required" && !parts.outerwear) weather -= 0.45;
  if (need === "recommended" && parts.outerwear) weather += 0.1;
  if (need === "recommended" && !parts.outerwear) weather -= 0.1;
  if ((need === "none" || need === "optional") && parts.outerwear && !(ctx.wp.wantsRainProtection && parts.outerwear.waterproof)) weather -= 0.15;
  if (ctx.wp.wantsRainProtection && parts.outerwear?.waterproof) weather += 0.15;
  weather = Math.max(0, Math.min(1, weather));

  const fresh = freshness(pieces, ctx.now);
  const complete = !!parts.footwear && !!(parts.onePiece || (parts.top && parts.bottom));

  let score = W.formality * fScore + W.color * harmony.score + W.body * body + W.weather * weather + W.freshness * fresh;
  if (accessory) score += 0.02;
  score -= clothes.filter((p) => ctx.avoid.has(p.id)).length * AVOID_PENALTY;
  if (!complete) score *= 0.6;

  // Human-readable reasons (used when no LLM is configured, and as LLM grounding)
  reasons.push(`Formality ${formality.toFixed(1)} vs. target ${ctx.occasion.formality[0]}–${ctx.occasion.formality[1]} for ${ctx.occasion.label}.`);
  reasons.push(harmony.explanation);
  for (const h of ruleHits.filter((h) => h.weight > 0).slice(0, 2)) reasons.push(h.description + ".");
  if (need === "required" && parts.outerwear) reasons.push(`${parts.outerwear.subcategory || "Outer layer"} keeps you warm at ${ctx.wp.summary.split(",")[0]}.`);
  if (ctx.wp.wantsRainProtection && parts.outerwear?.waterproof) reasons.push("Waterproof layer for the expected rain.");
  if (ctx.wp.muggy) reasons.push("Breathable fabrics prioritised for the humidity.");
  if (accessory) reasons.push(`Finish with the ${describe(accessory)}.`);

  return {
    id: outfitKey(parts),
    ...parts,
    accessory,
    score: Math.round(score * 1000) / 1000,
    formality: Math.round(formality * 10) / 10,
    breakdown: { formality: fScore, color: harmony.score, body, weather, freshness: fresh },
    harmony,
    ruleHits,
    reasons,
    complete,
  };
}

/** "dark brown leather belt" rather than "dark brown brown leather belt". */
export function describe(i: Pick<WardrobeItem, "color_name" | "subcategory">): string {
  const sub = i.subcategory.toLowerCase();
  const colorWords = i.color_name.toLowerCase().split(/[\s/]+/);
  return colorWords.some((w) => w.length > 2 && sub.includes(w)) ? sub : `${i.color_name.toLowerCase()} ${sub}`;
}

/** Greedy diversity: each new pick may share at most `maxShared` clothing items with any earlier pick. */
function pickDiverse(sorted: OutfitCandidate[], n: number, maxShared = 1): OutfitCandidate[] {
  const chosen: OutfitCandidate[] = [];
  const clothesOf = (c: OutfitCandidate) => itemIds({ ...c, accessory: null });
  for (const shared of [maxShared, maxShared + 1, 99]) {
    for (const c of sorted) {
      if (chosen.length >= n) return chosen;
      if (chosen.some((x) => x.id === c.id)) continue;
      const ids = new Set(clothesOf(c));
      if (chosen.every((x) => clothesOf(x).filter((i) => ids.has(i)).length <= shared)) chosen.push(c);
    }
  }
  return chosen;
}
