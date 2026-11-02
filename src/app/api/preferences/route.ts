import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { requireRepository } from "@/lib/data";
import { MIN_OCCURRENCES } from "@/lib/engine/learning";
import { learnTaste } from "@/lib/services/taste";

/** What the system has learned (outfits worn, quiz likes, inspiration photos). */
export const GET = handler(async () => {
  const repo = await requireRepository();
  const profile = await repo.getProfile();
  const { learned, logs } = await learnTaste(repo, profile);
  return NextResponse.json({ learned, outfits_logged: logs.length, min_occurrences: MIN_OCCURRENCES });
});
