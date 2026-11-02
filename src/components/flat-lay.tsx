import { artUrlForKind, type ArtPattern } from "@/lib/samples/garments";
import type { LookPiece, PieceKind, StyleLook } from "@/lib/style/looks";

// Flat-lay of a style-quiz look: each piece is a studio product illustration,
// arranged like an outfit photographed from above. A look with `image_url`
// (curated photo) is shown as-is instead.

type Slot = { x: number; y: number; s: number };
const SLOTS: Record<string, Slot> = {
  outer: { x: -6, y: 2, s: 116 },
  top: { x: 88, y: 0, s: 116 },
  bottom: { x: 10, y: 98, s: 136 },
  feet: { x: 104, y: 150, s: 100 },
  extra: { x: 118, y: 92, s: 72 },
};
const ROLE: Record<PieceKind, keyof typeof SLOTS> = {
  coat: "outer", blazer: "outer", jacket: "outer", hoodie: "outer",
  tee: "top", shirt: "top", blouse: "top", knit: "top",
  jeans: "bottom", trousers: "bottom", shorts: "bottom", skirt: "bottom", dress: "bottom",
  sneakers: "feet", boots: "feet", heels: "feet", loafers: "feet", flats: "feet",
  bag: "extra", cap: "extra", hat: "extra", watch: "extra",
};

function place(pieces: LookPiece[]): (LookPiece & { slot: Slot })[] {
  const used = new Set<string>();
  const hasOuter = pieces.some((p) => ROLE[p.kind] === "outer");
  return pieces.map((p) => {
    let role = ROLE[p.kind];
    if (role === "top" && !hasOuter) role = "outer";
    if (role === "outer" && used.has("outer")) role = "top";
    used.add(role);
    return { ...p, slot: SLOTS[role] };
  });
}

const PATTERN: Record<NonNullable<LookPiece["pattern"]>, ArtPattern> = { stripes: "stripes", floral: "floral" };

export function FlatLay({ look, className = "" }: { look: StyleLook; className?: string }) {
  if (look.image_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={look.image_url} alt={look.title} className={`h-full w-full object-cover ${className}`} />;
  }
  // bottoms first so tops/jackets and shoes overlap them naturally
  const placed = place(look.pieces).sort((a, b) => Number(b.slot === SLOTS.bottom) - Number(a.slot === SLOTS.bottom));
  return (
    <svg viewBox="0 0 200 250" className={`h-full w-full ${className}`} role="img" aria-label={`${look.title} outfit`}>
      <defs>
        <radialGradient id={`bg-${look.id}`} cx="50%" cy="40%" r="75%">
          <stop offset="0" stopColor="#f8f5f0" />
          <stop offset="1" stopColor="#e9e3d9" />
        </radialGradient>
      </defs>
      <rect width="200" height="250" fill={`url(#bg-${look.id})`} />
      {placed.map((p, i) => (
        <image
          key={i}
          href={artUrlForKind(p.kind, p.color, p.pattern ? PATTERN[p.pattern] : "solid", true)}
          x={p.slot.x}
          y={p.slot.y}
          width={p.slot.s}
          height={p.slot.s}
          preserveAspectRatio="xMidYMid meet"
        />
      ))}
    </svg>
  );
}
