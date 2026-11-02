"use client";
import { useState } from "react";
import type { StyleGap } from "@/lib/engine/gaps";
import type { RankedProduct } from "@/lib/shopping/types";

const TRIGGER_LABEL: Record<StyleGap["trigger"], string> = {
  incomplete_match: "Missing piece",
  formality_ceiling: "Not formal enough",
  weather: "Weather gap",
  wear_frequency: "Variety gap",
};

function money(n: number | null, currency: string) {
  if (n === null) return "Price n/a";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
  } catch {
    return `${n} ${currency}`;
  }
}

export function GapCard({ gap }: { gap: StyleGap }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [products, setProducts] = useState<RankedProduct[]>([]);
  const [provider, setProvider] = useState("");
  const [searchUrl, setSearchUrl] = useState("");

  async function find() {
    setState("loading");
    try {
      const res = await fetch("/api/shop", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gap }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setProducts(json.products);
      setProvider(json.provider);
      setSearchUrl(json.search_url);
      setState("done");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="card border-accent/30 bg-accent-soft/60">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 h-8 w-8 shrink-0 rounded-full border border-white shadow-sm" style={{ background: gap.spec.color_hex }} />
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-accent">{TRIGGER_LABEL[gap.trigger]}</div>
          <p className="mt-0.5 text-sm leading-relaxed">{gap.message}</p>
          {state === "idle" && (
            <button onClick={find} className="btn-primary mt-3 py-2">
              Show options under {money(gap.spec.max_price, gap.spec.currency)}
            </button>
          )}
          {state === "loading" && <p className="mt-3 text-sm text-muted">Searching stores…</p>}
          {state === "error" && <p className="mt-3 text-sm text-accent">Couldn&apos;t load products right now.</p>}
        </div>
      </div>
      {state === "done" && (
        <div className="mt-4 space-y-2">
          {products.length === 0 && <p className="text-sm text-muted">No matches within budget yet.</p>}
          {products.map((p) => (
            <a key={p.url} href={p.url} target="_blank" rel="noopener noreferrer sponsored" className="flex items-center gap-3 rounded-xl bg-surface p-2.5 hover:ring-1 hover:ring-line">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-canvas">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p.image_url ? <img src={p.image_url} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full" style={{ background: gap.spec.color_hex }} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{p.title}</div>
                <div className="text-xs text-muted">
                  {p.merchant ?? "Online store"} {p.rating ? `· ★ ${p.rating.toFixed(1)}` : ""}
                </div>
                <div className="truncate text-[11px] text-muted">{p.match_notes.join(" · ")}</div>
              </div>
              <div className={`text-sm font-semibold ${p.within_budget ? "text-good" : "text-accent"}`}>{money(p.price, p.currency)}</div>
            </a>
          ))}
          {searchUrl && (
            <a href={searchUrl} target="_blank" rel="noopener noreferrer sponsored" className="btn-ghost w-full py-2">
              See more on Amazon →
            </a>
          )}
          <p className="text-[11px] text-muted">
            {gap.spec.size ? `Searched in your size (${gap.spec.size}). ` : ""}
            As an Amazon Associate we earn from qualifying purchases. Prices may change.
            {provider === "mock" && " Demo listings – add a SERPAPI_API_KEY for live Amazon results."}
          </p>
        </div>
      )}
    </div>
  );
}
