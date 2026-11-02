import type { WardrobeItem } from "@/lib/types";

export function ItemThumb({ item, className = "" }: { item: WardrobeItem; className?: string }) {
  return (
    <div className={`relative aspect-[5/6] overflow-hidden rounded-xl bg-canvas ${className}`}>
      {item.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.image_url} alt={`${item.color_name} ${item.subcategory}`} className="h-full w-full object-cover" />
      ) : (
        <div className="h-full w-full" style={{ background: item.color_hex }} />
      )}
      <span className="absolute bottom-1.5 left-1.5 h-3.5 w-3.5 rounded-full border border-white shadow" style={{ background: item.color_hex }} />
    </div>
  );
}

export function ItemCard({ item, role, footer }: { item: WardrobeItem; role?: string; footer?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <ItemThumb item={item} />
      <div className="mt-1.5 px-0.5">
        {role && <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">{role}</div>}
        <div className="truncate text-sm capitalize">{item.subcategory || item.category}</div>
        <div className="truncate text-xs text-muted">
          {item.color_name} · F{item.formality}
        </div>
        {footer}
      </div>
    </div>
  );
}
