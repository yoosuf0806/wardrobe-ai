import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { requireRepository } from "@/lib/data";
import { analyzeWearFrequency } from "@/lib/engine/gaps";

/** Wear-frequency balancing: frequent occasions where the user keeps repeating the same pieces. */
export const GET = handler(async () => {
  const repo = await requireRepository();
  const [profile, items, logs] = await Promise.all([repo.getProfile(), repo.listItems(), repo.listLogs(60)]);
  return NextResponse.json({ gaps: analyzeWearFrequency(logs, items, profile), log_count: logs.length });
});
