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
  notes: z.string().max(500),
});

export const ProfilePatchSchema = z
  .object({
    display_name: z.string().max(80).nullable(),
    body_shape: z.enum(BODY_SHAPES).nullable(),
    body_shape_source: z.enum(["detected", "manual"]).nullable(),
    body_metrics: z
      .object({
        method: z.enum(["mediapipe_frontal", "manual_circumference"]),
        shoulder: z.number().positive(),
        waist: z.number().positive(),
        hip: z.number().positive(),
        shoulder_to_hip: z.number(),
        waist_to_hip: z.number(),
        waist_to_shoulder: z.number(),
        torso_to_leg: z.number().optional(),
        confidence: z.number().min(0).max(1),
        measured_at: z.string(),
      })
      .nullable(),
    fit_preferences: FitPreferencesSchema,
    budget: z.object({ max_per_item: z.number().positive().max(100000), currency: z.string().length(3) }),
    department: z.enum(["womens", "mens", "unisex"]),
  })
  .partial();

export const RecommendRequestSchema = z.object({
  occasion: z.string().min(1).max(120),
  formality: z.number().min(1).max(10).nullable().optional(),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lon: z.number().min(-180).max(180).nullable().optional(),
  manual_temp_c: z.number().min(-40).max(55).nullable().optional(),
  manual_rain: z.boolean().optional(),
});

export const GapSchema = z.object({
  trigger: z.enum(["incomplete_match", "formality_ceiling", "weather", "wear_frequency"]),
  occasion: z.string().max(120),
  urgency: z.number().min(0).max(1),
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
    query: z.string().min(2).max(120),
  }),
});
