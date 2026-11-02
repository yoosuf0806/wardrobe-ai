import { NextResponse } from "next/server";
import { z } from "zod";
import { handler } from "@/lib/api";
import { requireRepository } from "@/lib/data";

const Body = z.object({
  occasion: z.string().min(1).max(120),
  item_ids: z.array(z.string().uuid()).min(1).max(8),
  decision: z.enum(["accept", "reject"]),
  round: z.number().int().min(1).max(50),
});

export const POST = handler(async (req: Request) => {
  const repo = await requireRepository();
  await repo.recordSwipe(Body.parse(await req.json()));
  return NextResponse.json({ ok: true });
});
