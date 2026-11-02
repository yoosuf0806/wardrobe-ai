"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ItemCard } from "@/components/item-card";
import { isInLaundry } from "@/lib/engine/recommend";
import { CATEGORIES, type WardrobeItem } from "@/lib/types";

export function WardrobeGrid({ items, initialCategory }: { items: WardrobeItem[]; initialCategory: string }) {
  const [cat, setCat] = useState(initialCategory);
  const [busy, setBusy] = useState<string | null>(null);
  const router = useRouter();
  const laundryCount = items.filter((i) => isInLaundry(i)).length;
  const shown = cat === "all" ? items : cat === "laundry" ? items.filter((i) => isInLaundry(i)) : items.filter((i) => i.category === cat);

  async function remove(id: string) {
    if (!confirm("Remove this item from your wardrobe?")) return;
    setBusy(id);
    await fetch(`/api/wardrobe/${id}`, { method: "DELETE" });
    setBusy(null);
    router.refresh();
  }

  async function laundry(ids: string[], inLaundry: boolean) {
    setBusy(ids.length === 1 ? ids[0] : "all");
    await fetch("/api/laundry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ item_ids: ids, in_laundry: inLaundry }) });
    setBusy(null);
    router.refresh();
  }

  const filters = ["all", ...CATEGORIES, ...(laundryCount ? ["laundry"] : [])];

  return (
    <>
      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
        {filters.map((c) => (
          <button key={c} onClick={() => setCat(c)} className={`${cat === c ? "chip-on" : "chip"} shrink-0 capitalize`}>
            {c === "laundry" ? `🧺 Laundry (${laundryCount})` : c.replace("_", "-")}
          </button>
        ))}
      </div>
      {cat === "laundry" && laundryCount > 0 && (
        <button onClick={() => laundry(shown.map((i) => i.id), false)} disabled={busy === "all"} className="btn-ghost py-2">
          All clean – put everything back
        </button>
      )}
      {shown.length === 0 ? (
        <p className="card text-sm text-muted">Nothing here yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {shown.map((i) => {
            const washing = isInLaundry(i);
            return (
              <div key={i.id} className={washing ? "opacity-60" : ""}>
                <ItemCard
                  item={i}
                  footer={
                    <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-muted">
                      <button onClick={() => laundry([i.id], !washing)} disabled={busy === i.id} className="hover:text-ink">
                        {washing ? "🧺 Back in closet" : "🧺 Laundry"}
                      </button>
                      <button onClick={() => remove(i.id)} disabled={busy === i.id} className="hover:text-accent">
                        Remove
                      </button>
                    </div>
                  }
                />
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
