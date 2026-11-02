// Body-shape classification from tape measurements (bust/chest, waist, hip).
// No photos: the user types their measurements in the profile, and can always
// pick a different shape themselves.

import type { BodyShape } from "../types";

export interface Measurements {
  bust: number;
  waist: number;
  hip: number;
}

export interface ShapeResult {
  shape: BodyShape;
  confidence: number; // 0..1
  ratios: { bust_to_hip: number; waist_to_hip: number };
}

const BALANCE = 0.05; // bust vs hip within ±5% counts as balanced
const WAIST_DEFINED = 0.75; // waist ≤ 75% of the larger of bust/hip
const OVAL = 0.92; // waist ≥ 92% of the larger of bust/hip

export function classifyBodyShape(m: Measurements): ShapeResult {
  if (!(m.bust > 0 && m.waist > 0 && m.hip > 0)) throw new Error("Enter bust, waist and hip measurements");
  const bh = m.bust / m.hip;
  const widest = Math.max(m.bust, m.hip);
  const definition = m.waist / widest;
  const ratios = { bust_to_hip: round(bh), waist_to_hip: round(m.waist / m.hip) };

  if (definition >= OVAL) return { shape: "oval", ratios, confidence: conf((definition - OVAL) / 0.1) };
  if (bh > 1 + BALANCE) return { shape: "inverted_triangle", ratios, confidence: conf((bh - 1 - BALANCE) / 0.1) };
  if (bh < 1 - BALANCE) return { shape: "pear", ratios, confidence: conf((1 - BALANCE - bh) / 0.1) };
  if (definition <= WAIST_DEFINED) return { shape: "hourglass", ratios, confidence: conf((WAIST_DEFINED - definition) / 0.08) };
  return { shape: "rectangle", ratios, confidence: conf((definition - WAIST_DEFINED) / 0.08) };
}

/** One-line explanation shown on the profile card. */
export const SHAPE_COPY: Record<BodyShape, string> = {
  hourglass: "Balanced bust and hips with a defined waist. We follow your natural curves with tailored, waist-aware cuts.",
  rectangle: "Shoulders, waist and hips are fairly aligned. We add shape with contrast, layering and defined waistlines.",
  inverted_triangle: "Broader shoulders, narrower hips. We balance with straight-leg bottoms and lighter tones below the waist.",
  pear: "Hips wider than shoulders. We draw the eye up with detail on top and keep bottoms streamlined and darker.",
  oval: "Fuller through the middle. We elongate with vertical lines, tonal columns and longline layers.",
};

function round(n: number) {
  return Math.round(n * 1000) / 1000;
}
function conf(x: number) {
  return round(0.5 + 0.45 * Math.max(0, Math.min(1, x)));
}
