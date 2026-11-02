import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { requireRepository } from "@/lib/data";
import { claudeEnabled, describeClaudeError } from "@/lib/ai/claude";
import { readOutfit } from "@/lib/ai/read-outfit";

export const maxDuration = 60;
const TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** Read the pieces of an outfit photo (the image itself is not stored). */
export const POST = handler(async (req: Request) => {
  await requireRepository();
  if (!claudeEnabled()) return NextResponse.json({ ok: false, error: "AI reading isn't configured – add the pieces yourself." });
  const file = (await req.formData()).get("image");
  if (!(file instanceof File)) return NextResponse.json({ error: "image is required" }, { status: 400 });
  const type = TYPES.find((t) => t === file.type);
  if (!type) return NextResponse.json({ error: "Use a JPEG, PNG or WebP image" }, { status: 415 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Image too large (max 5 MB)" }, { status: 413 });
  try {
    return NextResponse.json(await readOutfit(Buffer.from(await file.arrayBuffer()).toString("base64"), type));
  } catch (err) {
    return NextResponse.json({ ok: false, error: describeClaudeError(err) });
  }
});
