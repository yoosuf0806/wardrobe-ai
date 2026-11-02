import "server-only";
import { z } from "zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { FALLBACK, STYLIST_EFFORT, STYLIST_MODEL, getClaude } from "./claude";
import { CATEGORIES, FABRIC_WEIGHTS, FITS, LENGTHS, PATTERNS, SEASONS, SLEEVES, type GarmentAttributes } from "../types";

const GarmentSchema = z.object({
  is_garment: z.boolean().describe("false if the photo does not show a single clothing item, shoe or accessory"),
  category: z.enum(CATEGORIES),
  subcategory: z.string().describe("specific garment type, e.g. 'button-down shirt', 'chelsea boots', 'midi wrap dress'"),
  color_hex: z.string().describe("dominant colour of the fabric as #RRGGBB (ignore background, lighting casts)"),
  color_name: z.string().describe("human colour name, e.g. 'Navy Blue'"),
  secondary_colors: z.array(z.string()).describe("other notable colours as #RRGGBB, max 3"),
  pattern: z.enum(PATTERNS),
  fabric_type: z.string().describe("best guess of the main fabric, e.g. 'linen', 'denim', 'wool', 'leather'"),
  fabric_weight: z.enum(FABRIC_WEIGHTS),
  sleeve_length: z.enum(SLEEVES).describe("'none' for bottoms, footwear and accessories"),
  fit: z.enum(FITS),
  length: z.enum(LENGTHS),
  formality: z.number().int().describe("1 = pajamas/gym, 4 = everyday casual, 6 = smart casual, 8 = business formal, 10 = black tie"),
  seasonality: z.array(z.enum(SEASONS)),
  waterproof: z.boolean(),
});

const SYSTEM = `You are a fashion cataloguing assistant for a wardrobe app. You look at one photo of a single garment and record its attributes precisely so a styling engine can combine it with other items.
Judge colour from the fabric itself, correcting for background and lighting. Use the formality scale consistently: a plain tee is 3–4, chinos 5, an oxford shirt 6, a tailored blazer 7–8, a suit or cocktail dress 8–9, a tuxedo or gown 10.`;

export type TagResult = { ok: true; attributes: GarmentAttributes } | { ok: false; error: string };

const HEX = /^#[0-9a-f]{6}$/i;

export async function tagGarment(imageBase64: string, mediaType: "image/jpeg" | "image/png" | "image/webp"): Promise<TagResult> {
  const response = await getClaude().beta.messages.parse({
    model: STYLIST_MODEL,
    max_tokens: 4000,
    ...FALLBACK,
    output_config: { effort: STYLIST_EFFORT, format: betaZodOutputFormat(GarmentSchema) },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
          { type: "text", text: "Catalogue this item." },
        ],
      },
    ],
  });

  if (response.stop_reason === "refusal") return { ok: false, error: "The image couldn't be analysed. Please fill the details in manually." };
  const g = response.parsed_output;
  if (!g) return { ok: false, error: "The AI response was incomplete. Please fill the details in manually." };
  if (!g.is_garment) return { ok: false, error: "That photo doesn't look like a single clothing item." };

  return {
    ok: true,
    attributes: {
      category: g.category,
      subcategory: g.subcategory.slice(0, 50),
      color_hex: HEX.test(g.color_hex) ? g.color_hex.toUpperCase() : "#808080",
      color_name: g.color_name,
      secondary_colors: g.secondary_colors.filter((c) => HEX.test(c)).slice(0, 3),
      pattern: g.pattern,
      fabric_type: g.fabric_type.toLowerCase(),
      fabric_weight: g.fabric_weight,
      sleeve_length: g.sleeve_length,
      fit: g.fit,
      length: g.length,
      formality: Math.max(1, Math.min(10, Math.round(g.formality))),
      seasonality: [...new Set(g.seasonality)],
      waterproof: g.waterproof,
    },
  };
}
