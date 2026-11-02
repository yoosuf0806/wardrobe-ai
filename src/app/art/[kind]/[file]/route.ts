import { ART_KINDS, garmentSvg, type ArtKind, type ArtPattern } from "@/lib/samples/garments";

const PATTERNS: ArtPattern[] = ["solid", "stripes", "vstripes", "check", "floral", "denim", "knit"];

/** GET /art/shirt/1F2A44.svg?p=stripes&a=FFFFFF – product illustration in any colour. */
export async function GET(req: Request, ctx: { params: Promise<{ kind: string; file: string }> }) {
  const { kind, file } = await ctx.params;
  const color = /^([0-9a-fA-F]{6})\.svg$/.exec(file)?.[1];
  if (!ART_KINDS.includes(kind as ArtKind) || !color) return new Response("Not found", { status: 404 });
  const url = new URL(req.url);
  const p = url.searchParams.get("p") as ArtPattern | null;
  const a = url.searchParams.get("a");
  const svg = garmentSvg(kind as ArtKind, `#${color}`, p && PATTERNS.includes(p) ? p : "solid", a && /^[0-9a-fA-F]{6}$/.test(a) ? `#${a}` : undefined, url.searchParams.get("t") === "1");
  return new Response(svg, {
    headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
