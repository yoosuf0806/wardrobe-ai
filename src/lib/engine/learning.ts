// Preference learning from outfit history.
//
// Every outfit the user wears (accepted swipe / logged outfit) is broken into
// style features – colour families, garment types, patterns, fits, colour
// scheme and top+bottom pairings. A feature becomes a learned preference once
// it appears in at least TWO chosen outfits (and is chosen more than rejected).
// Features rejected at least twice become soft dislikes. Learned preferences
// only nudge scores; the user's explicit settings always win, and the user
// can dismiss anything we learned.

import { evaluateHarmony, hexToHsl } from "./color";
import { resolveOccasion } from "./occasions";
import { artKindFor } from "../samples/garments";
import type { OutfitLog, StyleProfile, WardrobeItem } from "../types";

export const MIN_OCCURRENCES = 2;
const MAX_WEIGHT = 0.12;

export type LearnedKind = "color" | "type" | "pattern" | "fit" | "scheme" | "pair" | "combo" | "colors";

/** The garment fields learning needs – real wardrobe items, quiz looks and inspiration photos all fit. */
export type StylePiece = Pick<WardrobeItem, "category" | "subcategory" | "color_hex" | "pattern" | "fit">;

/** An outfit the user liked (or rejected), from any source. */
export interface StyleEvent {
  pieces: StylePiece[];
  positive: boolean;
  /** occasion key ("office", "party" …) when known */
  occasion: string | null;
  source: "worn" | "rejected" | "quiz" | "inspiration";
}

export interface LearnedPreference {
  key: string; // e.g. "color:navy"
  kind: LearnedKind;
  label: string; // "Navy pieces"
  liked: boolean;
  count: number; // outfits supporting it
  weight: number; // signed score nudge
  /** occasion key when learned for one occasion only, null = everywhere */
  occasion: string | null;
}

export interface SwipeEvent {
  item_ids: string[];
  decision: "accept" | "reject";
  at: string;
  occasion?: string;
}

/** Human colour family for a hex, e.g. "navy", "earth tones", "white". */
export function colorFamily(hex: string): string {
  const { h, s, l } = hexToHsl(hex);
  if (l > 0.9) return "white";
  if (l < 0.13) return "black";
  if (s < 0.15) return l > 0.6 ? "light grey" : "charcoal & grey";
  if (h >= 200 && h <= 250 && l < 0.4) return "navy";
  if (h >= 20 && h <= 50 && s < 0.55 && l > 0.5) return "beige & camel";
  if (h >= 10 && h <= 45 && l < 0.5) return "brown";
  if (h >= 60 && h <= 100 && l < 0.45) return "olive";
  if (h < 15 || h >= 345) return l < 0.35 ? "burgundy" : "red";
  if (h < 45) return "orange & rust";
  if (h < 70) return "yellow & mustard";
  if (h < 170) return "green";
  if (h < 200) return "teal";
  if (h < 260) return "blue";
  if (h < 300) return "purple";
  return "pink";
}

const normalizeType = (s: string) =>
  s
    .toLowerCase()
    .replace(/\b(white|black|navy|grey|gray|blue|brown|khaki|charcoal|olive|burgundy|camel|pink|red|green|dark|light|wash)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

const plural = (s: string) => (/(s|sh|ch|x)$/.test(s) ? s : s.endsWith("y") && !/[aeiou]y$/.test(s) ? s.slice(0, -1) + "ies" : s + "s");
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Style features of one outfit (clothing pieces only; accessories don't define a style). */
const COMBO_LABEL: Record<string, string> = {
  tee: "tees", tank: "tanks", shirt: "shirts", blouse: "blouses", knit: "knits", hoodie: "hoodies",
  jeans: "jeans", trousers: "trousers", shorts: "shorts", skirt: "skirts",
};

export function outfitFeatures(pieces: StylePiece[]): { key: string; kind: LearnedKind; label: string }[] {
  const clothes = pieces.filter((p) => p.category !== "accessory");
  const out = new Map<string, { key: string; kind: LearnedKind; label: string }>();
  const add = (kind: LearnedKind, id: string, label: string) => out.set(`${kind}:${id}`, { key: `${kind}:${id}`, kind, label });

  for (const p of clothes) {
    const fam = colorFamily(p.color_hex);
    add("color", fam, `${cap(fam)} pieces`);
    const t = normalizeType(p.subcategory);
    if (t) add("type", `${p.category}:${t}`, cap(plural(t)));
    if (p.pattern !== "solid") add("pattern", p.pattern, cap(p.pattern.replace(/_/g, " ")));
    if (p.category !== "footwear" && p.fit !== "regular") add("fit", p.fit, `${cap(p.fit)} fits`);
  }
  const scheme = evaluateHarmony(clothes.map((p) => p.color_hex)).scheme;
  const schemeLabel: Record<string, string> = {
    neutral: "All-neutral looks",
    neutral_plus_accent: "Neutrals with one accent colour",
    monochromatic: "Tonal, one-colour looks",
    analogous: "Blended neighbouring colours",
    complementary: "Bold contrasting colours",
  };
  if (schemeLabel[scheme]) add("scheme", scheme, schemeLabel[scheme]);
  const top = clothes.find((p) => p.category === "top");
  const bottom = clothes.find((p) => p.category === "bottom");
  if (top && bottom) {
    const a = normalizeType(top.subcategory);
    const b = normalizeType(bottom.subcategory);
    if (a && b) add("pair", `${a}+${b}`, `${cap(a)} with ${b}`);
    // broader signals that transfer between wardrobes: garment combination + colour pairing
    const ka = artKindFor(top.category, top.subcategory);
    const kb = artKindFor(bottom.category, bottom.subcategory);
    if (COMBO_LABEL[ka] && COMBO_LABEL[kb]) add("combo", `${ka}+${kb}`, `${cap(COMBO_LABEL[ka])} with ${COMBO_LABEL[kb]}`);
    const fa = colorFamily(top.color_hex);
    const fb = colorFamily(bottom.color_hex);
    add("colors", `${fa}+${fb}`, fa === fb ? `Tonal ${fa} looks` : `${cap(fa)} tops with ${fb} bottoms`);
  }
  return [...out.values()];
}

/** Occasion key for a logged/free-text occasion ("Business casual / Office" → "office"). */
export function occasionKey(text: string | null | undefined): string | null {
  if (!text) return null;
  const k = resolveOccasion(text).key;
  return k === "custom" ? null : k;
}

/**
 * Learn preferences from every signal we have:
 *  - outfits worn (logs; rated ≤2 counts against), rejected swipes,
 *  - looks liked in the style quiz, and inspiration photos the user saved.
 * A feature becomes a preference after MIN_OCCURRENCES positive outfits – both
 * overall and per occasion (so office taste stays an office preference).
 */
export function learnPreferences(args: {
  logs: OutfitLog[];
  swipes: SwipeEvent[];
  items: WardrobeItem[];
  style?: StyleProfile | null;
  extra?: StyleEvent[];
}): LearnedPreference[] {
  const byId = new Map(args.items.map((i) => [i.id, i]));
  const dismissed = new Set(args.style?.dismissed_learned ?? []);
  const stats = new Map<string, { kind: LearnedKind; label: string; occasion: string | null; pos: number; neg: number }>();

  const events: StyleEvent[] = [
    ...args.logs.map((l) => ({
      pieces: l.item_ids.map((id) => byId.get(id)).filter((i): i is WardrobeItem => !!i),
      positive: l.feedback === null || l.feedback >= 3,
      occasion: occasionKey(l.occasion),
      source: "worn" as const,
    })),
    ...args.swipes
      .filter((s) => s.decision === "reject")
      .map((s) => ({
        pieces: s.item_ids.map((id) => byId.get(id)).filter((i): i is WardrobeItem => !!i),
        positive: false,
        occasion: occasionKey(s.occasion),
        source: "rejected" as const,
      })),
    ...(args.extra ?? []),
  ];

  for (const e of events) {
    if (e.pieces.length < 2) continue;
    for (const f of outfitFeatures(e.pieces)) {
      for (const occ of e.occasion ? [null, e.occasion] : [null]) {
        const key = occ ? `@${occ}|${f.key}` : f.key;
        const st = stats.get(key) ?? { kind: f.kind, label: f.label, occasion: occ, pos: 0, neg: 0 };
        if (e.positive) st.pos++;
        else st.neg++;
        stats.set(key, st);
      }
    }
  }

  // When all evidence for a feature comes from one occasion, keep it as an occasion-only
  // preference (office taste shouldn't leak into gym outfits) and drop the global copy.
  const scopedOnly = new Set<string>();
  for (const [key, st] of stats) {
    if (!st.occasion) continue;
    const g = stats.get(key.split("|")[1]);
    if (g && g.pos === st.pos && g.neg === st.neg) scopedOnly.add(key.split("|")[1]);
  }

  const learned: LearnedPreference[] = [];
  for (const [key, st] of stats) {
    if (dismissed.has(key) || scopedOnly.has(key)) continue;
    if (st.pos >= MIN_OCCURRENCES && st.pos > st.neg) {
      learned.push({ key, kind: st.kind, label: st.label, liked: true, count: st.pos, weight: Math.min(MAX_WEIGHT, 0.03 * st.pos), occasion: st.occasion });
    } else if (st.neg >= MIN_OCCURRENCES && st.neg > st.pos * 1.5) {
      learned.push({ key, kind: st.kind, label: st.label, liked: false, count: st.neg, weight: -Math.min(MAX_WEIGHT / 2, 0.015 * st.neg), occasion: st.occasion });
    }
  }
  const order: LearnedKind[] = ["colors", "pair", "combo", "type", "color", "scheme", "pattern", "fit"];
  return learned.sort((a, b) => Number(b.liked) - Number(a.liked) || order.indexOf(a.kind) - order.indexOf(b.kind) || b.count - a.count);
}

const KIND_FACTOR: Record<LearnedKind, number> = { colors: 1, pair: 1, combo: 0.6, scheme: 0.5, type: 0.35, color: 0.3, pattern: 0.4, fit: 0.4 };

/** Score nudge for a candidate outfit from learned preferences (bounded). Occasion-specific
 *  preferences only apply to that occasion, and count a little more there. */
export function learnedScore(pieces: StylePiece[], learned: LearnedPreference[], occasion: string | null = null): { delta: number; hits: LearnedPreference[] } {
  if (learned.length === 0) return { delta: 0, hits: [] };
  const map = new Map(learned.map((l) => [l.key, l]));
  const hits: LearnedPreference[] = [];
  for (const f of outfitFeatures(pieces)) {
    const g = map.get(f.key);
    if (g) hits.push(g);
    const o = occasion ? map.get(`@${occasion}|${f.key}`) : undefined;
    if (o) hits.push(o);
  }
  // Whole combinations say more about taste than single items ("navy top + beige bottom" > "chinos")
  const total = hits.reduce((a, h) => a + h.weight * KIND_FACTOR[h.kind] * (h.occasion ? 1.3 : 1), 0);
  // smooth saturation so stronger matches keep ranking higher instead of all hitting a hard cap
  const delta = total >= 0 ? 0.3 * (1 - Math.exp(-total / 0.2)) : Math.max(-0.12, total);
  return { delta, hits: hits.sort((a, b) => KIND_FACTOR[b.kind] * b.weight - KIND_FACTOR[a.kind] * a.weight) };
}

/** Liked colour families, strongest first – used to colour shopping suggestions. */
export function likedColorFamilies(learned: LearnedPreference[]): string[] {
  return [...new Set(learned.filter((l) => l.liked && l.kind === "color").map((l) => l.key.split("color:")[1]))];
}
