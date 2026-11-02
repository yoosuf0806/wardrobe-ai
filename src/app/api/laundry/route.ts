import { NextResponse } from "next/server";
import { z } from "zod";
import { handler } from "@/lib/api";
import { requireRepository } from "@/lib/data";

const Body = z.object({ item_ids: z.array(z.string().uuid()).min(1).max(50), in_laundry: z.boolean() });

/** Mark items as in the laundry (excluded from suggestions) or back in the closet. */
export const POST = handler(async (req: Request) => {
  const repo = await requireRepository();
  const { item_ids, in_laundry } = Body.parse(await req.json());
  await repo.setLaundry(item_ids, in_laundry);
  return NextResponse.json({ ok: true });
});
