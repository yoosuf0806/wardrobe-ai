import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { requireRepository } from "@/lib/data";
import { GarmentAttributesSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler(async (req: Request, ctx: Ctx) => {
  const repo = await requireRepository();
  const { id } = await ctx.params;
  await repo.updateItem(id, GarmentAttributesSchema.partial().parse(await req.json()));
  return NextResponse.json({ ok: true });
});

export const DELETE = handler(async (_req: Request, ctx: Ctx) => {
  const repo = await requireRepository();
  const { id } = await ctx.params;
  await repo.archiveItem(id);
  return NextResponse.json({ ok: true });
});
