import Link from "next/link";
import { redirect } from "next/navigation";
import { GarmentArt } from "@/components/garment-art";
import { IconExternal, IconStar } from "@/components/icons";
import { getRepository } from "@/lib/data";
import { buildShopBoard, type ShopPick } from "@/lib/services/shop-service";

export const dynamic = "force-dynamic";

function money(n: number | null, currency: string) {
  if (n === null) return "—";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
  } catch {
    return `${n} ${currency}`;
  }
}

export default async function ShopPage() {
  const repo = await getRepository();
  if (!repo) redirect("/login");
  const board = await buildShopBoard(repo);
  const total = board.within_budget.length + board.above_budget.length;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="eyebrow">Gap analysis</p>
        <h1 className="display text-[44px]">Pieces you&apos;re missing</h1>
        <p className="text-[15px] text-muted">Based on your occasions, wardrobe and what&apos;s currently in the laundry.</p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Budget per item" value={money(board.budget.max_per_item, board.budget.currency)}>
          <Link href="/profile#budget" className="text-xs text-accent">
            Adjust
          </Link>
        </Stat>
        <Stat label="Items in laundry" value={String(board.in_laundry)}>
          {board.in_laundry > 0 && (
            <Link href="/wardrobe?category=laundry" className="text-xs text-accent">
              View
            </Link>
          )}
        </Stat>
        <Stat label="Picks within budget" value={`${board.within_budget.length} / ${total}`} />
      </div>

      {total === 0 && (
        <div className="card text-center">
          <p className="display text-[28px]">Your wardrobe has you covered</p>
          <p className="mt-1 text-sm text-muted">No gaps for your main occasions right now.</p>
        </div>
      )}

      <div className="space-y-4">
        {board.within_budget.map((p, i) => (
          <PickCard key={i} pick={p} />
        ))}
      </div>

      {board.above_budget.length > 0 && (
        <section className="space-y-4 pt-2">
          <h2 className="display text-[32px]">Above your budget</h2>
          {board.above_budget.map((p, i) => (
            <PickCard key={i} pick={p} muted />
          ))}
        </section>
      )}

      <p className="text-[11px] leading-relaxed text-faint">
        As an Amazon Associate SmartStylist earns from qualifying purchases. Prices and availability can change.
        {board.provider === "mock" && " Demo listings — add SERPAPI_API_KEY for live Amazon results."}
      </p>
    </div>
  );
}

function Stat({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-[22px] border border-line bg-surface px-5 py-4">
      <p className="eyebrow text-[10px]">{label}</p>
      <p className="display mt-1 text-[34px]">{value}</p>
      {children}
    </div>
  );
}

function PickCard({ pick, muted = false }: { pick: ShopPick; muted?: boolean }) {
  const { gap, product } = pick;
  const href = product?.url ?? pick.search_url;
  return (
    <article className="card p-3.5">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[20px]">
        {product?.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image_url} alt={product.title} className="h-full w-full bg-white object-contain" />
        ) : (
          <GarmentArt color={gap.spec.color_hex} category={gap.spec.category} />
        )}
        <span className="absolute left-3 top-3 rounded-full bg-surface/95 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em]">{gap.occasion}</span>
      </div>
      <div className="space-y-1 px-1.5 pb-1 pt-4">
        <p className="text-[13px] text-accent">{gap.headline}</p>
        <p className="text-[15px] font-medium leading-snug">{product?.title ?? `${gap.spec.color_name} ${gap.spec.subcategory}`}</p>
        <p className="flex items-center gap-1 text-xs text-muted">
          {product?.rating ? (
            <>
              <IconStar className="h-3.5 w-3.5 text-[#d9a441]" /> {product.rating.toFixed(1)}
            </>
          ) : null}
          {product?.prime ? " · Prime" : ""}
          {gap.spec.size ? ` · size ${gap.spec.size}` : ""}
        </p>
        <div className="flex items-center justify-between pt-3">
          <span className="display text-[30px]">{money(product?.price ?? null, gap.spec.currency)}</span>
          <a href={href} target="_blank" rel="noopener noreferrer sponsored" className={`btn py-2 text-[13px] text-white ${muted ? "bg-muted hover:bg-ink" : "bg-ink hover:bg-black"}`}>
            {product ? "Buy on Amazon" : "Search Amazon"} <IconExternal className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </article>
  );
}
