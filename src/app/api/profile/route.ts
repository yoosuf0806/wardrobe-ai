import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { requireRepository } from "@/lib/data";
import { ProfilePatchSchema } from "@/lib/validation";

export const GET = handler(async () => {
  const repo = await requireRepository();
  return NextResponse.json({ profile: await repo.getProfile(), mode: repo.mode });
});

export const PATCH = handler(async (req: Request) => {
  const repo = await requireRepository();
  const patch = ProfilePatchSchema.parse(await req.json());
  return NextResponse.json({ profile: await repo.updateProfile(patch) });
});
