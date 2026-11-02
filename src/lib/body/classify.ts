// Body-shape classification from three widths/circumferences.
//
// Two measurement kinds are supported because their ratios differ:
//  - "frontal_width": silhouette widths from a front photo (MediaPipe), in px
//  - "circumference": tape-measure bust/shoulder, waist and hip circumferences
// Thresholds are deliberately conservative; the user can always override.

import type { BodyShape } from "../types";

export interface ShapeInput {
  kind: "frontal_width" | "circumference";
  shoulder: number; // shoulder width, or bust circumference for tape measures
  waist: number;
  hip: number;
}

export interface ShapeResult {
  shape: BodyShape;
  confidence: number; // 0..1
  ratios: { shoulder_to_hip: number; waist_to_hip: number; waist_to_shoulder: number };
  explanation: string;
}

const T = {
  frontal_width: { balance: 0.08, waistDefined: 0.8, oval: 0.95 },
  circumference: { balance: 0.05, waistDefined: 0.75, oval: 0.92 },
};

export function classifyBodyShape(m: ShapeInput): ShapeResult {
  if (m.shoulder <= 0 || m.waist <= 0 || m.hip <= 0) throw new Error("All measurements must be positive");
  const t = T[m.kind];
  const sh = m.shoulder / m.hip;
  const wh = m.waist / m.hip;
  const ws = m.waist / m.shoulder;
  const ratios = { shoulder_to_hip: round(sh), waist_to_hip: round(wh), waist_to_shoulder: round(ws) };
  const widest = Math.max(m.shoulder, m.hip);

  // Oval: waist is as wide as (or wider than) both shoulders and hips
  if (m.waist / widest >= t.oval) {
    return { shape: "oval", ratios, confidence: conf((m.waist / widest - t.oval) / 0.1), explanation: "Your waist measurement is close to or wider than your shoulders and hips." };
  }
  if (sh > 1 + t.balance) {
    return { shape: "inverted_triangle", ratios, confidence: conf((sh - 1 - t.balance) / 0.1), explanation: "Your shoulders are noticeably wider than your hips." };
  }
  if (sh < 1 - t.balance) {
    return { shape: "pear", ratios, confidence: conf((1 - t.balance - sh) / 0.1), explanation: "Your hips are noticeably wider than your shoulders." };
  }
  // Balanced top and bottom: is the waist defined?
  const definition = m.waist / widest;
  if (definition <= t.waistDefined) {
    return { shape: "hourglass", ratios, confidence: conf((t.waistDefined - definition) / 0.08), explanation: "Your shoulders and hips are balanced with a clearly defined waist." };
  }
  return { shape: "rectangle", ratios, confidence: conf((definition - t.waistDefined) / 0.08), explanation: "Your shoulders, waist and hips are fairly aligned." };
}

function round(n: number) {
  return Math.round(n * 1000) / 1000;
}
function conf(x: number) {
  // map distance-from-threshold to 0.5..0.95
  return round(0.5 + 0.45 * Math.max(0, Math.min(1, x)));
}
