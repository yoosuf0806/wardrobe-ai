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
import type { OutfitLog, StyleProfile, WardrobeItem } from "../types";

export const MIN_OCCURRENCES = 2;
const MAX_WEIGHT = 0.12;

export type LearnedKind = "color" | "type" | "pattern" | "fit" | "scheme" | "pair";

export interface LearnedPreference {
  key: string; // e.g. "color:navy"
  kind: LearnedKind;
  label: string; // "Navy pieces"
  liked: boolean;
  count: number; // outfits supporting it
  weight: number; // signed score nudge
}

export interface SwipeEvent {
  item_ids: string[];
  decision: "accept" | "reject";
  at: string;
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
export function outfitFeatures(pieces: WardrobeItem[]): { key: string; kind: LearnedKind; label: string }[] {
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
  }
  return [...out.values()];
}

/**
 * Learn preferences from history. Positive events: worn outfits (logs) unless
 * rated ≤2; negative events: rejected swipes and low-rated outfits.
 */
export function learnPreferences(args: { logs: OutfitLog[]; swipes: SwipeEvent[]; items: WardrobeItem[]; style?: StyleProfile | null }): LearnedPreference[] {
  const byId = new Map(args.items.map((i) => [i.id, i]));
  const dismissed = new Set(args.style?.dismissed_learned ?? []);
  const stats = new Map<string, { kind: LearnedKind; label: string; pos: number; neg: number }>();

  const record = (ids: string[], positive: boolean) => {
    const pieces = ids.map((id) => byId.get(id)).filter((i): i is WardrobeItem => !!i);
    if (pieces.length < 2) return;
    for (const f of outfitFeatures(pieces)) {
      const s = stats.get(f.key) ?? { kind: f.kind, label: f.label, pos: 0, neg: 0 };
      if (positive) s.pos++;
      else s.neg++;
      stats.set(f.key, s);
    }
  };

  for (const l of args.logs) record(l.item_ids, l.feedback === null || l.feedback >= 3);
  for (const s of args.swipes) if (s.decision === "reject") record(s.item_ids, false);

  const learned: LearnedPreference[] = [];
  for (const [key, s] of stats) {
    if (dismissed.has(key)) continue;
    if (s.pos >= MIN_OCCURRENCES && s.pos > s.neg) {
      learned.push({ key, kind: s.kind, label: s.label, liked: true, count: s.pos, weight: Math.min(MAX_WEIGHT, 0.03 * s.pos) });
    } else if (s.neg >= MIN_OCCURRENCES && s.neg > s.pos * 1.5) {
      learned.push({ key, kind: s.kind, label: s.label, liked: false, count: s.neg, weight: -Math.min(MAX_WEIGHT / 2, 0.015 * s.neg) });
    }
  }
  // Specific signals (pairs, types) first, then strongest
  const order: LearnedKind[] = ["pair", "type", "color", "scheme", "pattern", "fit"];
  return learned.sort((a, b) => Number(b.liked) - Number(a.liked) || order.indexOf(a.kind) - order.indexOf(b.kind) || b.count - a.count);
}

/** Score nudge for a candidate outfit from learned preferences (bounded). */
export function learnedScore(pieces: WardrobeItem[], learned: LearnedPreference[]): { delta: number; hits: LearnedPreference[] } {
  if (learned.length === 0) return { delta: 0, hits: [] };
  const map = new Map(learned.map((l) => [l.key, l]));
  const hits = outfitFeatures(pieces)
    .map((f) => map.get(f.key))
    .filter((l): l is LearnedPreference => !!l);
  const delta = Math.max(-0.12, Math.min(0.2, hits.reduce((a, h) => a + h.weight, 0)));
  return { delta, hits };
}

/** Liked colour families, strongest first – used to colour shopping suggestions. */
export function likedColorFamilies(learned: LearnedPreference[]): string[] {
  return learned.filter((l) => l.liked && l.kind === "color").map((l) => l.key.slice("color:".length));
}
