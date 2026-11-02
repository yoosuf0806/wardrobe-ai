import { NextResponse } from "next/server";
import { z } from "zod";
import { handler } from "@/lib/api";
import { requireRepository } from "@/lib/data";
import { CATEGORIES, PATTERNS } from "@/lib/types";

const Body = z.object({
  occasion: z.enum(["office", "casual_date", "formal_event", "party", "gym"]).nullable(),
  pieces: z
    .array(
      z.object({
        category: z.enum(CATEGORIES),
        subcategory: z.string().min(1).max(40),
        color_hex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
        color_name: z.string().max(30),
        pattern: z.enum(PATTERNS),
      }),
    )
    .min(2)
    .max(6),
  // small client-made thumbnail (data: URL, ≤ 40 KB)
  thumb: z.string().max(60_000).regex(/^data:image\/(jpeg|webp|png);base64,/).nullable(),
});

export const GET = handler(async () => {
  const repo = await requireRepository();
  return NextResponse.json({ inspirations: await repo.listInspirations() });
});

export const POST = handler(async (req: Request) => {
  const repo = await requireRepository();
  const body = Body.parse(await req.json());
  return NextResponse.json({ inspiration: await repo.addInspiration(body) }, { status: 201 });
});
