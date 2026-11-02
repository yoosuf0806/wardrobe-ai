import { redirect } from "next/navigation";
import { StylistHome, type SavedLook } from "@/components/stylist-home";
import { getRepository } from "@/lib/data";
import { QUICK_OCCASIONS, canonicalOccasionLabel, resolveOccasion } from "@/lib/engine/occasions";
import { BODY_SHAPE_LABELS, type WardrobeItem } from "@/lib/types";

export const dynamic = "force-dynamic";

// Stylist (home): occasion chips + swipe deck + saved looks.
export default async function Home({ searchParams }: { searchParams: Promise<{ occasion?: string }> }) {
  const repo = await getRepository();
  if (!repo) redirect("/login");
  const [profile, items, logs, { occasion }] = await Promise.all([repo.getProfile(), repo.listItems(), repo.listLogs(30), searchParams]);

  // Start on the requested occasion, else the last one the user dressed for, else Office
  const last = logs[0] ? resolveOccasion(logs[0].occasion) : null;
  const initial = occasion ?? QUICK_OCCASIONS.find((o) => o.key === last?.key)?.label ?? QUICK_OCCASIONS[0].label;

  const byId = new Map(items.map((i) => [i.id, i]));
  const saved: SavedLook[] = logs.slice(0, 8).map((l) => ({
    id: l.id,
    occasion: canonicalOccasionLabel(l.occasion),
    worn_on: l.worn_on,
    items: l.item_ids.map((id) => byId.get(id)).filter((i): i is WardrobeItem => !!i),
  }));

  return (
    <StylistHome
      initialOccasion={initial}
      shapeLabel={profile.body_shape ? BODY_SHAPE_LABELS[profile.body_shape] : null}
      savedLooks={saved}
      demo={repo.mode === "demo"}
      styleDone={!!profile.style_profile.completed_at}
      itemCount={items.length}
    />
  );
}
