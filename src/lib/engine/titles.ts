// Deterministic, evocative look names for when the LLM stylist isn't available
// ("Quiet Authority", "Weekend Ease" ...). Stable for the same outfit.

import type { HarmonyScheme } from "./color";

const BY_BAND: Record<"sport" | "casual" | "smart" | "formal", string[]> = {
  sport: ["Ready to Move", "Training Day", "Easy Energy", "Warm-Up Mode"],
  casual: ["Weekend Ease", "Off-Duty Edit", "Easy Layers", "Sunday Uniform", "Relaxed Rhythm"],
  smart: ["Quiet Authority", "Effortless Polish", "Sharp Neutrals", "Modern Classic", "Considered Ease"],
  formal: ["After Dark", "Evening Formal", "Black-Tie Ready", "Grand Entrance"],
};
const BY_SCHEME: Partial<Record<HarmonyScheme, string[]>> = {
  monochromatic: ["Tonal Column", "One-Note Elegance"],
  analogous: ["Soft Gradient", "Warm Harmony"],
  complementary: ["Bold Contrast", "Colour Play"],
  neutral_plus_accent: ["Accent Moment", "Pop of Colour"],
};

export function lookTitle(id: string, formality: number, scheme: HarmonyScheme): string {
  const band = formality <= 2.5 ? "sport" : formality <= 5 ? "casual" : formality < 8 ? "smart" : "formal";
  const hash = [...id].reduce((a, c) => (a * 33 + c.charCodeAt(0)) >>> 0, 5381);
  const pool = [...BY_BAND[band], ...(band === "smart" || band === "casual" ? BY_SCHEME[scheme] ?? [] : [])];
  return pool[hash % pool.length];
}
