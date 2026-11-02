import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { requireRepository } from "@/lib/data";
import { seedItems } from "@/lib/data/seed";
import { wardrobePhoto } from "@/lib/samples/photos";
import type { GarmentAttributes } from "@/lib/types";

/**
 * Adds the 21-piece sample wardrobe to the signed-in user's account (skipping
 * pieces they already have), so testers can try the stylist straight away.
 * Uses real sample photos when they've been fetched; otherwise the app shows
 * illustrations.
 */
export const POST = handler(async () => {
  const repo = await requireRepository();
  const existing = new Set((await repo.listItems()).map((i) => i.subcategory.toLowerCase()));
  const toAdd = seedItems(repo.userId)
    .filter((i) => !existing.has(i.subcategory.toLowerCase()))
    .map((i) => {
      const attrs: GarmentAttributes = {
        category: i.category,
        subcategory: i.subcategory,
        color_hex: i.color_hex,
        color_name: i.color_name,
        secondary_colors: i.secondary_colors,
        pattern: i.pattern,
        fabric_type: i.fabric_type,
        fabric_weight: i.fabric_weight,
        sleeve_length: i.sleeve_length,
        fit: i.fit,
        length: i.length,
        formality: i.formality,
        seasonality: i.seasonality,
        waterproof: i.waterproof,
      };
      return { attrs, static_image: wardrobePhoto(i.subcategory)?.path ?? null };
    });
  const added = await repo.addSampleItems(toAdd);
  return NextResponse.json({ added });
});
