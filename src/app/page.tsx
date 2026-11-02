import Link from "next/link";
import { redirect } from "next/navigation";
import { GapCard } from "@/components/gap-card";
import { getRepository } from "@/lib/data";
import { analyzeWearFrequency } from "@/lib/engine/gaps";
import { BODY_SHAPE_LABELS, type Category } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  const repo = await getRepository();
  if (!repo) redirect("/login");
  const [profile, items, logs] = await Promise.all([repo.getProfile(), repo.listItems(), repo.listLogs(60)]);
  const gaps = analyzeWearFrequency(logs, items, profile).slice(0, 2);
  const count = (c: Category) => items.filter((i) => i.category === c).length;

  const steps = [
    { done: !!profile.body_shape, label: "Analyse your body shape", href: "/body" },
    { done: items.length >= 6, label: "Add at least 6 wardrobe items", href: "/wardrobe/new" },
    { done: count("footwear") > 0, label: "Add a pair of shoes", href: "/wardrobe/new" },
  ].filter((s) => !s.done);

  return (
    <div className="space-y-6">
      {repo.mode === "demo" && (
        <div className="rounded-xl border border-dashed border-line px-3 py-2 text-xs text-muted">
          Demo mode – sample wardrobe, data resets on restart. Add Supabase keys in <code>.env.local</code> to enable accounts.
        </div>
      )}

      <section>
        <h1 className="font-display text-3xl font-semibold tracking-tight">What are we dressing for today?</h1>
        <p className="mt-1 text-muted">
          {items.length} pieces · {profile.body_shape ? `${BODY_SHAPE_LABELS[profile.body_shape]} profile` : "body shape not set"}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {["Business casual / Office", "Casual day out", "Date night", "Wedding guest", "Gym / Workout"].map((o) => (
            <Link key={o} href={`/stylist?occasion=${encodeURIComponent(o)}`} className="chip py-2 text-sm hover:border-ink">
              {o}
            </Link>
          ))}
        </div>
        <Link href="/stylist" className="btn-primary mt-4 w-full sm:w-auto">
          Style me
        </Link>
      </section>

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

      <section className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {(["top", "bottom", "one_piece", "footwear", "outerwear", "accessory"] as Category[]).map((c) => (
          <Link key={c} href={`/wardrobe?category=${c}`} className="card p-3 text-center hover:border-ink">
            <div className="text-xl font-semibold">{count(c)}</div>
            <div className="text-[11px] capitalize text-muted">{c.replace("_", "-")}s</div>
          </Link>
        ))}
      </section>

      {gaps.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold">Wardrobe insights</h2>
          {gaps.map((g, i) => (
            <GapCard key={i} gap={g} />
          ))}
        </section>
      )}
    </div>
  );
}
