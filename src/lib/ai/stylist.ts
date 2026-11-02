import "server-only";
import { z } from "zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { FALLBACK, STYLIST_EFFORT, STYLIST_MODEL, getClaude } from "./claude";
import type { OutfitCandidate } from "../engine/recommend";
import type { OccasionProfile } from "../engine/occasions";
import type { WeatherProfile } from "../engine/weather-rules";
import { BODY_SHAPE_LABELS, CATEGORIES, type Profile, type WardrobeItem, type Weather } from "../types";

// The LLM never sees the full wardrobe. It receives the engine's pre-filtered,
// pre-scored candidate ensembles and picks/explains – so it cannot select an
// item that violates a hard rule, and every ID it returns is validated.

const StylistSchema = z.object({
  outfits: z
    .array(
      z.object({
        candidate_id: z.string().describe("ID of the chosen candidate ensemble, exactly as given (e.g. 'C3')"),
        title: z.string().describe("short evocative name for the look, max 6 words"),
        stylist_note: z.string().describe("2–4 sentences: why this works for the body type, occasion and weather, plus one styling tip"),
      }),
    )
    .describe("1 to 3 outfits, best first"),
  missing_gap_item: z.object({
    needed: z.boolean(),
    category: z.enum([...CATEGORIES, "none"]),
    description: z.string().describe("the single piece that would most improve options for this occasion, or empty"),
  }),
});

export interface StyledOutfit {
  candidate: OutfitCandidate;
  title: string;
  note: string;
}

export interface StylistResult {
  outfits: StyledOutfit[];
  gapSuggestion: { category: string; description: string } | null;
}

function itemLine(role: string, i: WardrobeItem | null) {
  if (!i) return null;
  return `${role}: ${i.color_name} ${i.subcategory} (${i.pattern.replace("_", " ")}, ${i.fabric_type || "unknown fabric"}, ${i.fabric_weight}, ${i.fit} fit, formality ${i.formality})`;
}

function describeCandidate(c: OutfitCandidate, id: string) {
  const lines = [
    itemLine("Top", c.top),
    itemLine("Bottom", c.bottom),
    itemLine("One-piece", c.onePiece),
    itemLine("Shoes", c.footwear),
    itemLine("Outerwear", c.outerwear),
  ].filter(Boolean);
  const rules = c.ruleHits.map((h) => `${h.weight > 0 ? "+" : "-"} ${h.description}`).join("; ");
  return `[${id}] engine score ${c.score.toFixed(2)} | colour: ${c.harmony.scheme} (${c.harmony.distinctColors} colours) | avg formality ${c.formality}${c.complete ? "" : " | INCOMPLETE"}
  ${lines.join("\n  ")}${rules ? `\n  body-rule notes: ${rules}` : ""}`;
}

const SYSTEM = `You are SmartStylist AI, a warm, practical personal stylist. You choose outfits for the user from candidate ensembles that a styling engine has already built from their real wardrobe. Every candidate already passes the user's hard comfort constraints and the weather filter.

Rules:
1. Formality: the ensemble must suit the occasion's formality range.
2. Weather: the outfit must be comfortable in the stated conditions (no heavy fabrics above 25°C; a warm layer when it is cold; rain protection when rain is likely).
3. Colour harmony: max 3 distinct colours; favour monochromatic, analogous, complementary or neutral-plus-accent schemes.
4. Fit: respect the user's fit preferences and overrides – they ALWAYS take priority over body-type guidance. Never recommend something the user said they avoid, and do not suggest body-type "flattering" advice that contradicts their stated comfort preferences.
5. Only choose from the candidate IDs provided. Prefer variety across your picks.
6. If no candidate is truly appropriate for the occasion, or a key piece is missing, set missing_gap_item.needed = true and describe the single most useful piece to buy.

Write stylist notes in second person, concise and specific to the actual garments – mention colours and pieces by name.`;

export async function styleWithClaude(args: {
  candidates: OutfitCandidate[];
  profile: Profile;
  occasion: OccasionProfile;
  weather: Weather;
  weatherProfile: WeatherProfile;
}): Promise<StylistResult | null> {
  const { candidates, profile, occasion, weather, weatherProfile } = args;
  if (candidates.length === 0) return null;
  const ids = candidates.map((_, i) => `C${i + 1}`);
  const byId = new Map(ids.map((id, i) => [id, candidates[i]]));
  const prefs = profile.fit_preferences;
  const overrides = Object.entries(prefs)
    .filter(([k, v]) => k.startsWith("allow_") && v !== null)
    .map(([k, v]) => `${k.replace("allow_", "").replace(/_/g, " ")}: ${v ? "ALLOWED by user" : "NEVER"}`);

  const userContext = `USER CONTEXT
- Body type: ${profile.body_shape ? BODY_SHAPE_LABELS[profile.body_shape] : "unknown"}
- Fit preferences & overrides: ${overrides.length ? overrides.join("; ") : "none set"}${prefs.notes ? `\n- Comfort notes from the user: "${prefs.notes}"` : ""}
- Requested occasion: ${occasion.label} (target formality ${occasion.formality[0]}–${occasion.formality[1]} of 10)
- Live weather: ${Math.round(weather.temp_c)}°C (feels like ${Math.round(weather.feels_like_c)}°C), ${weather.condition}, humidity ${weather.humidity}%, rain chance ${Math.round(weather.rain_probability * 100)}% – ${weatherProfile.band}, ${weatherProfile.season}; outer layer ${weatherProfile.outerwear}

CANDIDATE ENSEMBLES
${candidates.map((c, i) => describeCandidate(c, ids[i])).join("\n\n")}

Pick the best 1–3 outfits.`;

  const response = await getClaude().beta.messages.parse({
    model: STYLIST_MODEL,
    max_tokens: 8000,
    ...FALLBACK,
    output_config: { effort: STYLIST_EFFORT, format: betaZodOutputFormat(StylistSchema) },
    system: SYSTEM,
    messages: [{ role: "user", content: userContext }],
  });

  if (response.stop_reason === "refusal" || !response.parsed_output) return null;
  const out = response.parsed_output;
  const seen = new Set<string>();
  const outfits: StyledOutfit[] = [];
  for (const o of out.outfits) {
    const c = byId.get(o.candidate_id.trim());
    if (!c || seen.has(c.id)) continue; // drop hallucinated or duplicate IDs
    seen.add(c.id);
    outfits.push({ candidate: c, title: o.title.slice(0, 60), note: o.stylist_note });
    if (outfits.length === 3) break;
  }
  if (outfits.length === 0) return null;
  const g = out.missing_gap_item;
  return { outfits, gapSuggestion: g.needed && g.category !== "none" && g.description ? { category: g.category, description: g.description } : null };
}
