import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { requireRepository } from "@/lib/data";
import { MIN_OCCURRENCES, learnPreferences } from "@/lib/engine/learning";
import { HISTORY_DAYS } from "@/lib/services/stylist-service";

/** What the system has learned from outfit history (style chosen ≥ 2×). */
export const GET = handler(async () => {
  const repo = await requireRepository();
  const [profile, items, logs, swipes] = await Promise.all([repo.getProfile(), repo.listItems(), repo.listLogs(HISTORY_DAYS), repo.listSwipes(HISTORY_DAYS)]);
  return NextResponse.json({
    learned: learnPreferences({ logs, swipes, items, style: profile.style_profile }),
    outfits_logged: logs.length,
    min_occurrences: MIN_OCCURRENCES,
  });
});
