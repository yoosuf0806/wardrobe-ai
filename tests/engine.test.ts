import { describe, expect, it } from "vitest";
import { classifyBodyShape } from "@/lib/body/classify";
import { evaluateHarmony, isNeutral } from "@/lib/engine/color";
import { activeItemRules, userReject } from "@/lib/engine/body-rules";
import { analyzeMatchGaps, analyzeWearFrequency, sizeFor } from "@/lib/engine/gaps";
import { resolveOccasion } from "@/lib/engine/occasions";
import { isInLaundry, itemIds, recommendOutfits } from "@/lib/engine/recommend";
import { seedItems, seedLogs, seedProfile } from "@/lib/data/seed";
import { rankProducts } from "@/lib/shopping/rank";
import type { Profile, Weather } from "@/lib/types";

const NOW = new Date("2026-06-15T12:00:00Z"); // northern summer
const weather = (temp: number, extra: Partial<Weather> = {}): Weather => ({
  temp_c: temp,
  feels_like_c: temp,
  humidity: 50,
  rain_probability: 0,
  condition: "Clear",
  location_name: null,
  latitude: 51.5,
  source: "manual",
  ...extra,
});
const items = seedItems(undefined, NOW);
const byName = (s: string) => items.find((i) => i.subcategory === s)!;
const profile = (p: Partial<Profile> = {}): Profile => ({ ...seedProfile(), ...p, fit_preferences: { ...seedProfile().fit_preferences, ...(p.fit_preferences ?? {}) } });

describe("colour harmony", () => {
  it("treats navy, khaki, white and charcoal as neutrals", () => {
    for (const hex of ["#1E3A8A", "#C3B091", "#F4F4F0", "#36454F"]) expect(isNeutral(hex), hex).toBe(true);
    expect(isNeutral("#DC2626")).toBe(false);
  });
  it("classifies schemes", () => {
    expect(evaluateHarmony(["#F4F4F0", "#36454F", "#111111"]).scheme).toBe("neutral");
    expect(evaluateHarmony(["#F4F4F0", "#DC2626", "#111111"]).scheme).toBe("neutral_plus_accent");
    expect(evaluateHarmony(["#DC2626", "#F97316"]).scheme).toBe("analogous");
    expect(evaluateHarmony(["#2563EB", "#F97316"]).scheme).toBe("complementary");
    expect(evaluateHarmony(["#DC2626", "#16A34A", "#9333EA"]).scheme).toBe("clash");
  });
  it("penalises more than 3 distinct colours", () => {
    const r = evaluateHarmony(["#F4F4F0", "#111111", "#DC2626", "#F97316", "#C3B091"]);
    expect(r.distinctColors).toBeGreaterThan(3);
    expect(r.score).toBeLessThan(0.7);
  });
});

describe("body shape classification", () => {
  it("classifies tape measurements", () => {
    expect(classifyBodyShape({ kind: "circumference", shoulder: 92, waist: 66, hip: 94 }).shape).toBe("hourglass");
    expect(classifyBodyShape({ kind: "circumference", shoulder: 86, waist: 72, hip: 100 }).shape).toBe("pear");
    expect(classifyBodyShape({ kind: "circumference", shoulder: 104, waist: 82, hip: 92 }).shape).toBe("inverted_triangle");
    expect(classifyBodyShape({ kind: "circumference", shoulder: 90, waist: 80, hip: 92 }).shape).toBe("rectangle");
    expect(classifyBodyShape({ kind: "circumference", shoulder: 100, waist: 102, hip: 101 }).shape).toBe("oval");
  });
  it("classifies frontal silhouette widths", () => {
    expect(classifyBodyShape({ kind: "frontal_width", shoulder: 150, waist: 135, hip: 148 }).shape).toBe("rectangle");
    expect(classifyBodyShape({ kind: "frontal_width", shoulder: 130, waist: 100, hip: 160 }).shape).toBe("pear");
  });
  it("rejects non-positive input", () => {
    expect(() => classifyBodyShape({ kind: "circumference", shoulder: 0, waist: 1, hip: 1 })).toThrow();
  });
});

describe("user override layer", () => {
  it("'never' is a hard filter", () => {
    const cropped = byName("cropped knit top");
    expect(userReject(cropped, { ...seedProfile().fit_preferences, allow_cropped_tops: false })).toMatch(/cropped/);
    expect(userReject(cropped, seedProfile().fit_preferences)).toBeNull();
  });
  it("'always OK' switches off the matching baseline rule", () => {
    const base = activeItemRules("oval", seedProfile().fit_preferences).map((r) => r.id);
    expect(base).toContain("oval_no_slim_tops");
    const allowed = activeItemRules("oval", { ...seedProfile().fit_preferences, allow_slim_fit: true }).map((r) => r.id);
    expect(allowed).not.toContain("oval_no_slim_tops");
  });
  it("disabled_rules removes baseline rules", () => {
    const ids = activeItemRules("oval", { ...seedProfile().fit_preferences, disabled_rules: ["oval_no_horizontal"] }).map((r) => r.id);
    expect(ids).not.toContain("oval_no_horizontal");
  });
  it("never recommends an item the user excluded", () => {
    const p = profile({ fit_preferences: { ...seedProfile().fit_preferences, allow_horizontal_stripes: false } });
    const res = recommendOutfits({ items, profile: p, occasion: resolveOccasion("casual"), weather: weather(20), now: NOW });
    const striped = byName("breton striped tee").id;
    expect(res.pool.flatMap(itemIds)).not.toContain(striped);
  });
});

describe("recommendation matrix", () => {
  it("returns complete, diverse outfits from the real inventory only", () => {
    const res = recommendOutfits({ items, profile: profile(), occasion: resolveOccasion("Business casual / Office"), weather: weather(20), now: NOW });
    expect(res.candidates.length).toBe(3);
    const ids = new Set(items.map((i) => i.id));
    for (const c of res.candidates) {
      expect(c.complete).toBe(true);
      for (const id of itemIds(c)) expect(ids.has(id)).toBe(true);
    }
    const [a, b] = res.candidates.map((c) => new Set(itemIds({ ...c, accessory: null }))); // accessories may repeat
    expect([...a].filter((x) => b.has(x)).length).toBeLessThanOrEqual(1);
  });
  it("rejects heavy fabrics above 25°C", () => {
    const res = recommendOutfits({ items, profile: profile(), occasion: resolveOccasion("dinner"), weather: weather(30), now: NOW });
    const heavy = items.filter((i) => i.fabric_weight === "heavy").map((i) => i.id);
    expect(res.pool.flatMap(itemIds).some((id) => heavy.includes(id))).toBe(false);
    expect(res.rejected.some((r) => r.reason.includes("heavy"))).toBe(true);
  });
  it("adds outerwear when it is cold", () => {
    const res = recommendOutfits({ items, profile: profile(), occasion: resolveOccasion("Business casual"), weather: weather(2), now: new Date("2026-01-10") });
    expect(res.candidates[0].outerwear).not.toBeNull();
  });
  it("picks gym gear for a workout", () => {
    const res = recommendOutfits({ items, profile: profile(), occasion: resolveOccasion("gym"), weather: weather(18), now: NOW });
    expect(res.candidates[0].footwear?.subcategory).toBe("running shoes");
  });
  it("prefers a waterproof-friendly shoe over suede in the rain", () => {
    const res = recommendOutfits({ items, profile: profile(), occasion: resolveOccasion("casual"), weather: weather(16, { rain_probability: 0.9, condition: "Rain" }), now: NOW });
    expect(res.candidates[0].footwear?.fabric_type).not.toBe("suede");
  });
});

describe("gap analysis", () => {
  it("detects a formality ceiling for black tie", () => {
    const occ = resolveOccasion("black tie gala");
    const res = recommendOutfits({ items, profile: profile(), occasion: occ, weather: weather(18), now: NOW });
    const gaps = analyzeMatchGaps(items, profile(), occ, res);
    expect(gaps.length).toBeGreaterThan(0);
    expect(gaps.some((g) => g.trigger === "formality_ceiling")).toBe(true);
    for (const g of gaps) {
      expect(g.spec.max_price).toBe(150);
      expect(g.spec.formality).toBeGreaterThanOrEqual(9);
      expect(g.spec.query.length).toBeGreaterThan(3);
    }
  });
  it("detects a missing weather layer", () => {
    const noCoats = items.filter((i) => i.category !== "outerwear");
    const occ = resolveOccasion("casual");
    const res = recommendOutfits({ items: noCoats, profile: profile(), occasion: occ, weather: weather(0), now: new Date("2026-01-10") });
    expect(analyzeMatchGaps(noCoats, profile(), occ, res).some((g) => g.trigger === "weather")).toBe(true);
  });
  it("flags repetitive outfits for frequent occasions", () => {
    const gaps = analyzeWearFrequency(seedLogs(items, undefined, NOW), items, profile(), NOW);
    expect(gaps.some((g) => g.trigger === "wear_frequency")).toBe(true);
  });
  it("respects fit overrides in the shopping spec", () => {
    const p = profile({ body_shape: "oval" });
    const occ = resolveOccasion("black tie");
    const res = recommendOutfits({ items, profile: p, occasion: occ, weather: weather(18), now: NOW });
    expect(analyzeMatchGaps(items, p, occ, res)[0].spec.avoid_fits).toContain("slim");
    const allowed = profile({ body_shape: "oval", fit_preferences: { ...seedProfile().fit_preferences, allow_slim_fit: true } });
    expect(analyzeMatchGaps(items, allowed, occ, res)[0].spec.avoid_fits).not.toContain("slim");
  });
});

describe("product ranking", () => {
  it("ranks in-budget, on-spec products first and drops far-over-budget ones", () => {
    const spec = {
      category: "outerwear" as const, subcategory: "navy blazer", color_hex: "#1F2A44", color_name: "navy", formality: 8,
      max_price: 150, currency: "USD", department: "mens" as const, avoid_fits: ["slim" as const], size: null, query: "men's navy blazer",
    };
    const base = { merchant: "x", currency: "USD", image_url: null, rating: 4.5, reviews: 200 };
    const ranked = rankProducts(
      [
        { ...base, title: "Navy Wool Blazer", price: 129, url: "https://a/1" },
        { ...base, title: "Slim Fit Navy Blazer", price: 99, url: "https://a/2" },
        { ...base, title: "Grey Hoodie", price: 40, url: "https://a/3" },
        { ...base, title: "Navy Cashmere Blazer", price: 400, url: "https://a/4" },
      ],
      spec, 0.9, "test",
    );
    expect(ranked[0].title).toBe("Navy Wool Blazer");
    expect(ranked.map((r) => r.title)).not.toContain("Navy Cashmere Blazer");
  });
});

describe("formal gap colours", () => {
  it("suggests white shirts and black shoes for black tie", () => {
    const occ = resolveOccasion("black tie");
    const res = recommendOutfits({ items, profile: profile(), occasion: occ, weather: weather(18), now: NOW });
    const gaps = analyzeMatchGaps(items, profile(), occ, res);
    expect(gaps.find((g) => g.spec.category === "top")?.spec.color_name).toBe("white");
    expect(gaps.find((g) => g.spec.category === "footwear")?.spec.color_name).toBe("black");
  });
});

describe("accessories", () => {
  it("adds an accessory that keeps the colour story", () => {
    const res = recommendOutfits({ items, profile: profile(), occasion: resolveOccasion("Business casual"), weather: weather(20), now: NOW });
    const withAcc = res.candidates.filter((c) => c.accessory);
    expect(withAcc.length).toBeGreaterThan(0);
    for (const c of withAcc) expect(c.accessory!.category).toBe("accessory");
  });
  it("only adds a scarf when it is cold", () => {
    const warm = recommendOutfits({ items, profile: profile(), occasion: resolveOccasion("casual"), weather: weather(22), now: NOW });
    expect(warm.pool.some((c) => c.accessory?.subcategory.includes("scarf"))).toBe(false);
  });
});

describe("swipe deck rounds", () => {
  const occ = resolveOccasion("Business casual / Office");
  const base = { items, profile: profile(), occasion: occ, weather: weather(20), now: NOW };

  it("round 2 avoids every clothing item from rejected outfits when possible", () => {
    const r1 = recommendOutfits(base);
    const seen = r1.candidates.flatMap((c) => itemIds({ ...c, accessory: null }));
    const r2 = recommendOutfits({ ...base, avoidItemIds: seen, excludeOutfitIds: r1.candidates.map((c) => c.id) });
    const byId = new Map(items.map((i) => [i.id, i]));
    for (const c of r2.candidates)
      for (const id of itemIds({ ...c, accessory: null }))
        if (!r2.relaxedCategories.includes(byId.get(id)!.category)) expect(seen).not.toContain(id);
    expect(r2.candidates.length).toBeGreaterThan(0);
    for (const c of r2.candidates) expect(r1.candidates.map((x) => x.id)).not.toContain(c.id);
  });

  it("relaxes to fresh combinations when the wardrobe runs out", () => {
    const allClothes = items.filter((i) => i.category !== "accessory").map((i) => i.id);
    const r1 = recommendOutfits(base);
    const r = recommendOutfits({ ...base, avoidItemIds: allClothes, excludeOutfitIds: r1.candidates.map((c) => c.id) });
    expect(r.relaxed).toBe(true);
    expect(r.candidates.length).toBeGreaterThan(0);
    for (const c of r.candidates) expect(r1.candidates.map((x) => x.id)).not.toContain(c.id);
  });

  it("never suggests laundry or unavailable items", () => {
    const shirt = byName("white oxford shirt");
    const washing = items.map((i) => (i.id === shirt.id ? { ...i, in_laundry_since: NOW.toISOString() } : i));
    const r = recommendOutfits({ ...base, items: washing, excludeItemIds: [byName("khaki chinos").id] });
    const used = r.pool.flatMap(itemIds);
    expect(used).not.toContain(shirt.id);
    expect(used).not.toContain(byName("khaki chinos").id);
  });

  it("returns laundry items to the closet after 7 days", () => {
    expect(isInLaundry({ in_laundry_since: new Date(NOW.getTime() - 2 * 86_400_000).toISOString() }, NOW)).toBe(true);
    expect(isInLaundry({ in_laundry_since: new Date(NOW.getTime() - 8 * 86_400_000).toISOString() }, NOW)).toBe(false);
  });
});

describe("sizes in shopping specs", () => {
  it("formats sizes per category and puts them in the query", () => {
    const sizes = { top: "M", bottom_waist: 32, bottom_inseam: 30, dress: null, shoe: "10", shoe_system: "US" as const };
    expect(sizeFor("bottom", sizes)).toBe("32W x 30L");
    expect(sizeFor("footwear", sizes)).toBe("10 US");
    expect(sizeFor("accessory", sizes)).toBeNull();
    const p = profile({ sizes });
    const occ = resolveOccasion("black tie");
    const res = recommendOutfits({ items, profile: p, occasion: occ, weather: weather(18), now: NOW });
    const shoeGap = analyzeMatchGaps(items, p, occ, res).find((g) => g.spec.category === "footwear")!;
    expect(shoeGap.spec.query).toContain("size 10 US");
  });
});
