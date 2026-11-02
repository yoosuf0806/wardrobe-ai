import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { requireRepository } from "@/lib/data";
import { embedImage, removeBackground } from "@/lib/media";
import { GarmentAttributesSchema } from "@/lib/validation";

export const maxDuration = 60;
const MAX_BYTES = 6 * 1024 * 1024;

export const GET = handler(async () => {
  const repo = await requireRepository();
  return NextResponse.json({ items: await repo.listItems() });
});

/** multipart/form-data: attributes (JSON string), image (optional file), ai_raw (optional JSON string) */
export const POST = handler(async (req: Request) => {
  const repo = await requireRepository();
  const form = await req.formData();
  const attrs = GarmentAttributesSchema.parse(JSON.parse(String(form.get("attributes") ?? "{}")));
  const file = form.get("image");
  let image = null;
  let embedding = null;
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "Image too large (max 6 MB)" }, { status: 413 });
    const raw = Buffer.from(await file.arrayBuffer());
    const cut = await removeBackground(raw);
    image = { data: cut.data, contentType: cut.removed ? cut.contentType : file.type || "image/jpeg" };
    embedding = await embedImage(cut.data);
  }
  const aiRaw = form.get("ai_raw") ? JSON.parse(String(form.get("ai_raw"))) : null;
  const item = await repo.addItem(attrs, image, embedding, aiRaw);
  return NextResponse.json({ item }, { status: 201 });
});
