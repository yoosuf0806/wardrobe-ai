import type { Season, WardrobeItem, Weather } from "../types";

export type OuterwearNeed = "none" | "optional" | "recommended" | "required";

export interface WeatherProfile {
  band: "hot" | "warm" | "mild" | "cool" | "cold";
  outerwear: OuterwearNeed;
  wantsRainProtection: boolean;
  muggy: boolean;
  season: Season;
  summary: string;
}

const BREATHABLE = ["linen", "cotton", "chambray", "seersucker", "silk", "rayon", "viscose", "lyocell", "tencel"];
const NON_BREATHABLE = ["polyester", "wool", "leather", "fleece", "nylon", "acrylic", "velvet", "corduroy", "suede"];
const RAIN_SENSITIVE = ["suede", "canvas", "satin", "silk", "velvet"];

export function currentSeason(date: Date, latitude: number | null): Season {
  const m = date.getMonth(); // 0..11
  const north: Season[] = ["winter", "winter", "spring", "spring", "spring", "summer", "summer", "summer", "autumn", "autumn", "autumn", "winter"];
  const s = north[m];
  if (latitude !== null && latitude < 0) {
    return ({ winter: "summer", summer: "winter", spring: "autumn", autumn: "spring" } as const)[s];
  }
  return s;
}

export function profileWeather(w: Weather, now = new Date()): WeatherProfile {
  const t = w.feels_like_c;
  const band = t >= 25 ? "hot" : t >= 18 ? "warm" : t >= 10 ? "mild" : t >= 3 ? "cool" : "cold";
  const outerwear: OuterwearNeed =
    band === "cold" || band === "cool" ? "required" : band === "mild" ? "recommended" : band === "warm" ? "optional" : "none";
  const wantsRainProtection = w.rain_probability >= 0.5;
  const muggy = w.humidity >= 75 && w.temp_c >= 24;
  const season = currentSeason(now, w.latitude);
  const summary = `${Math.round(w.temp_c)}°C (feels ${Math.round(t)}°C), ${w.condition.toLowerCase()}, ${w.humidity}% humidity, ${Math.round(
    w.rain_probability * 100,
  )}% chance of rain`;
  return { band, outerwear: wantsRainProtection && outerwear === "none" ? "optional" : outerwear, wantsRainProtection, muggy, season, summary };
}

/** Hard weather filter. Returns a reason string when the item must be rejected. */
export function weatherReject(item: WardrobeItem, wp: WeatherProfile): string | null {
  // RULE (brief): reject heavy fabrics when temperature > 25°C
  if (wp.band === "hot" && item.fabric_weight === "heavy") return "heavy fabric in hot weather";
  if (wp.band === "hot" && item.category === "outerwear" && !item.waterproof) return "no jacket needed in this heat";
  if (wp.band === "cold" && item.category !== "outerwear" && item.category !== "footwear" && item.fabric_weight === "light" && item.sleeve_length === "sleeveless")
    return "sleeveless light piece in freezing weather";
  return null;
}

/** Soft weather score for a single item, 0..1. */
export function weatherItemScore(item: WardrobeItem, wp: WeatherProfile): number {
  let s = 0.7;
  const fabric = item.fabric_type.toLowerCase();
  if (wp.band === "hot" || wp.band === "warm") {
    if (item.fabric_weight === "light") s += 0.2;
    if (item.fabric_weight === "heavy") s -= 0.3;
    if (item.category === "top" && item.sleeve_length === "long_sleeve" && wp.band === "hot") s -= 0.1;
  }
  if (wp.band === "cool" || wp.band === "cold") {
    if (item.fabric_weight === "heavy") s += 0.2;
    if (item.fabric_weight === "light" && item.category !== "footwear") s -= 0.2;
    if (item.category === "top" && item.sleeve_length === "long_sleeve") s += 0.1;
    if (item.category === "top" && (item.sleeve_length === "sleeveless" || item.sleeve_length === "short_sleeve")) s -= 0.15;
  }
  if (wp.muggy) {
    if (BREATHABLE.some((f) => fabric.includes(f))) s += 0.15;
    if (NON_BREATHABLE.some((f) => fabric.includes(f))) s -= 0.2;
  }
  if (wp.wantsRainProtection) {
    if (item.category === "footwear" && RAIN_SENSITIVE.some((f) => fabric.includes(f))) s -= 0.35;
    if (item.waterproof) s += 0.2;
  }
  if (item.seasonality.length > 0) s += item.seasonality.includes(wp.season) ? 0.1 : -0.1;
  return Math.max(0, Math.min(1, s));
}
