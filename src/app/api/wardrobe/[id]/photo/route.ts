import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { requireRepository } from "@/lib/data";
import { embedImage, removeBackground } from "@/lib/media";

type Ctx = { params: Promise<{ id: string }> };
const MAX_BYTES = 6 * 1024 * 1024;

/** Replace an item's photo (multipart: image). */
export const POST = handler(async (req: Request, ctx: Ctx) => {
  const repo = await requireRepository();
  const { id } = await ctx.params;
  const file = (await req.formData()).get("image");
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "image is required" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Image too large (max 6 MB)" }, { status: 413 });
  const cut = await removeBackground(Buffer.from(await file.arrayBuffer()));
  const image = { data: cut.data, contentType: cut.removed ? cut.contentType : file.type || "image/jpeg" };
  await repo.updateItemImage(id, image, await embedImage(cut.data));
  return NextResponse.json({ ok: true });
});
