// Studio-style product illustrations for garments, rendered as SVG in any
// colour/pattern. Used for the demo wardrobe, items without a photo, sample
// shop listings and the style quiz. Original artwork – no licensing needed.

export const ART_KINDS = [
  "tee", "tank", "shirt", "blouse", "knit", "hoodie", "blazer", "coat", "jacket",
  "jeans", "trousers", "shorts", "skirt", "dress",
  "sneakers", "runners", "loafers", "boots", "heels", "flats",
  "belt", "watch", "scarf", "bag", "cap", "hat",
] as const;
export type ArtKind = (typeof ART_KINDS)[number];
export type ArtPattern = "solid" | "stripes" | "vstripes" | "check" | "floral" | "denim" | "knit";

function hex(c: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(c);
  return m ? `#${m[1]}` : "#888888";
}
function shade(c: string, amt: number) {
  const n = parseInt(hex(c).slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt))));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, "0")).join("")}`;
}
function luminance(c: string) {
  const n = parseInt(hex(c).slice(1), 16);
  return (0.3 * ((n >> 16) & 255) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255)) / 255;
}

type Ctx = { c: string; d: string; dd: string; l: string; fill: string; stitch: string; light: boolean };

// --- shapes (400×400 canvas) ---------------------------------------------
const btn = (x: number, y: number, k: Ctx) => `<circle cx="${x}" cy="${y}" r="4.5" fill="${k.light ? "#d9d4cb" : shade(k.c, 0.55)}" stroke="${k.dd}" stroke-width="1"/>`;

const SHAPES: Record<ArtKind, (k: Ctx) => string> = {
  tee: (k) => `
    <path d="M140 70 C155 88 178 98 200 98 C222 98 245 88 260 70 L330 100 L356 168 L300 188 L290 166 L290 346 Q200 356 110 346 L110 166 L100 188 L44 168 L70 100 Z" fill="${k.fill}" stroke="${k.d}" stroke-width="2"/>
    <path d="M146 74 C162 94 182 104 200 104 C218 104 238 94 254 74" fill="none" stroke="${k.d}" stroke-width="7" stroke-linecap="round"/>
    <path d="M110 166 L117 96 M290 166 L283 96" stroke="${k.d}" stroke-width="1.6" fill="none"/>
    <path d="M114 336 Q200 346 286 336 M58 158 L104 176 M342 158 L296 176" stroke="${k.stitch}" stroke-width="1.6" stroke-dasharray="5 4" fill="none"/>
    <path d="M150 120 Q160 250 140 330" stroke="${k.l}" stroke-width="14" opacity=".18" fill="none" stroke-linecap="round"/>`,
  tank: (k) => `
    <path d="M150 58 L172 58 C176 116 224 116 228 58 L250 58 C252 112 274 130 292 142 L292 346 Q200 356 108 346 L108 142 C126 130 148 112 150 58Z" fill="${k.fill}" stroke="${k.d}" stroke-width="2"/>
    <path d="M154 62 C158 124 242 124 246 62 M112 146 C130 134 152 114 154 62 M288 146 C270 134 248 114 246 62" fill="none" stroke="${k.d}" stroke-width="4"/>
    <path d="M112 336 Q200 346 288 336" stroke="${k.stitch}" stroke-width="1.6" stroke-dasharray="5 4" fill="none"/>`,
  shirt: (k) => `
    <path d="M150 64 L200 90 L250 64 L318 92 Q340 100 345 130 L372 330 L330 338 L292 172 L292 352 L108 352 L108 172 L70 338 L28 330 L55 130 Q60 100 82 92 Z" fill="${k.fill}" stroke="${k.d}" stroke-width="2"/>
    <path d="M28 330 L70 338 L75 314 L32 306Z M372 330 L330 338 L325 314 L368 306Z" fill="${k.d}" opacity=".35"/>
    <path d="M200 96 L200 352" stroke="${k.d}" stroke-width="2"/>
    <path d="M206 96 L206 352" stroke="${k.stitch}" stroke-width="1.2" stroke-dasharray="4 4"/>
    ${[132, 174, 216, 258, 300, 338].map((y) => btn(200, y, k)).join("")}
    <path d="M226 140 h38 v40 q-19 7 -38 0z" fill="none" stroke="${k.d}" stroke-width="1.6"/>
    <path d="M150 64 L200 92 L174 122 L138 82 Z" fill="${shade(k.c, 0.06)}" stroke="${k.d}" stroke-width="1.8"/>
    <path d="M250 64 L200 92 L226 122 L262 82 Z" fill="${shade(k.c, 0.06)}" stroke="${k.d}" stroke-width="1.8"/>
    <path d="M108 172 L117 100 M292 172 L283 100" stroke="${k.d}" stroke-width="1.4" fill="none"/>`,
  blouse: (k) => `
    <path d="M150 64 Q200 150 250 64 L318 92 Q340 100 345 130 L364 300 L324 308 L292 172 L296 350 Q200 362 104 350 L108 172 L76 308 L36 300 L55 130 Q60 100 82 92 Z" fill="${k.fill}" stroke="${k.d}" stroke-width="2"/>
    <path d="M154 68 Q200 156 246 68" fill="none" stroke="${k.d}" stroke-width="4"/>
    <path d="M36 300 Q56 312 76 308 M364 300 Q344 312 324 308" stroke="${k.d}" stroke-width="5" fill="none"/>
    <path d="M150 200 Q200 214 250 200" stroke="${k.d}" stroke-width="1.4" fill="none" opacity=".6"/>
    <path d="M140 230 Q150 290 132 340" stroke="${k.l}" stroke-width="16" opacity=".16" fill="none" stroke-linecap="round"/>`,
  knit: (k) => `
    <path d="M148 64 C162 84 182 92 200 92 C218 92 238 84 252 64 L318 92 Q340 100 345 130 L372 330 L330 338 L292 172 L292 352 L108 352 L108 172 L70 338 L28 330 L55 130 Q60 100 82 92 Z" fill="${k.fill}" stroke="${k.d}" stroke-width="2"/>
    <path d="M150 68 C164 90 182 100 200 100 C218 100 236 90 250 68" fill="none" stroke="${k.d}" stroke-width="9"/>
    <path d="M108 328 L292 328 L292 352 L108 352Z M28 330 L70 338 L74 316 L32 308Z M372 330 L330 338 L326 316 L368 308Z" fill="${k.d}" opacity=".3"/>
    ${Array.from({ length: 23 }, (_, i) => `<path d="M${112 + i * 8} 330 V350" stroke="${k.dd}" stroke-width="1" opacity=".5"/>`).join("")}
    <path d="M108 172 L117 100 M292 172 L283 100" stroke="${k.d}" stroke-width="1.4" fill="none"/>`,
  hoodie: (k) => `
    <path d="M148 70 L318 92 Q340 100 345 130 L372 330 L330 338 L292 172 L292 352 L108 352 L108 172 L70 338 L28 330 L55 130 Q60 100 82 92 L148 70 L252 70Z" fill="${k.fill}" stroke="${k.d}" stroke-width="2"/>
    <path d="M146 76 Q140 18 200 14 Q260 18 254 76 Q230 104 200 104 Q170 104 146 76Z" fill="${shade(k.c, -0.12)}" stroke="${k.d}" stroke-width="2"/>
    <path d="M166 80 Q200 64 234 80 Q222 96 200 96 Q178 96 166 80Z" fill="${k.dd}" opacity=".55"/>
    <path d="M186 100 L182 170 M214 100 L218 170" stroke="${k.light ? "#cfc8bc" : shade(k.c, 0.5)}" stroke-width="3" stroke-linecap="round"/>
    <path d="M140 246 L260 246 L276 316 L124 316Z" fill="none" stroke="${k.d}" stroke-width="2"/>
    <path d="M108 328 L292 328 L292 352 L108 352Z" fill="${k.d}" opacity=".3"/>`,
  blazer: (k) => `
    <path d="M150 58 L200 68 L250 58 L320 86 Q342 96 346 126 L370 342 L330 348 L296 176 L300 372 L208 372 L200 360 L192 372 L100 372 L104 176 L70 348 L30 342 L54 126 Q58 96 80 86Z" fill="${k.fill}" stroke="${k.d}" stroke-width="2"/>
    <path d="M174 62 L200 204 L226 62 Q200 74 174 62Z" fill="#f5f2ec" stroke="${k.d}" stroke-width="1.4"/>
    <path d="M150 58 L176 62 L200 204 L166 142 L180 120 L148 102Z" fill="${shade(k.c, -0.08)}" stroke="${k.dd}" stroke-width="1.8"/>
    <path d="M250 58 L224 62 L200 204 L234 142 L220 120 L252 102Z" fill="${shade(k.c, -0.08)}" stroke="${k.dd}" stroke-width="1.8"/>
    <path d="M200 204 L200 360" stroke="${k.d}" stroke-width="1.6"/>
    ${btn(206, 238, k)}${btn(206, 284, k)}
    <path d="M122 292 h52 M226 292 h52 M236 152 h34" stroke="${k.d}" stroke-width="2.2"/>
    <path d="M30 342 L70 348 M370 342 L330 348" stroke="${k.d}" stroke-width="2"/>`,
  coat: (k) => `
    <path d="M150 50 L200 62 L250 50 L322 80 Q344 90 348 120 L372 352 L332 358 L298 170 L310 392 L90 392 L102 170 L68 358 L28 352 L52 120 Q56 90 78 80Z" fill="${k.fill}" stroke="${k.d}" stroke-width="2"/>
    <path d="M150 50 L178 56 L200 168 L160 128 L176 106 L144 92Z" fill="${shade(k.c, -0.08)}" stroke="${k.dd}" stroke-width="1.8"/>
    <path d="M250 50 L222 56 L200 168 L240 128 L224 106 L256 92Z" fill="${shade(k.c, -0.08)}" stroke="${k.dd}" stroke-width="1.8"/>
    <path d="M178 56 L200 168 L222 56 Q200 66 178 56Z" fill="${k.dd}" opacity=".5"/>
    <path d="M200 168 L200 392" stroke="${k.d}" stroke-width="1.6"/>
    ${[200, 246, 292].map((y) => btn(176, y, k) + btn(224, y, k)).join("")}
    <path d="M104 240 L296 240" stroke="${k.d}" stroke-width="10" opacity=".25"/>
    <path d="M118 318 l46 6 M282 318 l-46 6" stroke="${k.d}" stroke-width="2"/>`,
  jacket: (k) => `
    <path d="M150 60 L200 80 L250 60 L318 88 Q340 98 345 128 L368 300 L328 308 L294 170 L294 318 L106 318 L106 170 L72 308 L32 300 L55 128 Q60 98 82 88 Z" fill="${k.fill}" stroke="${k.d}" stroke-width="2"/>
    <path d="M150 60 L200 80 L172 112 L134 78Z M250 60 L200 80 L228 112 L266 78Z" fill="${shade(k.c, -0.06)}" stroke="${k.d}" stroke-width="1.8"/>
    <path d="M106 296 L294 296 L294 318 L106 318Z M32 300 L72 308 L76 288 L36 280Z M368 300 L328 308 L324 288 L364 280Z" fill="${k.d}" opacity=".3"/>
    <path d="M200 84 L200 318" stroke="${k.d}" stroke-width="2"/>
    ${[124, 168, 212, 256].map((y) => btn(208, y, k)).join("")}
    <path d="M128 136 h52 v40 h-52z M220 136 h52 v40 h-52z" fill="none" stroke="${k.stitch}" stroke-width="1.6" stroke-dasharray="4 3"/>
    <path d="M128 136 h52 v14 h-52z M220 136 h52 v14 h-52z" fill="${k.d}" opacity=".25"/>`,
  jeans: (k) => `
    <path d="M118 28 L282 28 L300 382 L218 382 L200 142 L182 382 L100 382 Z" fill="${k.fill}" stroke="${k.d}" stroke-width="2"/>
    <path d="M118 28 L282 28 L283 52 L117 52Z" fill="${shade(k.c, -0.08)}" stroke="${k.d}" stroke-width="1.6"/>
    <path d="M122 56 Q150 96 180 58 M278 56 Q250 96 220 58" fill="none" stroke="${k.stitch}" stroke-width="2"/>
    <path d="M200 52 L200 132 Q194 142 184 134" fill="none" stroke="${k.stitch}" stroke-width="2"/>
    <path d="M106 120 L102 380 M294 120 L298 380" stroke="${k.stitch}" stroke-width="1.6" stroke-dasharray="5 4"/>
    <path d="M100 366 L182 366 M218 366 L300 366" stroke="${k.stitch}" stroke-width="1.6" stroke-dasharray="5 4"/>
    ${[136, 184, 216, 264].map((x) => `<rect x="${x - 4}" y="24" width="8" height="32" rx="2" fill="${shade(k.c, -0.1)}" stroke="${k.d}"/>`).join("")}
    <circle cx="200" cy="40" r="6" fill="#b48a4a" stroke="#7a5a2a"/>
    <path d="M150 150 Q140 260 146 370" stroke="${k.l}" stroke-width="18" opacity=".14" fill="none" stroke-linecap="round"/>`,
  trousers: (k) => `
    <path d="M118 28 L282 28 L304 382 L220 382 L200 140 L180 382 L96 382 Z" fill="${k.fill}" stroke="${k.d}" stroke-width="2"/>
    <path d="M118 28 L282 28 L283 54 L117 54Z" fill="${shade(k.c, -0.08)}" stroke="${k.d}" stroke-width="1.6"/>
    <path d="M128 58 L150 116 M272 58 L250 116" stroke="${k.d}" stroke-width="2"/>
    <path d="M200 54 L200 128" stroke="${k.d}" stroke-width="1.6"/>
    <path d="M150 120 L140 380 M250 120 L260 380" stroke="${k.l}" stroke-width="2.5" opacity=".7"/>
    <path d="M150 120 L141 380 M250 120 L259 380" stroke="${k.d}" stroke-width="1" opacity=".5"/>
    ${btn(212, 41, k)}`,
  shorts: (k) => `
    <path d="M114 60 L286 60 L304 254 L216 254 L200 162 L184 254 L96 254Z" fill="${k.fill}" stroke="${k.d}" stroke-width="2"/>
    <path d="M114 60 L286 60 L287 86 L113 86Z" fill="${shade(k.c, -0.1)}" stroke="${k.d}" stroke-width="1.6"/>
    <path d="M176 70 Q200 112 224 70" fill="none" stroke="${k.light ? "#cfc8bc" : shade(k.c, 0.5)}" stroke-width="3"/>
    <path d="M98 238 L184 238 M216 238 L302 238" stroke="${k.stitch}" stroke-width="1.6" stroke-dasharray="5 4"/>
    <path d="M100 150 L110 254 M300 150 L290 254" stroke="${k.l}" stroke-width="6" opacity=".25"/>`,
  skirt: (k) => `
    <path d="M140 48 L260 48 L324 342 Q200 364 76 342Z" fill="${k.fill}" stroke="${k.d}" stroke-width="2"/>
    <path d="M140 48 L260 48 L262 74 L138 74Z" fill="${shade(k.c, -0.08)}" stroke="${k.d}" stroke-width="1.6"/>
    <path d="M168 74 L140 346 M200 74 L200 352 M232 74 L260 346" stroke="${k.d}" stroke-width="1.2" opacity=".45"/>
    <path d="M84 332 Q200 352 316 332" stroke="${k.stitch}" stroke-width="1.6" stroke-dasharray="5 4" fill="none"/>`,
  dress: (k) => `
    <path d="M156 28 L178 28 Q200 66 222 28 L244 28 L250 72 L286 98 L270 138 L250 124 Q258 150 250 172 L322 376 Q200 396 78 376 L150 172 Q142 150 150 124 L130 138 L114 98 L150 72Z" fill="${k.fill}" stroke="${k.d}" stroke-width="2"/>
    <path d="M160 32 Q200 76 240 32" fill="none" stroke="${k.d}" stroke-width="4"/>
    <path d="M150 172 Q200 184 250 172" stroke="${k.d}" stroke-width="5" fill="none" opacity=".55"/>
    <path d="M170 186 L130 370 M230 186 L270 370" stroke="${k.d}" stroke-width="1.2" opacity=".35"/>
    <path d="M86 366 Q200 386 314 366" stroke="${k.stitch}" stroke-width="1.6" stroke-dasharray="5 4" fill="none"/>`,
  sneakers: (k) => `
    <g transform="translate(18 -34) scale(.92)" opacity=".9">${sneaker(k, true)}</g>
    <g transform="translate(-6 30)">${sneaker(k, false)}</g>`,
  runners: (k) => `
    <g transform="translate(18 -34) scale(.92)" opacity=".9">${runner(k)}</g>
    <g transform="translate(-6 30)">${runner(k)}</g>`,
  loafers: (k) => `
    <g transform="translate(20 -36) scale(.92)" opacity=".9">${loafer(k)}</g>
    <g transform="translate(-6 28)">${loafer(k)}</g>`,
  boots: (k) => `
    <g transform="translate(70 -24) scale(.86)" opacity=".85">${boot(k)}</g>
    <g transform="translate(-30 30)">${boot(k)}</g>`,
  heels: (k) => `
    <g transform="translate(36 -56) scale(.9)" opacity=".85">${heel(k)}</g>
    <g transform="translate(-6 8)">${heel(k)}</g>`,
  flats: (k) => `
    <g transform="translate(20 -30) scale(.92)" opacity=".9">${flat(k)}</g>
    <g transform="translate(-6 26)">${flat(k)}</g>`,
  belt: (k) => `
    <path d="M60 210 Q60 120 200 120 Q340 120 340 210 Q340 300 200 300 Q120 300 92 262" fill="none" stroke="${k.d}" stroke-width="46" stroke-linecap="round"/>
    <path d="M60 210 Q60 120 200 120 Q340 120 340 210 Q340 300 200 300 Q120 300 92 262" fill="none" stroke="${k.c}" stroke-width="40" stroke-linecap="round"/>
    <path d="M60 210 Q60 120 200 120 Q340 120 340 210 Q340 300 200 300 Q120 300 92 262" fill="none" stroke="${k.stitch}" stroke-width="30" stroke-dasharray="4 5" opacity=".6"/>
    <path d="M60 210 Q60 120 200 120 Q340 120 340 210 Q340 300 200 300 Q120 300 92 262" fill="none" stroke="${k.c}" stroke-width="24"/>
    <rect x="34" y="176" width="54" height="64" rx="8" fill="none" stroke="#b9a37a" stroke-width="9"/>
    <path d="M61 180 L61 236" stroke="#9a835a" stroke-width="5"/>
    ${[150, 190, 230].map((x) => `<circle cx="${x}" cy="300" r="4" fill="${k.dd}"/>`).join("")}`,
  watch: (k) => `
    <rect x="168" y="18" width="64" height="364" rx="20" fill="${k.fill}" stroke="${k.d}" stroke-width="2"/>
    ${[50, 80, 320, 350].map((y) => `<path d="M174 ${y} h52" stroke="${k.dd}" stroke-width="1.5" opacity=".6"/>`).join("")}
    <circle cx="200" cy="200" r="76" fill="url(#metal)" stroke="#8d8d8d" stroke-width="2"/>
    <circle cx="200" cy="200" r="62" fill="${luminance(k.c) < 0.3 ? "#1d2a3a" : "#fbfaf6"}" stroke="#bdbdbd" stroke-width="2"/>
    ${Array.from({ length: 12 }, (_, i) => {
      const a = (i * Math.PI) / 6;
      return `<path d="M${200 + Math.sin(a) * 52} ${200 - Math.cos(a) * 52} L${200 + Math.sin(a) * 58} ${200 - Math.cos(a) * 58}" stroke="${luminance(k.c) < 0.3 ? "#e9e4da" : "#3a3a3a"}" stroke-width="${i % 3 === 0 ? 3 : 1.5}"/>`;
    }).join("")}
    <path d="M200 200 L200 158 M200 200 L232 214" stroke="${luminance(k.c) < 0.3 ? "#f0ebe0" : "#222"}" stroke-width="4" stroke-linecap="round"/>
    <circle cx="200" cy="200" r="5" fill="#c2703d"/>
    <rect x="274" y="190" width="14" height="20" rx="3" fill="#a9a9a9"/>`,
  scarf: (k) => `
    <path d="M168 196 L212 200 L196 360 L146 352Z" fill="${k.fill}" stroke="${k.d}" stroke-width="2"/>
    <path d="M206 198 L246 190 L268 344 L216 356Z" fill="${shade(k.c, -0.06)}" stroke="${k.d}" stroke-width="2"/>
    <path d="M118 128 Q200 44 282 128 Q306 182 262 204 Q200 226 138 204 Q94 182 118 128Z M150 136 Q200 92 250 136 Q262 168 236 178 Q200 190 164 178 Q138 168 150 136Z" fill="${k.fill}" fill-rule="evenodd" stroke="${k.d}" stroke-width="2"/>
    <path d="M180 186 Q200 214 228 190 L236 214 Q204 232 172 214Z" fill="${k.dd}" opacity=".55"/>
    ${Array.from({ length: 7 }, (_, i) => `<path d="M${148 + i * 7} ${353 + i * 1} v16 M${218 + i * 7} ${355 - i * 1.6} v16" stroke="${k.d}" stroke-width="2"/>`).join("")}
    <path d="M128 140 Q146 108 176 96" stroke="${k.l}" stroke-width="10" opacity=".25" fill="none" stroke-linecap="round"/>`,
  bag: (k) => `
    <path d="M140 150 Q140 60 200 60 Q260 60 260 150" fill="none" stroke="${k.d}" stroke-width="16"/>
    <path d="M140 150 Q140 60 200 60 Q260 60 260 150" fill="none" stroke="${k.c}" stroke-width="11"/>
    <path d="M76 150 L324 150 L346 362 Q200 376 54 362Z" fill="${k.fill}" stroke="${k.d}" stroke-width="2"/>
    <path d="M80 172 L320 172" stroke="${k.stitch}" stroke-width="1.6" stroke-dasharray="5 4"/>
    <rect x="182" y="190" width="36" height="20" rx="3" fill="#c9b48a" stroke="#8d7a52"/>
    <path d="M60 350 Q200 362 340 350" stroke="${k.stitch}" stroke-width="1.6" stroke-dasharray="5 4" fill="none"/>`,
  cap: (k) => `
    <path d="M200 236 L372 226 Q388 252 364 266 L200 262Z" fill="${shade(k.c, -0.1)}" stroke="${k.d}" stroke-width="2"/>
    <path d="M70 240 Q76 98 210 96 Q328 98 334 236 Z" fill="${k.fill}" stroke="${k.d}" stroke-width="2"/>
    <path d="M210 96 Q190 160 200 236 M210 96 Q262 150 300 232 M210 96 Q140 150 112 238" stroke="${k.d}" stroke-width="1.4" fill="none" opacity=".6"/>
    <circle cx="210" cy="96" r="8" fill="${k.d}"/>
    <path d="M74 232 Q200 250 332 228" stroke="${k.stitch}" stroke-width="1.6" stroke-dasharray="5 4" fill="none"/>`,
  hat: (k) => `
    <ellipse cx="200" cy="246" rx="176" ry="58" fill="${k.fill}" stroke="${k.d}" stroke-width="2"/>
    <path d="M122 240 Q118 120 200 116 Q282 120 278 240 Q200 262 122 240Z" fill="${shade(k.c, -0.04)}" stroke="${k.d}" stroke-width="2"/>
    <path d="M124 214 Q200 236 276 214 L278 238 Q200 260 122 238Z" fill="${k.dd}" opacity=".7"/>`,
};

function sneaker(k: Ctx, back: boolean) {
  const sole = k.light ? "#e7e2d8" : "#f4f2ee";
  return `
    <path d="M40 252 Q42 204 92 192 L152 176 Q178 204 218 208 L302 218 Q356 226 362 264 L362 282 L40 282Z" fill="${k.fill}" stroke="${k.d}" stroke-width="2"/>
    <path d="M34 274 L368 274 Q370 302 340 302 L62 302 Q34 302 34 274Z" fill="${sole}" stroke="#bdb6aa" stroke-width="2"/>
    <path d="M40 290 L364 290" stroke="#cfc8bc" stroke-width="1.5"/>
    <path d="M150 182 Q182 214 226 214" fill="none" stroke="${k.d}" stroke-width="2"/>
    ${back ? "" : [0, 1, 2, 3].map((i) => `<path d="M${168 + i * 16} ${192 + i * 5} l14 -12" stroke="${k.light ? "#cfc8bc" : "#f4f1ea"}" stroke-width="3" stroke-linecap="round"/>`).join("")}
    <path d="M300 222 Q340 232 356 262" fill="none" stroke="${k.d}" stroke-width="1.6"/>
    <path d="M44 250 Q60 236 92 236" fill="none" stroke="${k.stitch}" stroke-width="1.6" stroke-dasharray="4 3"/>`;
}
function runner(k: Ctx) {
  return `
    <path d="M38 250 Q44 200 96 188 L156 170 Q182 202 220 206 L306 214 Q358 222 364 262 L364 278 L38 278Z" fill="${k.fill}" stroke="${k.d}" stroke-width="2"/>
    <path d="M30 268 L370 266 Q374 306 336 308 L58 308 Q28 306 30 268Z" fill="#f2f0ea" stroke="#bdb6aa" stroke-width="2"/>
    <path d="M30 292 Q200 284 372 288" stroke="#c2703d" stroke-width="5" fill="none" opacity=".8"/>
    <path d="M110 254 Q200 214 300 246" stroke="${k.light ? "#3a3a3a" : "#f4f1ea"}" stroke-width="10" fill="none" stroke-linecap="round" opacity=".85"/>
    ${[0, 1, 2, 3].map((i) => `<path d="M${170 + i * 15} ${188 + i * 5} l13 -12" stroke="${k.light ? "#555" : "#f4f1ea"}" stroke-width="3" stroke-linecap="round"/>`).join("")}`;
}
function loafer(k: Ctx) {
  return `
    <path d="M44 264 Q50 222 112 214 Q200 206 292 224 Q354 236 362 268 L362 282 L44 282Z" fill="${k.fill}" stroke="${k.d}" stroke-width="2"/>
    <path d="M40 276 L366 276 L364 294 L42 294Z" fill="${k.dd}"/>
    <path d="M44 290 L96 290 L96 304 L50 304Z" fill="${k.dd}"/>
    <path d="M150 218 Q214 254 300 230" fill="none" stroke="${k.d}" stroke-width="2.4"/>
    <path d="M156 222 Q214 258 296 236" fill="none" stroke="${k.stitch}" stroke-width="1.4" stroke-dasharray="3 3"/>
    <path d="M196 226 L250 230 L248 244 L198 240Z" fill="${shade(k.c, -0.15)}" stroke="${k.d}" stroke-width="1.4"/>
    <path d="M70 236 Q90 226 120 224" stroke="${k.l}" stroke-width="6" opacity=".35" fill="none" stroke-linecap="round"/>`;
}
function boot(k: Ctx) {
  return `
    <path d="M92 72 L212 72 L216 202 Q302 206 350 242 Q366 256 362 282 L92 286Z" fill="${k.fill}" stroke="${k.d}" stroke-width="2"/>
    <path d="M170 92 L212 92 L214 190 L174 196Z" fill="${k.dd}" opacity=".7"/>
    <path d="M92 72 L212 72 L212 84 L92 84Z" fill="${k.d}"/>
    <path d="M196 60 L222 60 L220 84 L198 84Z" fill="${k.d}"/>
    <path d="M84 280 L366 278 L364 300 L86 302Z" fill="#2a221c"/>
    <path d="M86 300 L140 300 L140 316 L90 316Z" fill="#2a221c"/>
    <path d="M110 110 Q100 200 112 270" stroke="${k.l}" stroke-width="10" opacity=".22" fill="none" stroke-linecap="round"/>`;
}
function heel(k: Ctx) {
  return `
    <path d="M40 350 Q40 330 84 324 L150 314 Q192 304 216 274 Q238 248 272 246 L326 246 Q344 248 344 268 L342 292 L306 296 Q264 300 232 318 Q182 346 120 354 L54 358 Q40 358 40 350Z" fill="${k.fill}" stroke="${k.d}" stroke-width="2"/>
    <path d="M216 274 Q252 262 300 270 Q330 276 342 292 L306 296 Q264 300 232 318 Q222 300 216 274Z" fill="${k.dd}" opacity=".85"/>
    <path d="M42 356 Q126 354 230 320 Q270 300 342 292" fill="none" stroke="${k.dd}" stroke-width="5"/>
    <path d="M314 294 L340 292 L330 362 L320 362Z" fill="${k.dd}"/>
    <path d="M318 362 h16" stroke="#222" stroke-width="5" stroke-linecap="round"/>
    <path d="M82 330 Q130 318 170 312" stroke="${k.l}" stroke-width="6" opacity=".35" fill="none" stroke-linecap="round"/>`;
}
function flat(k: Ctx) {
  return `
    <path d="M44 268 Q52 236 112 230 Q200 224 292 238 Q352 248 360 272 L360 282 L44 282Z" fill="${k.fill}" stroke="${k.d}" stroke-width="2"/>
    <path d="M110 238 Q200 268 300 244" fill="none" stroke="${k.d}" stroke-width="2"/>
    <path d="M42 280 L362 280 L360 292 L44 292Z" fill="${k.dd}"/>
    <path d="M184 246 q16 -14 32 0 q-16 14 -32 0z" fill="${k.dd}" opacity=".6"/>`;
}

function patternDefs(p: ArtPattern, k: Ctx, accent: string) {
  switch (p) {
    case "stripes":
      return `<pattern id="pt" width="22" height="22" patternUnits="userSpaceOnUse"><rect width="22" height="22" fill="${k.c}"/><rect y="12" width="22" height="7" fill="${accent}"/></pattern>`;
    case "vstripes":
      return `<pattern id="pt" width="18" height="18" patternUnits="userSpaceOnUse"><rect width="18" height="18" fill="${k.c}"/><rect x="11" width="3" height="18" fill="${accent}" opacity=".8"/></pattern>`;
    case "check":
      return `<pattern id="pt" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="${k.c}"/><rect width="40" height="12" fill="${accent}" opacity=".35"/><rect width="12" height="40" fill="${accent}" opacity=".35"/></pattern>`;
    case "floral":
      return `<pattern id="pt" width="44" height="44" patternUnits="userSpaceOnUse"><rect width="44" height="44" fill="${k.c}"/>${[[10, 10], [32, 30]].map(([x, y]) => `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map((a) => `<ellipse rx="3.4" ry="6" transform="rotate(${a}) translate(0 -5)" fill="#f6e7c8" opacity=".85"/>`).join("")}<circle r="2.4" fill="${accent}"/></g>`).join("")}</pattern>`;
    case "denim":
      return `<pattern id="pt" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="6" height="6" fill="${k.c}"/><rect width="2" height="6" fill="${shade(k.c, 0.12)}" opacity=".55"/></pattern>`;
    case "knit":
      return `<pattern id="pt" width="10" height="12" patternUnits="userSpaceOnUse"><rect width="10" height="12" fill="${k.c}"/><path d="M0 0 L5 6 L10 0 M0 6 L5 12 L10 6" stroke="${shade(k.c, -0.12)}" stroke-width="1" fill="none" opacity=".6"/></pattern>`;
    default:
      return "";
  }
}

/** Full SVG document for a garment. */
export function garmentSvg(kind: ArtKind, color: string, pattern: ArtPattern = "solid", accent = "#1F2A44", transparent = false): string {
  const c = hex(color);
  const light = luminance(c) > 0.82;
  const k: Ctx = {
    c,
    d: light ? shade(c, -0.22) : shade(c, -0.3),
    dd: shade(c, -0.45),
    l: shade(c, 0.45),
    fill: pattern === "solid" ? "url(#fab)" : "url(#pt)",
    stitch: light ? shade(c, -0.3) : shade(c, 0.35),
    light,
  };
  const shadowY = ["sneakers", "runners", "loafers", "boots", "heels", "flats"].includes(kind) ? 336 : kind === "hat" ? 300 : 388;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="800" height="800">
<defs>
  <radialGradient id="bg" cx="50%" cy="38%" r="75%"><stop offset="0" stop-color="#f8f5f0"/><stop offset="1" stop-color="#e9e3d9"/></radialGradient>
  <linearGradient id="fab" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${shade(c, 0.1)}"/><stop offset=".55" stop-color="${c}"/><stop offset="1" stop-color="${shade(c, -0.14)}"/></linearGradient>
  <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></linearGradient>
  <linearGradient id="metal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f2f2f2"/><stop offset=".5" stop-color="#bdbdbd"/><stop offset="1" stop-color="#8e8e8e"/></linearGradient>
  <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9"/></filter>
  ${patternDefs(pattern, k, accent)}
</defs>
${transparent ? "" : `<rect width="400" height="400" fill="url(#bg)"/>`}
<ellipse cx="200" cy="${shadowY}" rx="150" ry="14" fill="#5a4630" opacity=".18" filter="url(#soft)"/>
<g>${SHAPES[kind](k)}</g>
${transparent ? "" : `<rect width="400" height="400" fill="url(#sheen)" opacity=".35" style="mix-blend-mode:soft-light"/>`}
</svg>`;
}

// --- mapping from wardrobe data ------------------------------------------

const KIND_KEYWORDS: [RegExp, ArtKind][] = [
  [/tank|vest top|camisole/i, "tank"],
  [/hoodie|sweatshirt/i, "hoodie"],
  [/sweater|jumper|knit|crewneck|cardigan|merino|pullover/i, "knit"],
  [/blouse/i, "blouse"],
  [/shirt dress|midi dress|dress|gown|frock|jumpsuit/i, "dress"],
  [/t-?shirt|\btee\b|polo/i, "tee"],
  [/oxford|button|shirt|linen shirt/i, "shirt"],
  [/top/i, "tee"],
  [/blazer|suit jacket|sport coat/i, "blazer"],
  [/overcoat|trench|coat|parka/i, "coat"],
  [/jacket|overshirt|bomber|windbreaker/i, "jacket"],
  [/jean|denim/i, "jeans"],
  [/short/i, "shorts"],
  [/skirt/i, "skirt"],
  [/trouser|chino|pant|jogger|legging|slack/i, "trousers"],
  [/running|trainer|athletic shoe/i, "runners"],
  [/sneaker/i, "sneakers"],
  [/loafer|oxford shoe|derby|brogue|dress shoe/i, "loafers"],
  [/boot/i, "boots"],
  [/heel|pump|stiletto/i, "heels"],
  [/flat|sandal|mule/i, "flats"],
  [/belt/i, "belt"],
  [/watch/i, "watch"],
  [/scarf|shawl/i, "scarf"],
  [/bag|tote|purse|backpack|clutch/i, "bag"],
  [/cap/i, "cap"],
  [/hat/i, "hat"],
];

const CATEGORY_DEFAULT: Record<string, ArtKind> = {
  top: "tee",
  bottom: "trousers",
  one_piece: "dress",
  footwear: "sneakers",
  outerwear: "jacket",
  accessory: "bag",
};

export function artKindFor(category: string, subcategory: string): ArtKind {
  const hit = KIND_KEYWORDS.find(([re, kind]) => re.test(subcategory) && compatible(kind, category));
  return hit ? hit[1] : CATEGORY_DEFAULT[category] ?? "tee";
}

function compatible(kind: ArtKind, category: string) {
  const groups: Record<string, ArtKind[]> = {
    top: ["tee", "tank", "shirt", "blouse", "knit", "hoodie"],
    outerwear: ["blazer", "coat", "jacket", "hoodie", "knit", "shirt"],
    bottom: ["jeans", "trousers", "shorts", "skirt"],
    one_piece: ["dress"],
    footwear: ["sneakers", "runners", "loafers", "boots", "heels", "flats"],
    accessory: ["belt", "watch", "scarf", "bag", "cap", "hat"],
  };
  return groups[category]?.includes(kind) ?? true;
}

export function artPatternFor(pattern: string, fabric: string): ArtPattern {
  if (pattern === "horizontal_stripes") return "stripes";
  if (pattern === "vertical_stripes") return "vstripes";
  if (pattern === "check") return "check";
  if (pattern === "floral") return "floral";
  if (/denim/i.test(fabric)) return "denim";
  if (/knit|merino|wool|cashmere/i.test(fabric) && pattern === "solid") return "knit";
  return "solid";
}

/** URL of the illustration for a garment (served by /art/[kind]/[file]). */
export function artUrl(g: { category: string; subcategory: string; color_hex: string; pattern?: string; fabric_type?: string; secondary_colors?: string[] }): string {
  const kind = artKindFor(g.category, g.subcategory);
  const pat = artPatternFor(g.pattern ?? "solid", g.fabric_type ?? "");
  const accent = g.secondary_colors?.[0]?.replace("#", "");
  const q = [pat !== "solid" ? `p=${pat}` : "", accent && pat !== "solid" ? `a=${accent}` : ""].filter(Boolean).join("&");
  return `/art/${kind}/${hex(g.color_hex).slice(1).toUpperCase()}.svg${q ? `?${q}` : ""}`;
}

export function artUrlForKind(kind: ArtKind, color: string, pattern: ArtPattern = "solid", transparent = false): string {
  const q = [pattern !== "solid" ? `p=${pattern}` : "", transparent ? "t=1" : ""].filter(Boolean).join("&");
  return `/art/${kind}/${hex(color).slice(1).toUpperCase()}.svg${q ? `?${q}` : ""}`;
}
