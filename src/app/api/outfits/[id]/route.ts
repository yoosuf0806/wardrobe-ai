import { NextResponse } from "next/server";
import { z } from "zod";
import { handler } from "@/lib/api";
import { requireRepository } from "@/lib/data";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler(async (req: Request, ctx: Ctx) => {
  const repo = await requireRepository();
  const { id } = await ctx.params;
  const { feedback } = z.object({ feedback: z.number().int().min(1).max(5) }).parse(await req.json());
  await repo.setFeedback(id, feedback);
  return NextResponse.json({ ok: true });
});
