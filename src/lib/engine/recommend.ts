// Daily Outfit Recommendation Matrix (deterministic core).
//
// Pipeline:  hard filters (user overrides, weather, formality window)
//         -> per-role candidate pools (top-K by item score)
//         -> combinatorial ensembles  [top+bottom | one_piece] + footwear (+ outerwear)
//         -> ensemble scoring (formality, colour harmony, body rules, weather, freshness)
//         -> diverse top-N
//
// The LLM stylist (src/lib/ai/stylist.ts) re-ranks and explains these
// candidates; it never invents items, so the output is always grounded.

import { evaluateHarmony, type HarmonyResult } from "./color";
import { activeItemRules, activeOutfitRules, itemRuleHits, userReject, type RuleHit } from "./body-rules";
import type { OccasionProfile } from "./occasions";
import { profileWeather, weatherItemScore, weatherReject, type WeatherProfile } from "./weather-rules";
import type { Category, Profile, WardrobeItem, Weather } from "../types";

export interface RecommendInput {
  items: WardrobeItem[];
  profile: Profile;
  occasion: OccasionProfile;
  weather: Weather;
  now?: Date;
  maxResults?: number;
  poolSize?: number;
}

export interface OutfitCandidate {
  id: string;
  top: WardrobeItem | null;
  bottom: WardrobeItem | null;
  onePiece: WardrobeItem | null;
  footwear: WardrobeItem | null;
  outerwear: WardrobeItem | null;
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
}

const W = { formality: 0.3, color: 0.25, body: 0.2, weather: 0.15, freshness: 0.1 };

export function itemIds(c: OutfitCandidate): string[] {
  return [c.top, c.bottom, c.onePiece, c.footwear, c.outerwear].filter(Boolean).map((i) => i!.id);
}

function formalityItemOk(item: WardrobeItem, [min, max]: [number, number]): boolean {
  // Allow one notch either side per piece; the ensemble average is checked separately.
  return item.formality >= min - 1 && item.formality <= max + 1;
}

function formalityScore(avg: number, [min, max]: [number, number]): number {
  const d = avg < min ? min - avg : avg > max ? avg - max : 0;
  return Math.max(0, 1 - d / 2.5);
}

function freshness(items: WardrobeItem[], now: Date): number {
  let s = 1;
  for (const i of items) {
    if (i.last_worn_at) {
      const days = (now.getTime() - new Date(i.last_worn_at).getTime()) / 86_400_000;
      if (days < 2) s -= 0.25;
      else if (days < 5) s -= 0.1;
    }
  }
  return Math.max(0, s);
}

export function recommendOutfits(input: RecommendInput): RecommendResult {
  const { items, profile, occasion, weather } = input;
  const now = input.now ?? new Date();
  const maxResults = input.maxResults ?? 3;
  const poolSize = input.poolSize ?? 10;
  const wp = profileWeather(weather, now);
  const prefs = profile.fit_preferences;
  const itemRules = activeItemRules(profile.body_shape, prefs);
  const outfitRules = activeOutfitRules(profile.body_shape, prefs);

  const rejected: RecommendResult["rejected"] = [];
  const eligible: Record<Category, WardrobeItem[]> = { top: [], bottom: [], one_piece: [], footwear: [], outerwear: [], accessory: [] };
  const itemScore = new Map<string, number>();

  for (const item of items) {
    const reason =
      userReject(item, prefs) ??
      weatherReject(item, wp) ??
      (formalityItemOk(item, occasion.formality) ? null : `formality ${item.formality} is outside ${occasion.formality[0]}–${occasion.formality[1]}`);
    if (reason) {
      rejected.push({ item_id: item.id, reason });
      continue;
    }
    eligible[item.category].push(item);
    const body = itemRuleHits(item, itemRules).reduce((a, h) => a + h.weight, 0);
    const mid = (occasion.formality[0] + occasion.formality[1]) / 2;
    const fScore = 1 - Math.min(1, Math.abs(item.formality - mid) / 4);
    itemScore.set(item.id, 0.5 * fScore + 0.3 * weatherItemScore(item, wp) + 0.2 * (0.5 + body));
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

  const all: OutfitCandidate[] = [];
  for (const core of cores)
    for (const footwear of shoes)
      for (const outerwear of outer) all.push(scoreEnsemble({ ...core, footwear, outerwear }, { wp, occasion, itemRules, outfitRules, now }));

  all.sort((a, b) => b.score - a.score);
  return { weatherProfile: wp, candidates: pickDiverse(all, maxResults), pool: pickDiverse(all, Math.max(8, maxResults), 2), rejected, eligible };
}

function scoreEnsemble(
  parts: Pick<OutfitCandidate, "top" | "bottom" | "onePiece" | "footwear" | "outerwear">,
  ctx: { wp: WeatherProfile; occasion: OccasionProfile; itemRules: ReturnType<typeof activeItemRules>; outfitRules: ReturnType<typeof activeOutfitRules>; now: Date },
): OutfitCandidate {
  const pieces = [parts.top, parts.bottom, parts.onePiece, parts.footwear, parts.outerwear].filter(Boolean) as WardrobeItem[];
  const core = [parts.top, parts.bottom, parts.onePiece, parts.footwear].filter(Boolean) as WardrobeItem[];
  const reasons: string[] = [];

  // Formality – ensemble average of the core pieces (outerwear counts half)
  const fw = core.reduce((a, i) => a + i.formality, 0) + (parts.outerwear ? parts.outerwear.formality * 0.5 : 0);
  const formality = fw / (core.length + (parts.outerwear ? 0.5 : 0));
  const fScore = formalityScore(formality, ctx.occasion.formality);

  // Colour harmony
  const harmony = evaluateHarmony(pieces.map((p) => p.color_hex));

  // Body rules
  const ruleHits: RuleHit[] = pieces.flatMap((p) => itemRuleHits(p, ctx.itemRules));
  const upper = [parts.top].filter(Boolean) as WardrobeItem[];
  const lower = [parts.bottom].filter(Boolean) as WardrobeItem[];
  for (const r of ctx.outfitRules) {
    const w = r.evaluate({ upper, lower, onePiece: parts.onePiece, outerwear: parts.outerwear });
    if (w !== 0) ruleHits.push({ id: r.id, description: r.description, weight: w });
  }
  const bodyRaw = ruleHits.reduce((a, h) => a + h.weight, 0);
  const body = Math.max(0, Math.min(1, 0.6 + bodyRaw));

  // Weather
  let weather = pieces.reduce((a, p) => a + weatherItemScore(p, ctx.wp), 0) / Math.max(1, pieces.length);
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
  if (!complete) score *= 0.6;

  // Human-readable reasons (used when no LLM is configured, and as LLM grounding)
  reasons.push(`Formality ${formality.toFixed(1)} vs. target ${ctx.occasion.formality[0]}–${ctx.occasion.formality[1]} for ${ctx.occasion.label}.`);
  reasons.push(harmony.explanation);
  for (const h of ruleHits.filter((h) => h.weight > 0).slice(0, 2)) reasons.push(h.description + ".");
  if (need === "required" && parts.outerwear) reasons.push(`${parts.outerwear.subcategory || "Outer layer"} keeps you warm at ${ctx.wp.summary.split(",")[0]}.`);
  if (ctx.wp.wantsRainProtection && parts.outerwear?.waterproof) reasons.push("Waterproof layer for the expected rain.");
  if (ctx.wp.muggy) reasons.push("Breathable fabrics prioritised for the humidity.");

  const id = pieces.map((p) => p.id).sort().join("+");
  return {
    id,
    ...parts,
    score: Math.round(score * 1000) / 1000,
    formality: Math.round(formality * 10) / 10,
    breakdown: { formality: fScore, color: harmony.score, body, weather, freshness: fresh },
    harmony,
    ruleHits,
    reasons,
    complete,
  };
}

/** Greedy diversity: each new pick may share at most `maxShared` items with any earlier pick. */
function pickDiverse(sorted: OutfitCandidate[], n: number, maxShared = 1): OutfitCandidate[] {
  const chosen: OutfitCandidate[] = [];
  for (const shared of [maxShared, maxShared + 1, 99]) {
    for (const c of sorted) {
      if (chosen.length >= n) return chosen;
      if (chosen.some((x) => x.id === c.id)) continue;
      const ids = new Set(itemIds(c));
      if (chosen.every((x) => itemIds(x).filter((i) => ids.has(i)).length <= shared)) chosen.push(c);
    }
  }
  return chosen;
}
