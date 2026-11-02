// Color harmony rules: neutral detection, distinct-color counting and
// classic schemes (monochromatic, analogous, complementary, triadic).

export interface HSL {
  h: number; // 0..360
  s: number; // 0..1
  l: number; // 0..1
}

export function hexToHsl(hex: string): HSL {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return { h: 0, s: 0, l: 0.5 };
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return { h, s, l };
}

export function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/**
 * "Wardrobe neutrals" pair with anything: greys, black, white, plus the classic
 * tailoring neutrals navy, denim, beige/khaki/camel, brown and olive.
 */
export function isNeutral(hex: string): boolean {
  const { h, s, l } = hexToHsl(hex);
  if (s < 0.18 || l < 0.13 || l > 0.92) return true; // greys, black, white
  if (h >= 200 && h <= 245 && l < 0.35) return true; // navy / dark denim
  if (h >= 205 && h <= 225 && s < 0.45) return true; // washed denim
  if (h >= 20 && h <= 50 && s < 0.55 && l > 0.55) return true; // beige, khaki, camel, tan
  if (h >= 10 && h <= 40 && l < 0.4) return true; // browns
  if (h >= 60 && h <= 95 && s < 0.45 && l < 0.45) return true; // olive
  return false;
}

/** Two colors read as "the same color" in an outfit. */
function sameColor(a: HSL, b: HSL): boolean {
  if (a.s < 0.18 && b.s < 0.18) return Math.abs(a.l - b.l) < 0.18;
  return hueDistance(a.h, b.h) < 18 && Math.abs(a.l - b.l) < 0.2 && Math.abs(a.s - b.s) < 0.35;
}

export function countDistinctColors(hexes: string[]): number {
  const reps: HSL[] = [];
  for (const hex of hexes) {
    const c = hexToHsl(hex);
    if (!reps.some((r) => sameColor(r, c))) reps.push(c);
  }
  return reps.length;
}

export type HarmonyScheme =
  | "neutral"
  | "neutral_plus_accent"
  | "monochromatic"
  | "analogous"
  | "complementary"
  | "triadic"
  | "clash";

export interface HarmonyResult {
  scheme: HarmonyScheme;
  score: number; // 0..1
  distinctColors: number;
  explanation: string;
}

/**
 * Evaluate the colour story of an outfit. `hexes` should include the primary
 * colour of every visible garment (secondary colours optional).
 */
export function evaluateHarmony(hexes: string[]): HarmonyResult {
  const distinct = countDistinctColors(hexes);
  const chromatic = hexes.filter((h) => !isNeutral(h)).map(hexToHsl);
  // collapse near-identical chromatic colours
  const accents: HSL[] = [];
  for (const c of chromatic) if (!accents.some((a) => sameColor(a, c))) accents.push(c);

  const tooMany = distinct > 3;
  const penalty = tooMany ? 0.35 : 0;

  let res: Omit<HarmonyResult, "distinctColors">;
  if (accents.length === 0) {
    res = { scheme: "neutral", score: 0.85, explanation: "An all-neutral palette – timeless and easy to wear." };
  } else if (accents.length === 1) {
    res = {
      scheme: "neutral_plus_accent",
      score: 0.92,
      explanation: "Neutrals anchor a single accent colour, which becomes the focal point.",
    };
  } else {
    const hues = accents.map((a) => a.h);
    let maxD = 0;
    for (let i = 0; i < hues.length; i++)
      for (let j = i + 1; j < hues.length; j++) maxD = Math.max(maxD, hueDistance(hues[i], hues[j]));

    if (maxD <= 20) {
      res = { scheme: "monochromatic", score: 0.95, explanation: "Tonal shades of one hue create a long, unbroken line." };
    } else if (maxD <= 50) {
      res = { scheme: "analogous", score: 0.88, explanation: "Neighbouring hues on the colour wheel blend harmoniously." };
    } else if (accents.length === 2 && Math.abs(maxD - 180) <= 30) {
      res = {
        scheme: "complementary",
        score: 0.82,
        explanation: "Opposite hues create confident contrast – best when one dominates.",
      };
    } else if (accents.length === 3 && isTriadic(hues)) {
      res = { scheme: "triadic", score: 0.7, explanation: "Three evenly spaced hues – bold, playful balance." };
    } else {
      res = { scheme: "clash", score: 0.3, explanation: "These hues compete with each other without a clear scheme." };
    }
  }

  return {
    ...res,
    score: Math.max(0, res.score - penalty),
    distinctColors: distinct,
    explanation: tooMany ? `${res.explanation} However, more than 3 distinct colours feels busy.` : res.explanation,
  };
}

function isTriadic(hues: number[]): boolean {
  const s = [...hues].sort((a, b) => a - b);
  const gaps = [s[1] - s[0], s[2] - s[1], 360 - s[2] + s[0]];
  return gaps.every((g) => Math.abs(g - 120) <= 30);
}

/** Relative lightness, used by body-shape rules ("darker on the bottom"). */
export function lightness(hex: string): number {
  return hexToHsl(hex).l;
}

/** Wardrobe-wide "bridge" colours we suggest when filling gaps. */
export const STAPLE_COLORS: { hex: string; name: string }[] = [
  { hex: "#1F2A44", name: "navy" },
  { hex: "#36454F", name: "charcoal" },
  { hex: "#111111", name: "black" },
  { hex: "#F5F5F0", name: "white" },
  { hex: "#C19A6B", name: "camel" },
  { hex: "#556B2F", name: "olive" },
  { hex: "#8B5A2B", name: "brown" },
  { hex: "#B0B7BF", name: "light grey" },
];
