// Shared domain types for SmartStylist. These mirror the Supabase schema in
// supabase/migrations and are used by the engine, AI layer and UI.

export const CATEGORIES = ["top", "bottom", "one_piece", "footwear", "outerwear", "accessory"] as const;
export type Category = (typeof CATEGORIES)[number];

export const PATTERNS = [
  "solid",
  "vertical_stripes",
  "horizontal_stripes",
  "check",
  "floral",
  "graphic",
  "polka_dot",
  "animal",
  "abstract",
  "other",
] as const;
export type Pattern = (typeof PATTERNS)[number];

export const FABRIC_WEIGHTS = ["light", "medium", "heavy"] as const;
export type FabricWeight = (typeof FABRIC_WEIGHTS)[number];

export const SLEEVES = ["sleeveless", "short_sleeve", "three_quarter", "long_sleeve", "none"] as const;
export type SleeveLength = (typeof SLEEVES)[number];

export const FITS = ["slim", "regular", "relaxed", "oversized"] as const;
export type Fit = (typeof FITS)[number];

export const LENGTHS = ["cropped", "regular", "longline"] as const;
export type GarmentLength = (typeof LENGTHS)[number];

export const SEASONS = ["spring", "summer", "autumn", "winter"] as const;
export type Season = (typeof SEASONS)[number];

export const BODY_SHAPES = ["hourglass", "rectangle", "inverted_triangle", "pear", "oval"] as const;
export type BodyShape = (typeof BODY_SHAPES)[number];

export const BODY_SHAPE_LABELS: Record<BodyShape, string> = {
  hourglass: "Hourglass",
  rectangle: "Rectangle",
  inverted_triangle: "Inverted Triangle",
  pear: "Triangle",
  oval: "Oval / Apple",
};

/** Attributes extracted by the vision model (and editable by the user). */
export interface GarmentAttributes {
  category: Category;
  subcategory: string;
  color_hex: string; // "#1E3A8A"
  color_name: string; // "Navy Blue"
  secondary_colors: string[]; // hex values
  pattern: Pattern;
  fabric_type: string; // "linen", "denim", "wool" ...
  fabric_weight: FabricWeight;
  sleeve_length: SleeveLength;
  fit: Fit;
  length: GarmentLength;
  formality: number; // 1 (gym/pajamas) .. 10 (black tie)
  seasonality: Season[];
  waterproof: boolean;
}

export interface WardrobeItem extends GarmentAttributes {
  id: string;
  user_id: string;
  image_url: string | null; // signed / data URL ready for <img>
  image_path: string | null; // storage path
  wear_count: number;
  last_worn_at: string | null;
  in_laundry_since: string | null;
  created_at: string;
}

/**
 * User comfort overrides. `null` means "no opinion – use the body-type baseline".
 * `true`/`false` are hard constraints that ALWAYS beat baseline rules.
 */
export interface FitPreferences {
  allow_slim_fit: boolean | null;
  allow_oversized: boolean | null;
  allow_cropped_tops: boolean | null;
  allow_horizontal_stripes: boolean | null;
  allow_bold_patterns: boolean | null;
  preferred_sleeves: SleeveLength[]; // empty = any
  avoid_colors: string[]; // hex values the user never wants
  avoid_patterns: Pattern[];
  disabled_rules: string[]; // baseline rule ids the user switched off
  prefer_long_sleeves: boolean; // soft preference (score bonus), not a filter
  notes: string; // free-text comfort notes passed to the stylist LLM
}

export const DEFAULT_FIT_PREFERENCES: FitPreferences = {
  allow_slim_fit: null,
  allow_oversized: null,
  allow_cropped_tops: null,
  allow_horizontal_stripes: null,
  allow_bold_patterns: null,
  preferred_sleeves: [],
  avoid_colors: [],
  avoid_patterns: [],
  disabled_rules: [],
  prefer_long_sleeves: false,
  notes: "",
};

export type Department = "womens" | "mens" | "unisex";

/** Clothing sizes, used to narrow shopping searches. All optional. */
export interface Sizes {
  top: string | null; // "XS".."XXL" or numeric
  bottom_waist: number | null; // inches
  bottom_inseam: number | null; // inches
  dress: string | null; // "8", "M" ...
  shoe: string | null; // "10", "42" ...
  shoe_system: "US" | "UK" | "EU";
}

export const DEFAULT_SIZES: Sizes = { top: null, bottom_waist: null, bottom_inseam: null, dress: null, shoe: null, shoe_system: "US" };

export interface Budget {
  max_per_item: number;
  currency: string;
}

/** Tape measurements the user types in. Body shape is derived from bust/waist/hip. */
export interface BodyMetrics {
  method: "manual_circumference";
  unit: "cm" | "in";
  bust: number; // bust / chest circumference
  waist: number;
  hip: number;
  bust_to_hip: number;
  waist_to_hip: number;
  confidence: number; // 0..1
  measured_at: string;
}

export const ARCHETYPES = ["classic", "minimal", "smart_casual", "streetwear", "sporty", "bohemian", "romantic", "edgy"] as const;
export type Archetype = (typeof ARCHETYPES)[number];

export const ARCHETYPE_LABELS: Record<Archetype, string> = {
  classic: "Classic",
  minimal: "Minimal",
  smart_casual: "Smart Casual",
  streetwear: "Streetwear",
  sporty: "Sporty",
  bohemian: "Bohemian",
  romantic: "Romantic",
  edgy: "Edgy",
};

export type Palette = "neutral" | "earthy" | "dark" | "bright" | "pastel";

/** Result of the style quiz + things the user chose to forget. */
export interface StyleProfile {
  archetypes: Partial<Record<Archetype, number>>; // 0..1 affinity
  palettes: Partial<Record<Palette, number>>; // 0..1 affinity
  liked_looks: string[];
  disliked_looks: string[];
  completed_at: string | null;
  /** learned-preference keys the user removed ("color:navy", ...) */
  dismissed_learned: string[];
  /** runtime only (never stored): liked colour families learned from history */
  learned_colors?: string[];
}

export const EMPTY_STYLE_PROFILE: StyleProfile = { archetypes: {}, palettes: {}, liked_looks: [], disliked_looks: [], completed_at: null, dismissed_learned: [] };

export interface Profile {
  id: string;
  display_name: string | null;
  body_shape: BodyShape | null;
  body_shape_source: "detected" | "manual" | null;
  body_metrics: BodyMetrics | null;
  fit_preferences: FitPreferences;
  budget: Budget;
  department: Department;
  sizes: Sizes;
  style_profile: StyleProfile;
}

export interface Weather {
  temp_c: number;
  feels_like_c: number;
  humidity: number; // %
  rain_probability: number; // 0..1 over the next ~12h
  wind_kph: number | null;
  condition: string; // "Clear", "Rain" ...
  location_name: string | null;
  latitude: number | null;
  source: "openweathermap" | "manual" | "default";
}

export interface OutfitLog {
  id: string;
  user_id: string;
  occasion: string;
  item_ids: string[];
  weather: Weather | null;
  stylist_note: string | null;
  feedback: number | null;
  worn_on: string; // date
  created_at: string;
}
