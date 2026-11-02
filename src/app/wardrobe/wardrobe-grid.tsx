"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ItemCard } from "@/components/item-card";
import { CATEGORIES, type WardrobeItem } from "@/lib/types";

export function WardrobeGrid({ items, initialCategory }: { items: WardrobeItem[]; initialCategory: string }) {
  const [cat, setCat] = useState(initialCategory);
  const [busy, setBusy] = useState<string | null>(null);
  const router = useRouter();
  const shown = cat === "all" ? items : items.filter((i) => i.category === cat);

  async function remove(id: string) {
    if (!confirm("Remove this item from your wardrobe?")) return;
    setBusy(id);
    await fetch(`/api/wardrobe/${id}`, { method: "DELETE" });
    setBusy(null);
    router.refresh();
  }

  return (
    <>
      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
        {["all", ...CATEGORIES].map((c) => (
          <button key={c} onClick={() => setCat(c)} className={`${cat === c ? "chip-on" : "chip"} shrink-0 capitalize`}>
            {c.replace("_", "-")}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="card text-sm text-muted">Nothing here yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {shown.map((i) => (
            <ItemCard
              key={i.id}
              item={i}
              footer={
                <div className="mt-1 flex items-center justify-between text-[11px] text-muted">
                  <span>worn {i.wear_count}×</span>
                  <button onClick={() => remove(i.id)} disabled={busy === i.id} className="hover:text-accent">
                    {busy === i.id ? "…" : "Remove"}
                  </button>
                </div>
              }
            />
          ))}
        </div>
      )}
    </>
  );
}
