import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { requireRepository } from "@/lib/data";

export const DELETE = handler(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const repo = await requireRepository();
  await repo.deleteInspiration((await ctx.params).id);
  return NextResponse.json({ ok: true });
});
