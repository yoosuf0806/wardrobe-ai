import { redirect } from "next/navigation";
import { getRepository } from "@/lib/data";
import { WardrobeGrid } from "./wardrobe-grid";

export const dynamic = "force-dynamic";

export default async function WardrobePage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const repo = await getRepository();
  if (!repo) redirect("/login");
  const [items, { category }] = await Promise.all([repo.listItems(), searchParams]);
  return <WardrobeGrid items={items} initialTab={category ?? "all"} />;
}
