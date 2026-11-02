// Body-shape baseline styling rules + the user override layer.
//
// Precedence (highest first):
//   1. User hard constraints  (pref === false, avoid lists, preferred sleeves) -> item is filtered out
//   2. User permissions       (pref === true, disabled_rules)                 -> matching baseline rules are switched off
//   3. Baseline body-type rules                                               -> soft score nudges only, never filters

import { hexToHsl, hueDistance, lightness } from "./color";
import type { BodyShape, FitPreferences, Pattern, WardrobeItem } from "../types";

const BOLD_PATTERNS: Pattern[] = ["floral", "graphic", "animal", "polka_dot", "abstract", "check", "horizontal_stripes"];
const isPatterned = (i: WardrobeItem) => i.pattern !== "solid";
const isUpper = (i: WardrobeItem) => i.category === "top" || i.category === "outerwear";

type PrefKey = "allow_slim_fit" | "allow_oversized" | "allow_cropped_tops" | "allow_horizontal_stripes" | "allow_bold_patterns";

export interface ItemRule {
  id: string;
  shapes: BodyShape[];
  description: string;
  applies: (i: WardrobeItem) => boolean;
  weight: number; // + prefer, - avoid
  /** If the user explicitly sets this preference to `true`, the rule is disabled. */
  overriddenBy?: PrefKey;
}

export interface OutfitRule {
  id: string;
  shapes: BodyShape[];
  description: string;
  /** returns weight to apply (0 when not applicable) */
  evaluate: (o: { upper: WardrobeItem[]; lower: WardrobeItem[]; onePiece: WardrobeItem | null; outerwear: WardrobeItem | null }) => number;
}

export const ITEM_RULES: ItemRule[] = [
  // Pear: draw the eye up, keep the lower half streamlined
  { id: "pear_detail_on_top", shapes: ["pear"], description: "Patterns and detail on top draw the eye upward", applies: (i) => i.category === "top" && isPatterned(i), weight: 0.15 },
  { id: "pear_plain_bottoms", shapes: ["pear"], description: "Bold patterns on the hips add width below", applies: (i) => i.category === "bottom" && BOLD_PATTERNS.includes(i.pattern), weight: -0.25, overriddenBy: "allow_bold_patterns" },
  { id: "pear_no_slim_bottoms", shapes: ["pear"], description: "Very slim bottoms emphasise hip-to-shoulder contrast", applies: (i) => i.category === "bottom" && i.fit === "slim", weight: -0.1, overriddenBy: "allow_slim_fit" },

  // Inverted triangle: soften shoulders, add volume below
  { id: "invtri_plain_tops", shapes: ["inverted_triangle"], description: "Bold or horizontal patterns on top widen the shoulders", applies: (i) => isUpper(i) && BOLD_PATTERNS.includes(i.pattern), weight: -0.25, overriddenBy: "allow_bold_patterns" },
  { id: "invtri_volume_below", shapes: ["inverted_triangle"], description: "Relaxed or patterned bottoms balance broad shoulders", applies: (i) => i.category === "bottom" && (i.fit === "relaxed" || isPatterned(i)), weight: 0.15 },

  // Oval / apple: vertical lines, skim rather than cling, avoid cutting the torso
  { id: "oval_no_horizontal", shapes: ["oval"], description: "Horizontal stripes widen the midsection", applies: (i) => i.pattern === "horizontal_stripes", weight: -0.3, overriddenBy: "allow_horizontal_stripes" },
  { id: "oval_vertical_lines", shapes: ["oval"], description: "Vertical stripes elongate the torso", applies: (i) => i.pattern === "vertical_stripes", weight: 0.2 },
  { id: "oval_no_slim_tops", shapes: ["oval"], description: "Slim-fit tops cling at the midsection", applies: (i) => isUpper(i) && i.fit === "slim", weight: -0.25, overriddenBy: "allow_slim_fit" },
  { id: "oval_no_cropped", shapes: ["oval"], description: "Cropped tops cut the torso at its widest point", applies: (i) => i.category === "top" && i.length === "cropped", weight: -0.3, overriddenBy: "allow_cropped_tops" },
  { id: "oval_longline_layers", shapes: ["oval"], description: "Longline layers create a vertical column", applies: (i) => i.category === "outerwear" && i.length === "longline", weight: 0.2 },

  // Rectangle: create shape and dimension
  { id: "rect_layers", shapes: ["rectangle"], description: "Layering adds dimension to a straight frame", applies: (i) => i.category === "outerwear", weight: 0.1 },
  { id: "rect_cropped_ok", shapes: ["rectangle"], description: "Cropped tops create the illusion of a waist", applies: (i) => i.category === "top" && i.length === "cropped", weight: 0.1 },

  // Hourglass: follow the natural waist, avoid boxy volume
  { id: "hourglass_no_oversized", shapes: ["hourglass"], description: "Oversized, boxy cuts hide the waist", applies: (i) => (isUpper(i) || i.category === "one_piece") && i.fit === "oversized", weight: -0.25, overriddenBy: "allow_oversized" },
  { id: "hourglass_tailored", shapes: ["hourglass"], description: "Tailored fits follow natural curves", applies: (i) => i.fit === "slim" || i.fit === "regular", weight: 0.1 },
];

export const OUTFIT_RULES: OutfitRule[] = [
  {
    id: "pear_lighter_top",
    shapes: ["pear"],
    description: "A lighter top over a darker bottom balances the hips",
    evaluate: ({ upper, lower }) => (upper[0] && lower[0] ? (lightness(upper[0].color_hex) > lightness(lower[0].color_hex) + 0.1 ? 0.15 : -0.05) : 0),
  },
  {
    id: "invtri_lighter_bottom",
    shapes: ["inverted_triangle"],
    description: "A darker top with lighter or brighter bottoms shifts visual weight down",
    evaluate: ({ upper, lower }) => (upper[0] && lower[0] ? (lightness(lower[0].color_hex) > lightness(upper[0].color_hex) + 0.1 ? 0.15 : 0) : 0),
  },
  {
    id: "oval_column",
    shapes: ["oval"],
    description: "A tonal column of colour from top to bottom elongates the frame",
    evaluate: ({ upper, lower, onePiece }) => {
      if (onePiece) return 0.1;
      if (!upper[0] || !lower[0]) return 0;
      const a = hexToHsl(upper[0].color_hex);
      const b = hexToHsl(lower[0].color_hex);
      return Math.abs(a.l - b.l) < 0.15 && (a.s < 0.2 || hueDistance(a.h, b.h) < 25) ? 0.15 : 0;
    },
  },
  {
    id: "rect_contrast",
    shapes: ["rectangle"],
    description: "Contrast between top and bottom creates a defined waistline",
    evaluate: ({ upper, lower }) => (upper[0] && lower[0] && Math.abs(lightness(upper[0].color_hex) - lightness(lower[0].color_hex)) > 0.25 ? 0.12 : 0),
  },
  {
    id: "hourglass_balanced_volume",
    shapes: ["hourglass"],
    description: "Pairing volume with a fitted piece keeps the waist visible",
    evaluate: ({ upper, lower }) =>
      upper[0] && lower[0] && ["relaxed", "oversized"].includes(upper[0].fit) && ["relaxed", "oversized"].includes(lower[0].fit) ? -0.15 : 0,
  },
];

/** Hard filter from the user's own comfort settings. Returns a reason when rejected. */
export function userReject(item: WardrobeItem, prefs: FitPreferences): string | null {
  if (prefs.allow_slim_fit === false && item.fit === "slim") return "you don't wear slim fits";
  if (prefs.allow_oversized === false && item.fit === "oversized") return "you don't wear oversized fits";
  if (prefs.allow_cropped_tops === false && item.category === "top" && item.length === "cropped") return "you never wear cropped tops";
  if (prefs.allow_horizontal_stripes === false && item.pattern === "horizontal_stripes") return "you avoid horizontal stripes";
  if (prefs.allow_bold_patterns === false && BOLD_PATTERNS.includes(item.pattern)) return "you avoid bold patterns";
  if (prefs.avoid_patterns.includes(item.pattern)) return `you avoid ${item.pattern.replace("_", " ")}`;
  if (
    prefs.preferred_sleeves.length > 0 &&
    (item.category === "top" || item.category === "one_piece") &&
    item.sleeve_length !== "none" &&
    !prefs.preferred_sleeves.includes(item.sleeve_length)
  )
    return "sleeve length outside your preference";
  const c = hexToHsl(item.color_hex);
  for (const avoid of prefs.avoid_colors) {
    const a = hexToHsl(avoid);
    const close = a.s < 0.18 && c.s < 0.18 ? Math.abs(a.l - c.l) < 0.12 : hueDistance(a.h, c.h) < 15 && Math.abs(a.l - c.l) < 0.2;
    if (close) return "a colour you avoid";
  }
  return null;
}

function ruleActive(id: string, overriddenBy: PrefKey | undefined, prefs: FitPreferences): boolean {
  if (prefs.disabled_rules.includes(id)) return false;
  if (overriddenBy && prefs[overriddenBy] === true) return false;
  return true;
}

export interface RuleHit {
  id: string;
  description: string;
  weight: number;
}

export function activeItemRules(shape: BodyShape | null, prefs: FitPreferences): ItemRule[] {
  if (!shape) return [];
  return ITEM_RULES.filter((r) => r.shapes.includes(shape) && ruleActive(r.id, r.overriddenBy, prefs));
}

export function activeOutfitRules(shape: BodyShape | null, prefs: FitPreferences): OutfitRule[] {
  if (!shape) return [];
  return OUTFIT_RULES.filter((r) => r.shapes.includes(shape) && ruleActive(r.id, undefined, prefs));
}

export function itemRuleHits(item: WardrobeItem, rules: ItemRule[]): RuleHit[] {
  return rules.filter((r) => r.applies(item)).map((r) => ({ id: r.id, description: r.description, weight: r.weight }));
}

/** All baseline rules for a shape – used by the settings UI to list toggles. */
export function baselineRulesFor(shape: BodyShape | null) {
  if (!shape) return [];
  return [
    ...ITEM_RULES.filter((r) => r.shapes.includes(shape)).map((r) => ({ id: r.id, description: r.description, weight: r.weight, overriddenBy: r.overriddenBy })),
    ...OUTFIT_RULES.filter((r) => r.shapes.includes(shape)).map((r) => ({ id: r.id, description: r.description, weight: 0, overriddenBy: undefined })),
  ];
}
