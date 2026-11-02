import type { Category } from "@/lib/types";

// Placeholder art for items without a photo (and product tiles without an
// image): a soft gradient in the garment's colour with a faint category glyph.

const GLYPH: Record<Category, string> = {
  top: "M38 22l-14 9 5 14 7-3v36h28V42l7 3 5-14-14-9c-2 5-7 8-12 8s-10-3-12-8z",
  outerwear: "M36 20l-14 9 4 50h18V44l6-14 6 14v35h18l4-50-14-9-6 6h-16z",
  bottom: "M34 20h32l4 60H56l-6-36-6 36H30z",
  one_piece: "M40 18h20l-3 14 13 48H30l13-48z",
  footwear: "M22 56c0-8 4-16 8-20l6 8c6 4 14 4 22 6l14 4c4 1 6 4 6 8v4H22z",
  accessory: "M50 26a24 24 0 100 48 24 24 0 100-48zm0 8a16 16 0 110 32 16 16 0 110-32zM44 14h12v12H44zM44 74h12v12H44z",
};

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  return `rgb(${c((n >> 16) & 255)}, ${c((n >> 8) & 255)}, ${c(n & 255)})`;
}

export function GarmentArt({ color, category, className = "" }: { color: string; category: Category; className?: string }) {
  const light = parseInt(color.slice(1, 3), 16) * 0.3 + parseInt(color.slice(3, 5), 16) * 0.59 + parseInt(color.slice(5, 7), 16) * 0.11 > 150;
  return (
    <div className={`relative h-full w-full ${className}`} style={{ background: `linear-gradient(145deg, ${shade(color, 0.1)} 0%, ${color} 45%, ${shade(color, -0.14)} 100%)` }}>
      <svg viewBox="0 0 100 100" className="absolute left-1/2 top-1/2 h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2" aria-hidden>
        <path d={GLYPH[category]} fill="none" stroke={light ? "rgba(0,0,0,0.10)" : "rgba(255,255,255,0.10)"} strokeWidth={2.2} strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export function ItemImage({ item, className = "" }: { item: { image_url: string | null; color_hex: string; category: Category; subcategory: string }; className?: string }) {
  return (
    <div className={`overflow-hidden ${className}`}>
      {item.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.image_url} alt={item.subcategory} draggable={false} className="h-full w-full object-cover" />
      ) : (
        <GarmentArt color={item.color_hex} category={item.category} />
      )}
    </div>
  );
}

export const titleCase = (s: string) => s.replace(/\b\w/g, (m) => m.toUpperCase());
