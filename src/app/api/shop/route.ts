import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { requireRepository } from "@/lib/data";
import { shopForGap } from "@/lib/services/stylist-service";
import { GapSchema } from "@/lib/validation";

export const POST = handler(async (req: Request) => {
  const repo = await requireRepository();
  const { gap } = (await req.json()) as { gap: unknown };
  return NextResponse.json(await shopForGap(repo, GapSchema.parse(gap)));
});
