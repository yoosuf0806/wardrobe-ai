import Link from "next/link";
import { redirect } from "next/navigation";
import { GapCard } from "@/components/gap-card";
import { OutfitRequest } from "@/components/outfit-request";
import { getRepository } from "@/lib/data";
import { analyzeWearFrequency } from "@/lib/engine/gaps";
import { isInLaundry } from "@/lib/engine/recommend";

export const dynamic = "force-dynamic";

// Landing screen after login: ask for the occasion, then deal the swipe deck.
export default async function Home({ searchParams }: { searchParams: Promise<{ occasion?: string }> }) {
  const repo = await getRepository();
  if (!repo) redirect("/login");
  const [profile, items, logs, { occasion }] = await Promise.all([repo.getProfile(), repo.listItems(), repo.listLogs(60), searchParams]);
  const insights = analyzeWearFrequency(logs, items, profile).slice(0, 2);
  const laundry = items.filter((i) => isInLaundry(i)).length;

  const steps = [
    { done: !!profile.body_shape, label: "Analyse your body shape", href: "/body" },
    { done: items.filter((i) => i.category !== "accessory").length >= 6, label: "Add at least 6 pieces of clothing", href: "/wardrobe/new" },
    { done: items.some((i) => i.category === "footwear"), label: "Add a pair of shoes", href: "/wardrobe/new" },
    { done: !!(profile.sizes.top || profile.sizes.shoe || profile.sizes.bottom_waist), label: "Add your sizes for better shopping matches", href: "/settings" },
  ].filter((s) => !s.done);

  return (
    <div className="space-y-6">
      {repo.mode === "demo" && (
        <div className="rounded-xl border border-dashed border-line px-3 py-2 text-xs text-muted">
          Demo mode – sample wardrobe, resets on restart. Add Supabase keys in <code>.env.local</code> to enable accounts.
        </div>
      )}

      <OutfitRequest initialOccasion={occasion} />

      {laundry > 0 && (
        <Link href="/wardrobe?category=laundry" className="block text-xs text-muted hover:text-ink">
          🧺 {laundry} item{laundry === 1 ? "" : "s"} in the laundry – tap to put back in the closet
        </Link>
      )}

      {steps.length > 0 && (
        <section className="card">
          <h2 className="font-medium">Finish setting up</h2>
          <ul className="mt-2 space-y-1.5">
            {steps.map((s) => (
              <li key={s.label}>
                <Link href={s.href} className="flex items-center justify-between text-sm hover:underline">
                  {s.label} <span aria-hidden>→</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {insights.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold">Wardrobe insights</h2>
          {insights.map((g, i) => (
            <GapCard key={i} gap={g} />
          ))}
        </section>
      )}
    </div>
  );
}
