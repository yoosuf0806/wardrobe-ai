import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { requireRepository } from "@/lib/data";
import { claudeEnabled, describeClaudeError } from "@/lib/ai/claude";
import { tagGarment } from "@/lib/ai/tag-garment";

export const maxDuration = 60;
const TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** Vision-LLM attribute extraction. The client always shows the result for review before saving. */
export const POST = handler(async (req: Request) => {
  await requireRepository();
  if (!claudeEnabled()) return NextResponse.json({ ok: false, error: "AI tagging isn't configured – fill in the details manually." });
  const form = await req.formData();
  const file = form.get("image");
  if (!(file instanceof File)) return NextResponse.json({ error: "image is required" }, { status: 400 });
  const type = TYPES.find((t) => t === file.type);
  if (!type) return NextResponse.json({ error: "Use a JPEG, PNG or WebP image" }, { status: 415 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Image too large (max 5 MB)" }, { status: 413 });
  try {
    const result = await tagGarment(Buffer.from(await file.arrayBuffer()).toString("base64"), type);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ ok: false, error: describeClaudeError(err) });
  }
});
