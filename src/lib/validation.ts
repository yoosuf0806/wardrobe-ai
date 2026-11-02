import { z } from "zod";
import { BODY_SHAPES, CATEGORIES, FABRIC_WEIGHTS, FITS, LENGTHS, PATTERNS, SEASONS, SLEEVES } from "./types";

export const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const GarmentAttributesSchema = z.object({
  category: z.enum(CATEGORIES),
  subcategory: z.string().max(50),
  color_hex: hex,
  color_name: z.string().max(50),
  secondary_colors: z.array(hex).max(3).default([]),
  pattern: z.enum(PATTERNS),
  fabric_type: z.string().max(50),
  fabric_weight: z.enum(FABRIC_WEIGHTS),
  sleeve_length: z.enum(SLEEVES),
  fit: z.enum(FITS),
  length: z.enum(LENGTHS),
  formality: z.number().int().min(1).max(10),
  seasonality: z.array(z.enum(SEASONS)),
  waterproof: z.boolean().default(false),
});

const nullableBool = z.boolean().nullable();

export const FitPreferencesSchema = z.object({
  allow_slim_fit: nullableBool,
  allow_oversized: nullableBool,
  allow_cropped_tops: nullableBool,
  allow_horizontal_stripes: nullableBool,
  allow_bold_patterns: nullableBool,
  preferred_sleeves: z.array(z.enum(SLEEVES)),
  avoid_colors: z.array(hex).max(20),
  avoid_patterns: z.array(z.enum(PATTERNS)),
  disabled_rules: z.array(z.string().max(60)).max(50),
  prefer_long_sleeves: z.boolean().default(false),
  notes: z.string().max(500),
});

export const ProfilePatchSchema = z
  .object({
    display_name: z.string().max(80).nullable(),
    body_shape: z.enum(BODY_SHAPES).nullable(),
    body_shape_source: z.enum(["detected", "manual"]).nullable(),
    body_metrics: z
      .object({
        method: z.literal("manual_circumference"),
        unit: z.enum(["cm", "in"]),
        bust: z.number().positive().max(300),
        waist: z.number().positive().max(300),
        hip: z.number().positive().max(300),
        bust_to_hip: z.number(),
        waist_to_hip: z.number(),
        confidence: z.number().min(0).max(1),
        measured_at: z.string(),
      })
      .nullable(),
    fit_preferences: FitPreferencesSchema,
    budget: z.object({ max_per_item: z.number().positive().max(100000), currency: z.string().length(3) }),
    department: z.enum(["womens", "mens", "unisex"]),
    style_profile: z.object({
      archetypes: z.record(z.string(), z.number().min(0).max(1)),
      palettes: z.record(z.string(), z.number().min(0).max(1)),
      liked_looks: z.array(z.string().max(40)).max(100),
      disliked_looks: z.array(z.string().max(40)).max(100),
      completed_at: z.string().nullable(),
      dismissed_learned: z.array(z.string().max(120)).max(200),
    }),
    sizes: z.object({
      top: z.string().max(10).nullable(),
      bottom_waist: z.number().min(20).max(60).nullable(),
      bottom_inseam: z.number().min(20).max(40).nullable(),
      dress: z.string().max(10).nullable(),
      shoe: z.string().max(6).nullable(),
      shoe_system: z.enum(["US", "UK", "EU"]),
    }),
  })
  .partial();

export const RecommendRequestSchema = z.object({
  occasion: z.string().min(1).max(120),
  formality: z.number().min(1).max(10).nullable().optional(),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lon: z.number().min(-180).max(180).nullable().optional(),
  manual_temp_c: z.number().min(-40).max(55).nullable().optional(),
  manual_rain: z.boolean().optional(),
  /** items the user marked unavailable this session (on top of laundry) */
  exclude_item_ids: z.array(z.string().uuid()).max(200).optional(),
  /** items from outfits the user swiped away – avoided when possible */
  avoid_item_ids: z.array(z.string().uuid()).max(200).optional(),
  /** outfit ids already shown this session */
  exclude_outfit_ids: z.array(z.string().max(300)).max(100).optional(),
});

export const GapSchema = z.object({
  trigger: z.enum(["incomplete_match", "formality_ceiling", "weather", "wear_frequency", "laundry_backup", "thin_inventory"]),
  occasion: z.string().max(120),
  urgency: z.number().min(0).max(1),
  headline: z.string().max(120).default(""),
  message: z.string().max(600),
  spec: z.object({
    category: z.enum(CATEGORIES),
    subcategory: z.string().max(80),
    color_hex: hex,
    color_name: z.string().max(40),
    formality: z.number().min(1).max(10),
    max_price: z.number().positive(),
    currency: z.string().length(3),
    department: z.enum(["womens", "mens", "unisex"]),
    avoid_fits: z.array(z.enum(FITS)),
    waterproof: z.boolean().optional(),
    size: z.string().max(30).nullable().default(null),
    query: z.string().min(2).max(120),
  }),
});
