import type { LookPiece, PieceKind, StyleLook } from "@/lib/style/looks";

// Flat-lay illustration of a style-quiz look: each garment drawn in its real
// colour on a 100×100 grid, arranged like an outfit photographed from above.

const SHAPE: Record<PieceKind, string> = {
  tee: "M30 14 L13 25 L20 42 L30 38 L30 90 L70 90 L70 38 L80 42 L87 25 L70 14 Q62 24 50 24 Q38 24 30 14Z",
  shirt: "M33 10 L14 21 L9 74 L21 76 L30 42 L30 92 L70 92 L70 42 L79 76 L91 74 L86 21 L67 10 L58 18 L50 26 L42 18Z",
  blouse: "M34 12 L16 22 L12 66 L24 68 L31 40 L28 90 L72 90 L69 40 L76 68 L88 66 L84 22 L66 12 Q50 30 34 12Z",
  knit: "M34 12 L16 22 L10 74 L22 76 L30 42 L30 90 L70 90 L70 42 L78 76 L90 74 L84 22 L66 12 Q50 20 34 12Z",
  hoodie: "M36 16 Q36 4 50 4 Q64 4 64 16 L84 24 L90 76 L78 78 L70 44 L70 92 L30 92 L30 44 L22 78 L10 76 L16 24Z",
  blazer: "M33 8 L12 20 L8 78 L21 80 L28 42 L28 94 L72 94 L72 42 L79 80 L92 78 L88 20 L67 8 L50 46Z",
  coat: "M34 6 L14 18 L10 82 L22 84 L28 44 L26 98 L74 98 L72 44 L78 84 L90 82 L86 18 L66 6 L50 40Z",
  jacket: "M33 10 L14 20 L10 70 L22 72 L29 40 L29 84 L71 84 L71 40 L78 72 L90 70 L86 20 L67 10 L50 22Z",
  jeans: "M30 6 L70 6 L74 96 L56 96 L50 34 L44 96 L26 96Z",
  trousers: "M30 6 L70 6 L76 96 L57 96 L50 32 L43 96 L24 96Z",
  shorts: "M27 22 L73 22 L78 66 L55 66 L50 42 L45 66 L22 66Z",
  skirt: "M35 14 L65 14 L82 86 L18 86Z",
  dress: "M39 6 L61 6 L58 28 L78 94 L22 94 L42 28Z",
  sneakers: "M8 62 Q10 46 27 43 L38 51 Q54 55 71 57 L88 61 Q93 65 91 74 L8 74Z",
  boots: "M30 16 L54 16 L54 56 Q72 58 86 66 L86 80 L30 80Z",
  heels: "M14 70 L28 42 Q50 52 70 54 L84 58 L85 64 L75 66 L72 84 L67 84 L65 66 L22 70Z",
  loafers: "M8 64 Q12 49 31 49 Q60 51 85 59 Q91 63 89 72 L8 72Z",
  flats: "M10 66 Q14 54 30 54 Q60 55 84 61 Q90 65 88 71 L10 71Z",
  bag: "M18 42 L82 42 L86 90 L14 90Z M34 42 Q34 18 50 18 Q66 18 66 42",
  cap: "M18 62 Q20 30 50 30 Q80 30 80 62 L96 66 L18 66Z",
  hat: "M8 64 Q50 52 92 64 Q50 76 8 64Z M32 60 Q32 34 50 34 Q68 34 68 60",
  watch: "M50 22 A20 20 0 1 0 50.01 22Z M42 8 L58 8 L58 22 L42 22Z M42 78 L58 78 L58 92 L42 92Z",
};

type Slot = { x: number; y: number; s: number };
const SLOTS: Record<string, Slot> = {
  outer: { x: 4, y: 6, s: 92 },
  top: { x: 100, y: 8, s: 92 },
  bottom: { x: 22, y: 112, s: 112 },
  feet: { x: 120, y: 150, s: 74 },
  extra: { x: 128, y: 100, s: 54 },
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
    // a lone top (no jacket) takes the jacket's place on the left
    if (role === "top" && !hasOuter) role = "outer";
    if (role === "outer" && used.has("outer")) role = "top";
    used.add(role);
    return { ...p, slot: SLOTS[role] };
  });
}

export function FlatLay({ look, className = "" }: { look: StyleLook; className?: string }) {
  if (look.image_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={look.image_url} alt={look.title} className={`h-full w-full object-cover ${className}`} />;
  }
  return (
    <svg viewBox="0 0 200 250" className={`h-full w-full ${className}`} role="img" aria-label={`${look.title} outfit`}>
      <defs>
        <pattern id={`stripes-${look.id}`} width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="4" fill="#1F2A44" opacity="0.85" />
        </pattern>
        <pattern id={`floral-${look.id}`} width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="4" cy="4" r="2.2" fill="#F6E7C8" opacity="0.8" />
          <circle cx="12" cy="11" r="1.8" fill="#7A3E2A" opacity="0.5" />
        </pattern>
      </defs>
      <rect width="200" height="250" fill="#F1ECE4" />
      {place(look.pieces).map((p, i) => (
        <g key={i} transform={`translate(${p.slot.x} ${p.slot.y}) scale(${p.slot.s / 100})`}>
          <path d={SHAPE[p.kind]} fill={p.color} stroke="rgba(0,0,0,0.14)" strokeWidth={1.4} strokeLinejoin="round" fillRule="evenodd" />
          {p.pattern && <path d={SHAPE[p.kind]} fill={`url(#${p.pattern}-${look.id})`} />}
        </g>
      ))}
    </svg>
  );
}
