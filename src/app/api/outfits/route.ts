import { NextResponse } from "next/server";
import { z } from "zod";
import { handler } from "@/lib/api";
import { requireRepository } from "@/lib/data";
import type { Weather } from "@/lib/types";

const LogSchema = z.object({
  occasion: z.string().min(1).max(120),
  item_ids: z.array(z.string().uuid()).min(1).max(8),
  weather: z.record(z.string(), z.unknown()).nullable().optional(),
  stylist_note: z.string().max(2000).nullable().optional(),
});

export const GET = handler(async () => {
  const repo = await requireRepository();
  return NextResponse.json({ logs: await repo.listLogs(90) });
});

export const POST = handler(async (req: Request) => {
  const repo = await requireRepository();
  const body = LogSchema.parse(await req.json());
  const log = await repo.addLog({
    occasion: body.occasion,
    item_ids: body.item_ids,
    weather: (body.weather as Weather | null | undefined) ?? null,
    stylist_note: body.stylist_note ?? null,
  });
  return NextResponse.json({ log }, { status: 201 });
});
