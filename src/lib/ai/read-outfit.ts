import "server-only";
import { z } from "zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { FALLBACK, STYLIST_EFFORT, STYLIST_MODEL, getClaude } from "./claude";
import { CATEGORIES, PATTERNS, type InspirationPiece } from "../types";

const OutfitSchema = z.object({
  is_outfit: z.boolean().describe("false if the image does not show a person's outfit or an outfit flat-lay"),
  occasion: z.enum(["office", "casual_date", "formal_event", "party", "gym", "other"]).describe("the occasion this outfit suits best"),
  pieces: z
    .array(
      z.object({
        category: z.enum(CATEGORIES),
        subcategory: z.string().describe("garment type in 1-3 words, e.g. 'shirt', 'chinos', 'knit polo', 'loafers', 'blazer'"),
        color_hex: z.string().describe("the garment's main colour as #RRGGBB"),
        color_name: z.string().describe("simple colour name, e.g. 'navy', 'beige', 'charcoal'"),
        pattern: z.enum(PATTERNS),
      }),
    )
    .describe("each visible garment, shoes and notable accessories (belt, watch, bag); max 6"),
});

const SYSTEM = `You read outfit inspiration photos for a personal-stylist app. List the garments the person is wearing so the app can learn which combinations the user likes. Describe the main outfit only (ignore other people and background). Judge colours from the fabric, correcting for lighting. Use simple, consistent garment names (shirt, t-shirt, knit polo, sweater, blazer, chinos, trousers, jeans, loafers, sneakers, boots…).`;

const HEX = /^#[0-9a-f]{6}$/i;

export type ReadOutfitResult = { ok: true; occasion: string | null; pieces: InspirationPiece[] } | { ok: false; error: string };

export async function readOutfit(imageBase64: string, mediaType: "image/jpeg" | "image/png" | "image/webp"): Promise<ReadOutfitResult> {
  const response = await getClaude().beta.messages.parse({
    model: STYLIST_MODEL,
    max_tokens: 4000,
    ...FALLBACK,
    output_config: { effort: STYLIST_EFFORT, format: betaZodOutputFormat(OutfitSchema) },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
          { type: "text", text: "What is this person wearing?" },
        ],
      },
    ],
  });
  if (response.stop_reason === "refusal") return { ok: false, error: "This image couldn't be read. Add the pieces manually." };
  const o = response.parsed_output;
  if (!o) return { ok: false, error: "The AI response was incomplete. Add the pieces manually." };
  if (!o.is_outfit) return { ok: false, error: "That doesn't look like an outfit photo." };
  return {
    ok: true,
    occasion: o.occasion === "other" ? null : o.occasion,
    pieces: o.pieces.slice(0, 6).map((p) => ({ ...p, subcategory: p.subcategory.toLowerCase().slice(0, 40), color_hex: HEX.test(p.color_hex) ? p.color_hex.toUpperCase() : "#808080" })),
  };
}
