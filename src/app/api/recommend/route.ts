import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { requireRepository } from "@/lib/data";
import { recommend } from "@/lib/services/stylist-service";
import { RecommendRequestSchema } from "@/lib/validation";

export const maxDuration = 60;

export const POST = handler(async (req: Request) => {
  const repo = await requireRepository();
  const body = RecommendRequestSchema.parse(await req.json());
  return NextResponse.json(await recommend(repo, body));
});
