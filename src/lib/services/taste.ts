import "server-only";
import { learnPreferences, type LearnedPreference, type StyleEvent } from "../engine/learning";
import type { Repository } from "../data/repository";
import { quizEvents } from "../style/looks";
import type { Inspiration, OutfitLog, Profile, WardrobeItem } from "../types";

export const HISTORY_DAYS = 180;

export function inspirationEvents(list: Inspiration[]): StyleEvent[] {
  return list.map((i) => ({
    pieces: i.pieces.map((p) => ({ category: p.category, subcategory: p.subcategory, color_hex: p.color_hex, pattern: p.pattern, fit: "regular" as const })),
    positive: true,
    occasion: i.occasion,
    source: "inspiration" as const,
  }));
}

/**
 * Everything the stylist knows about the user's taste: outfits worn and
 * rejected, style-quiz likes and saved inspiration photos.
 */
export async function learnTaste(repo: Repository, profile: Profile, items?: WardrobeItem[], logs?: OutfitLog[]): Promise<{ learned: LearnedPreference[]; items: WardrobeItem[]; logs: OutfitLog[] }> {
  const [its, lgs, swipes, inspirations] = await Promise.all([
    items ?? repo.listItems(),
    logs ?? repo.listLogs(HISTORY_DAYS),
    repo.listSwipes(HISTORY_DAYS),
    repo.listInspirations(),
  ]);
  const learned = learnPreferences({
    logs: lgs,
    swipes,
    items: its,
    style: profile.style_profile,
    extra: [...quizEvents(profile.style_profile.liked_looks ?? []), ...inspirationEvents(inspirations)],
  });
  return { learned, items: its, logs: lgs };
}
