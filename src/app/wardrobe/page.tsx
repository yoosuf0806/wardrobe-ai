import Link from "next/link";
import { redirect } from "next/navigation";
import { getRepository } from "@/lib/data";
import { WardrobeGrid } from "./wardrobe-grid";

export const dynamic = "force-dynamic";

export default async function WardrobePage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const repo = await getRepository();
  if (!repo) redirect("/login");
  const [items, { category }] = await Promise.all([repo.listItems(), searchParams]);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Wardrobe</h1>
        <Link href="/wardrobe/new" className="btn-primary py-2">
          + Add item
        </Link>
      </div>
      <WardrobeGrid items={items} initialCategory={category ?? "all"} />
    </div>
  );
}
