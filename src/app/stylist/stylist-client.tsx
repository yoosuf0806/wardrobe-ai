"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { GapCard } from "@/components/gap-card";
import { ItemCard } from "@/components/item-card";
import { OCCASIONS } from "@/lib/engine/occasions";
import type { RecommendResponse } from "@/lib/services/stylist-service";

type Loc = { lat: number; lon: number } | null;

export function StylistClient() {
  const params = useSearchParams();
  const [occasion, setOccasion] = useState(params.get("occasion") ?? OCCASIONS[3].label);
  const [custom, setCustom] = useState("");
  const [formality, setFormality] = useState<number | null>(null);
  const [loc, setLoc] = useState<Loc>(null);
  const [locState, setLocState] = useState<"idle" | "asking" | "ok" | "denied">("idle");
  const [manualTemp, setManualTemp] = useState<string>("");
  const [rain, setRain] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RecommendResponse | null>(null);
  const [logged, setLogged] = useState<Record<string, string>>({});
  const [rated, setRated] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    setLocState("asking");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLoc({ lat: p.coords.latitude, lon: p.coords.longitude });
        setLocState("ok");
      },
      () => setLocState("denied"),
      { maximumAge: 30 * 60_000, timeout: 8000 },
    );
  }, []);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          occasion: custom.trim() || occasion,
          formality,
          lat: loc?.lat ?? null,
          lon: loc?.lon ?? null,
          manual_temp_c: manualTemp === "" ? null : Number(manualTemp),
          manual_rain: rain,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something went wrong");
      setData(json);
      setLogged({});
      setRated({});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function wear(o: RecommendResponse["outfits"][number]) {
    const res = await fetch("/api/outfits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ occasion: data!.occasion.label, item_ids: o.item_ids, weather: data!.weather, stylist_note: o.note }),
    });
    if (res.ok) {
      const { log } = await res.json();
      setLogged((s) => ({ ...s, [o.id]: log.id }));
    }
  }

  async function rate(outfitId: string, rating: number) {
    const logId = logged[outfitId];
    if (!logId) return;
    setRated((r) => ({ ...r, [outfitId]: rating }));
    await fetch(`/api/outfits/${logId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ feedback: rating }) });
  }

  return (
    <div className="space-y-6">
      <section className="card space-y-4">
        <div>
          <label className="label">Occasion</label>
          <div className="flex flex-wrap gap-1.5">
            {OCCASIONS.map((o) => (
              <button key={o.key} onClick={() => { setOccasion(o.label); setCustom(""); }} className={occasion === o.label && !custom ? "chip-on" : "chip"}>
                {o.label}
              </button>
            ))}
          </div>
          <input className="input mt-2" placeholder="…or describe it: “outdoor engagement party at a vineyard”" value={custom} onChange={(e) => setCustom(e.target.value)} />
        </div>

        <details className="text-sm">
          <summary className="cursor-pointer text-muted">Fine-tune formality & weather</summary>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Formality {formality ? `(${formality}/10)` : "(auto)"}</label>
              <input type="range" min={1} max={10} value={formality ?? 5} onChange={(e) => setFormality(Number(e.target.value))} className="w-full accent-ink" />
              {formality && <button className="text-xs text-muted underline" onClick={() => setFormality(null)}>reset to auto</button>}
            </div>
            <div>
              <label className="label">Temperature override (°C)</label>
              <div className="flex items-center gap-2">
                <input className="input" type="number" inputMode="decimal" placeholder={locState === "ok" ? "live weather" : "e.g. 18"} value={manualTemp} onChange={(e) => setManualTemp(e.target.value)} />
                <label className="flex shrink-0 items-center gap-1.5 text-xs">
                  <input type="checkbox" checked={rain} onChange={(e) => setRain(e.target.checked)} /> rain
                </label>
              </div>
            </div>
          </div>
        </details>

        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted">
            {locState === "ok" ? "📍 Using your location for live weather" : locState === "asking" ? "Finding your location…" : "Location off – using a mild default or your override"}
          </span>
          <button onClick={run} disabled={loading} className="btn-primary">
            {loading ? "Styling…" : "Get outfits"}
          </button>
        </div>
      </section>

      {error && <p className="text-sm text-accent">{error}</p>}

      {data && (
        <section className="space-y-5">
          <div className="text-sm text-muted">
            <span className="font-medium text-ink">{data.occasion.label}</span> · formality {data.occasion.formality[0]}–{data.occasion.formality[1]} · {data.weather_summary}
            {data.weather.location_name ? ` in ${data.weather.location_name}` : ""}
            {data.weather.source === "default" && " (default – enable location or set a temperature)"}
          </div>
          {data.stylist_error && <p className="text-xs text-muted">AI stylist unavailable ({data.stylist_error}) – showing engine picks.</p>}

          {data.outfits.length === 0 && <div className="card text-sm">No complete outfit fits this occasion and weather yet. See what&apos;s missing below.</div>}

          {data.outfits.map((o, idx) => (
            <article key={o.id} className="card">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-display text-lg font-semibold">
                  <span className="mr-2 text-muted">{idx + 1}.</span>
                  {o.title}
                </h3>
                <span className="shrink-0 text-xs text-muted">{o.harmony.replace(/_/g, " ")} · F{o.formality}</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                {o.items.map(({ role, item }) => (
                  <ItemCard key={item.id} item={item} role={role} />
                ))}
              </div>
              <p className="mt-3 text-sm leading-relaxed">{o.note}</p>
              {!o.complete && <p className="mt-1 text-xs text-accent">Incomplete – a key piece is missing for this occasion.</p>}
              <div className="mt-3 flex items-center gap-3">
                {logged[o.id] ? (
                  <div className="flex items-center gap-1 text-sm">
                    <span className="mr-1 text-good">Logged ✓</span> Rate it:
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} onClick={() => rate(o.id, n)} className={`text-lg ${rated[o.id] && n <= rated[o.id] ? "text-accent" : "text-line"}`} aria-label={`${n} stars`}>
                        ★
                      </button>
                    ))}
                  </div>
                ) : (
                  <button onClick={() => wear(o)} className="btn-ghost py-2">
                    I&apos;m wearing this
                  </button>
                )}
              </div>
            </article>
          ))}

          {data.gaps.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-display text-xl font-semibold">Close the gap</h2>
              {data.gaps.map((g, i) => (
                <GapCard key={i} gap={g} />
              ))}
            </div>
          )}

          <p className="text-[11px] text-muted">
            Styled by {data.stylist === "claude" ? "Claude + rules engine" : "rules engine"}
            {data.excluded ? ` · ${data.excluded} items excluded by weather, formality or your fit preferences` : ""}
          </p>
        </section>
      )}
    </div>
  );
}
