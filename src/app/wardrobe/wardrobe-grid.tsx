"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ItemImage, titleCase } from "@/components/garment-art";
import { GarmentForm, downscale, pickAttributes } from "@/components/garment-form";
import { IconPlus } from "@/components/icons";
import { isInLaundry } from "@/lib/engine/recommend";
import type { Category, GarmentAttributes, WardrobeItem } from "@/lib/types";

const TABS: { key: string; label: string; cats: Category[] }[] = [
  { key: "all", label: "All", cats: [] },
  { key: "top", label: "Tops", cats: ["top"] },
  { key: "bottom", label: "Bottoms", cats: ["bottom"] },
  { key: "one_piece", label: "Dresses", cats: ["one_piece"] },
  { key: "footwear", label: "Shoes", cats: ["footwear"] },
  { key: "outerwear", label: "Outerwear", cats: ["outerwear"] },
  { key: "accessory", label: "Accessories", cats: ["accessory"] },
];
const SECTION_ORDER: Category[] = ["top", "bottom", "one_piece", "footwear", "outerwear", "accessory"];
const SECTION_LABEL: Record<Category, string> = { top: "Tops", bottom: "Bottoms", one_piece: "Dresses", footwear: "Shoes", outerwear: "Outerwear", accessory: "Accessories" };

export function WardrobeGrid({ items, initialTab }: { items: WardrobeItem[]; initialTab: string }) {
  const router = useRouter();
  const [tab, setTab] = useState(initialTab === "laundry" ? "all" : initialTab);
  const [onlyLaundry, setOnlyLaundry] = useState(initialTab === "laundry");
  const [open, setOpen] = useState<WardrobeItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<GarmentAttributes | null>(null);

  function openItem(i: WardrobeItem | null) {
    setOpen(i);
    setEditing(null);
  }
  async function saveEdit() {
    if (!open || !editing) return;
    setBusy(true);
    await fetch(`/api/wardrobe/${open.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing) });
    setBusy(false);
    openItem(null);
    router.refresh();
  }
  async function changePhoto(file: File) {
    if (!open) return;
    setBusy(true);
    const { blob } = await downscale(file);
    const fd = new FormData();
    fd.append("image", blob, "garment.jpg");
    await fetch(`/api/wardrobe/${open.id}/photo`, { method: "POST", body: fd });
    setBusy(false);
    openItem(null);
    router.refresh();
  }

  const laundryCount = items.filter((i) => isInLaundry(i)).length;
  const tabs = TABS.filter((t) => t.key === "all" || items.some((i) => t.cats.includes(i.category)));
  const visible = items.filter((i) => (tab === "all" || i.category === tab) && (!onlyLaundry || isInLaundry(i)));

  async function setLaundry(ids: string[], inLaundry: boolean) {
    setBusy(true);
    await fetch("/api/laundry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ item_ids: ids, in_laundry: inLaundry }) });
    setBusy(false);
    openItem(null);
    router.refresh();
  }
  async function remove(id: string) {
    if (!confirm("Remove this piece from your wardrobe?")) return;
    setBusy(true);
    await fetch(`/api/wardrobe/${id}`, { method: "DELETE" });
    setBusy(false);
    openItem(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="eyebrow">
          {items.length} pieces ·{" "}
          <button onClick={() => setOnlyLaundry((v) => !v)} className={`uppercase tracking-[0.22em] ${onlyLaundry ? "text-accent underline" : ""}`} disabled={laundryCount === 0}>
            {laundryCount} in laundry
          </button>
        </p>
        <h1 className="display text-[44px]">Your wardrobe</h1>
      </header>

      <div className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto border-b border-line px-4 sm:-mx-6 sm:px-6" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 px-3 pb-3 pt-1 text-sm transition ${tab === t.key ? (t.key === "all" ? "" : "border-b-2 border-ink text-ink") : "text-muted hover:text-ink"}`}
          >
            {t.key === "all" ? <span className={`rounded-full px-3.5 py-1.5 ${tab === "all" ? "bg-ink text-white" : ""}`}>All</span> : t.label}
          </button>
        ))}
      </div>

      {onlyLaundry && laundryCount > 0 && (
        <div className="flex items-center justify-between rounded-2xl bg-accent-soft px-4 py-3 text-sm">
          <span>Showing pieces in the laundry. They come back automatically after 2 days.</span>
          <button className="btn-ghost shrink-0 py-1.5 text-xs" disabled={busy} onClick={() => setLaundry(items.filter((i) => isInLaundry(i)).map((i) => i.id), false)}>
            All clean
          </button>
        </div>
      )}

      {visible.length === 0 && (
        <div className="card text-center text-sm text-muted">
          Nothing here yet.{" "}
          <Link href="/wardrobe/new" className="text-ink underline">
            Add a piece
          </Link>
        </div>
      )}

      {SECTION_ORDER.map((cat) => {
        const list = visible.filter((i) => i.category === cat);
        if (list.length === 0) return null;
        return (
          <section key={cat} className="space-y-3">
            <h2 className="display text-[30px]">
              {SECTION_LABEL[cat]} <span className="text-muted">({list.length})</span>
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {list.map((i) => (
                <PieceCard key={i.id} item={i} onOpen={() => openItem(i)} />
              ))}
            </div>
          </section>
        );
      })}

      <Link href="/wardrobe/new" aria-label="Add a piece" className="fixed bottom-24 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-ink text-white shadow-[0_10px_30px_-8px_rgba(0,0,0,0.5)] transition hover:scale-105 sm:right-[max(1.25rem,calc(50%-17rem))]">
        <IconPlus className="h-6 w-6" />
      </Link>

      {open && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 sm:items-center" role="dialog" aria-modal="true" onClick={() => openItem(null)}>
          <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-[32px] bg-surface p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:rounded-[32px]" onClick={(e) => e.stopPropagation()}>
            <div className="flex gap-4">
              <ItemImage item={open} className="aspect-[4/5] w-28 shrink-0 rounded-2xl" />
              <div className="min-w-0 space-y-1.5">
                <p className="eyebrow">{SECTION_LABEL[open.category]}</p>
                <h3 className="display text-[28px]">{titleCase(open.subcategory)}</h3>
                <p className="text-sm text-muted">
                  {open.color_name} · {open.fabric_type || "fabric n/a"} · {open.fit} fit
                </p>
                <p className="text-sm text-muted">Worn {open.wear_count}×{open.last_worn_at ? ` · last ${new Date(open.last_worn_at).toLocaleDateString()}` : ""}</p>
              </div>
            </div>
            {editing ? (
              <div className="mt-6 space-y-4">
                <GarmentForm value={editing} onChange={setEditing} />
                <div className="flex gap-2">
                  <button className="btn-primary flex-1 py-3" disabled={busy || !editing.subcategory} onClick={saveEdit}>
                    {busy ? "Saving…" : "Save changes"}
                  </button>
                  <button className="btn-ghost py-3" onClick={() => setEditing(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
            <div className="mt-6 flex flex-col gap-2">
              <button className="btn-primary w-full py-3" disabled={busy} onClick={() => setLaundry([open.id], !isInLaundry(open))}>
                {isInLaundry(open) ? "Back in the closet" : "Put in the laundry"}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button className="btn-ghost py-3" disabled={busy} onClick={() => setEditing(pickAttributes(open))}>
                  Edit details
                </button>
                <label className={`btn-ghost cursor-pointer py-3 ${busy ? "pointer-events-none opacity-50" : ""}`}>
                  {busy ? "Uploading…" : "Change photo"}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && changePhoto(e.target.files[0])} />
                </label>
              </div>
              <button className="btn-ghost w-full py-3 text-accent" disabled={busy} onClick={() => remove(open.id)}>
                Remove from wardrobe
              </button>
            </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PieceCard({ item, onOpen }: { item: WardrobeItem; onOpen: () => void }) {
  const washing = isInLaundry(item);
  return (
    <button onClick={onOpen} className="rounded-[24px] border border-line bg-surface p-2.5 text-left shadow-[0_6px_20px_-12px_rgba(60,40,20,0.15)] transition hover:border-ink/30">
      <div className="relative">
        <ItemImage item={item} className="aspect-[4/5] rounded-[18px]" />
        <span className={`absolute left-2 top-2 rounded-full px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.16em] ${washing ? "bg-accent text-white" : "bg-surface/90 text-good"}`}>
          {washing ? "In laundry" : "Available"}
        </span>
      </div>
      <div className="space-y-2 px-1 pb-1 pt-3">
        <p className="truncate text-[15px] font-medium">{titleCase(item.subcategory)}</p>
        <div className="flex flex-wrap gap-1.5">
          <span className="pill">
            <span className="h-2 w-2 rounded-full border border-black/10" style={{ background: item.color_hex }} />
            {item.color_name}
          </span>
          <span className="pill capitalize">{item.pattern.replace(/_/g, " ")}</span>
        </div>
        <div>
          <div className="flex justify-between text-[10px] uppercase tracking-[0.16em] text-muted">
            <span>Formality</span>
            <span>{item.formality}/10</span>
          </div>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-sunken">
            <div className="h-full rounded-full bg-accent" style={{ width: `${item.formality * 10}%` }} />
          </div>
        </div>
      </div>
    </button>
  );
}
