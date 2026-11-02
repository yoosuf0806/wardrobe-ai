// Sample wardrobe used by DEMO mode and the test-suite.
import { DEFAULT_FIT_PREFERENCES, DEFAULT_SIZES, EMPTY_STYLE_PROFILE, type GarmentAttributes, type OutfitLog, type Profile, type WardrobeItem } from "../types";

type SeedItem = Omit<GarmentAttributes, "secondary_colors" | "waterproof"> & Partial<Pick<GarmentAttributes, "secondary_colors" | "waterproof">>;

const SEED: SeedItem[] = [
  { category: "top", subcategory: "white oxford shirt", color_hex: "#F4F4F0", color_name: "White", pattern: "solid", fabric_type: "cotton", fabric_weight: "light", sleeve_length: "long_sleeve", fit: "regular", length: "regular", formality: 6, seasonality: ["spring", "summer", "autumn"] },
  { category: "top", subcategory: "navy linen shirt", color_hex: "#1E3A8A", color_name: "Navy Blue", pattern: "solid", fabric_type: "linen", fabric_weight: "light", sleeve_length: "short_sleeve", fit: "relaxed", length: "regular", formality: 5, seasonality: ["summer", "spring"] },
  { category: "top", subcategory: "breton striped tee", color_hex: "#F2F2F2", color_name: "White/Navy stripe", pattern: "horizontal_stripes", fabric_type: "cotton", fabric_weight: "light", sleeve_length: "long_sleeve", fit: "slim", length: "regular", formality: 4, seasonality: ["spring", "summer", "autumn"], secondary_colors: ["#1F2A44"] },
  { category: "top", subcategory: "grey crew-neck t-shirt", color_hex: "#9CA3AF", color_name: "Heather Grey", pattern: "solid", fabric_type: "cotton", fabric_weight: "light", sleeve_length: "short_sleeve", fit: "regular", length: "regular", formality: 3, seasonality: ["spring", "summer", "autumn"] },
  { category: "top", subcategory: "burgundy merino sweater", color_hex: "#7F1D1D", color_name: "Burgundy", pattern: "solid", fabric_type: "merino wool", fabric_weight: "medium", sleeve_length: "long_sleeve", fit: "regular", length: "regular", formality: 5, seasonality: ["autumn", "winter"] },
  { category: "top", subcategory: "cropped knit top", color_hex: "#F9A8D4", color_name: "Blush Pink", pattern: "solid", fabric_type: "viscose", fabric_weight: "light", sleeve_length: "short_sleeve", fit: "slim", length: "cropped", formality: 4, seasonality: ["summer"] },
  { category: "bottom", subcategory: "dark wash jeans", color_hex: "#1F3A5F", color_name: "Dark Indigo", pattern: "solid", fabric_type: "denim", fabric_weight: "medium", sleeve_length: "none", fit: "regular", length: "regular", formality: 4, seasonality: ["spring", "autumn", "winter", "summer"] },
  { category: "bottom", subcategory: "khaki chinos", color_hex: "#C3B091", color_name: "Khaki", pattern: "solid", fabric_type: "cotton twill", fabric_weight: "medium", sleeve_length: "none", fit: "regular", length: "regular", formality: 5, seasonality: ["spring", "summer", "autumn"] },
  { category: "bottom", subcategory: "charcoal wool trousers", color_hex: "#36454F", color_name: "Charcoal", pattern: "solid", fabric_type: "wool", fabric_weight: "heavy", sleeve_length: "none", fit: "slim", length: "regular", formality: 7, seasonality: ["autumn", "winter"] },
  { category: "bottom", subcategory: "black joggers", color_hex: "#111111", color_name: "Black", pattern: "solid", fabric_type: "cotton jersey", fabric_weight: "medium", sleeve_length: "none", fit: "relaxed", length: "regular", formality: 2, seasonality: ["spring", "autumn", "winter"] },
  { category: "one_piece", subcategory: "olive midi shirt dress", color_hex: "#556B2F", color_name: "Olive", pattern: "solid", fabric_type: "tencel", fabric_weight: "light", sleeve_length: "short_sleeve", fit: "regular", length: "longline", formality: 5, seasonality: ["spring", "summer"] },
  { category: "footwear", subcategory: "white leather sneakers", color_hex: "#FAFAFA", color_name: "White", pattern: "solid", fabric_type: "leather", fabric_weight: "medium", sleeve_length: "none", fit: "regular", length: "regular", formality: 4, seasonality: ["spring", "summer", "autumn"] },
  { category: "footwear", subcategory: "brown suede loafers", color_hex: "#8B5A2B", color_name: "Tobacco Brown", pattern: "solid", fabric_type: "suede", fabric_weight: "medium", sleeve_length: "none", fit: "regular", length: "regular", formality: 6, seasonality: ["spring", "summer", "autumn"] },
  { category: "footwear", subcategory: "running shoes", color_hex: "#2563EB", color_name: "Cobalt", pattern: "solid", fabric_type: "mesh", fabric_weight: "light", sleeve_length: "none", fit: "regular", length: "regular", formality: 1, seasonality: ["spring", "summer", "autumn", "winter"] },
  { category: "outerwear", subcategory: "camel wool overcoat", color_hex: "#C19A6B", color_name: "Camel", pattern: "solid", fabric_type: "wool", fabric_weight: "heavy", sleeve_length: "long_sleeve", fit: "regular", length: "longline", formality: 7, seasonality: ["autumn", "winter"] },
  { category: "accessory", subcategory: "brown leather belt", color_hex: "#5C3A1E", color_name: "Dark Brown", pattern: "solid", fabric_type: "leather", fabric_weight: "medium", sleeve_length: "none", fit: "regular", length: "regular", formality: 6, seasonality: ["spring", "summer", "autumn", "winter"] },
  { category: "accessory", subcategory: "silver watch", color_hex: "#C0C0C0", color_name: "Silver", pattern: "solid", fabric_type: "steel", fabric_weight: "light", sleeve_length: "none", fit: "regular", length: "regular", formality: 7, seasonality: ["spring", "summer", "autumn", "winter"] },
  { category: "accessory", subcategory: "grey wool scarf", color_hex: "#6B7280", color_name: "Grey", pattern: "solid", fabric_type: "wool", fabric_weight: "medium", sleeve_length: "none", fit: "regular", length: "regular", formality: 5, seasonality: ["autumn", "winter"] },
  { category: "outerwear", subcategory: "denim jacket", color_hex: "#5B7DB1", color_name: "Mid Blue", pattern: "solid", fabric_type: "denim", fabric_weight: "medium", sleeve_length: "long_sleeve", fit: "regular", length: "regular", formality: 3, seasonality: ["spring", "autumn"] },
  { category: "top", subcategory: "performance tank", color_hex: "#2B2B2B", color_name: "Charcoal", pattern: "solid", fabric_type: "polyester", fabric_weight: "light", sleeve_length: "sleeveless", fit: "regular", length: "regular", formality: 1, seasonality: ["spring", "summer", "autumn", "winter"] },
  { category: "bottom", subcategory: "training shorts", color_hex: "#151515", color_name: "Black", pattern: "solid", fabric_type: "polyester", fabric_weight: "light", sleeve_length: "none", fit: "regular", length: "regular", formality: 1, seasonality: ["spring", "summer", "autumn", "winter"] },
];

export const DEMO_USER_ID = "00000000-0000-4000-8000-000000000001";


export function seedItems(userId = DEMO_USER_ID, now = new Date()): WardrobeItem[] {
  return SEED.map((s, i) => ({
    secondary_colors: [],
    waterproof: false,
    ...s,
    id: `00000000-0000-4000-9000-${String(i + 1).padStart(12, "0")}`,
    user_id: userId,
    image_url: null, // rendered as garment art in the UI
    image_path: null,
    wear_count: 0,
    last_worn_at: null,
    in_laundry_since: null,
    created_at: new Date(now.getTime() - (SEED.length - i) * 86_400_000).toISOString(),
  }));
}

export function seedProfile(userId = DEMO_USER_ID): Profile {
  return {
    id: userId,
    display_name: "Demo",
    body_shape: "inverted_triangle",
    body_shape_source: "detected",
    body_metrics: { method: "manual_circumference", unit: "cm", bust: 104, waist: 82, hip: 92, bust_to_hip: 1.13, waist_to_hip: 0.891, confidence: 0.86, measured_at: "2026-11-01T00:00:00.000Z" },
    fit_preferences: { ...DEFAULT_FIT_PREFERENCES },
    budget: { max_per_item: 15000, currency: "LKR" },
    department: "unisex",
    sizes: { ...DEFAULT_SIZES, top: "M", bottom_waist: 32, bottom_inseam: 30, shoe: "10" },
    style_profile: { ...EMPTY_STYLE_PROFILE },
  };
}

/** A few office days that keep rotating the same shirt – triggers the wear-frequency gap. */
export function seedLogs(items: WardrobeItem[], userId = DEMO_USER_ID, now = new Date()): OutfitLog[] {
  const shirt = items[0].id;
  const chinos = items[7].id;
  const loafers = items[12].id;
  return [2, 5, 9, 12, 16].map((d, i) => {
    const day = new Date(now.getTime() - d * 86_400_000);
    return {
      id: `00000000-0000-4000-a000-${String(i + 1).padStart(12, "0")}`,
      user_id: userId,
      occasion: "Business casual / Office",
      item_ids: [shirt, chinos, loafers],
      weather: null,
      stylist_note: null,
      feedback: null,
      worn_on: day.toISOString().slice(0, 10),
      created_at: day.toISOString(),
    };
  });
}
