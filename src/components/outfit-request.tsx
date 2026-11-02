"use client";
import { useEffect, useMemo, useState } from "react";
import { GapCard } from "@/components/gap-card";
import { SwipeCard, type SwipeDir } from "@/components/swipe-card";
import type { OutfitView, RecommendResponse } from "@/lib/services/stylist-service";
import type { WardrobeItem } from "@/lib/types";

type Phase = "pick" | "loading" | "deck" | "laundry" | "accepted" | "exhausted";
type Loc = { lat: number; lon: number } | null;

const QUICK = ["Business casual / Office", "Party / Night out", "Casual day out", "Date night", "Dinner at a nice restaurant", "Wedding guest", "Job interview", "Gym / Workout"];

/**
 * Login → "What's the occasion?" → swipe deck of 3 outfits.
 * Right = wear it (logged). Left = not today. After all 3 are rejected, ask
 * whether any of the pieces are in the laundry, then deal 3 more outfits that
 * avoid everything already suggested.
 */
export function OutfitRequest({ initialOccasion }: { initialOccasion?: string }) {
  const [phase, setPhase] = useState<Phase>("pick");
  const [occasion, setOccasion] = useState(initialOccasion ?? "");
  const [custom, setCustom] = useState("");
  const [loc, setLoc] = useState<Loc>(null);
  const [manualTemp, setManualTemp] = useState("");
  const [rain, setRain] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [data, setData] = useState<RecommendResponse | null>(null);
  const [deck, setDeck] = useState<OutfitView[]>([]);
  const [index, setIndex] = useState(0);
  const [forced, setForced] = useState<SwipeDir | null>(null);
  const [round, setRound] = useState(1);
  const [shownOutfits, setShownOutfits] = useState<string[]>([]);
  const [rejectedItems, setRejectedItems] = useState<string[]>([]);
  const [unavailable, setUnavailable] = useState<string[]>([]);
  const [laundryPick, setLaundryPick] = useState<string[]>([]);
  const [accepted, setAccepted] = useState<{ outfit: OutfitView; logId: string | null } | null>(null);
  const [rating, setRating] = useState(0);

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition((p) => setLoc({ lat: p.coords.latitude, lon: p.coords.longitude }), () => {}, { maximumAge: 30 * 60_000, timeout: 8000 });
  }, []);

  useEffect(() => {
    if (initialOccasion) request(initialOccasion, { fresh: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keyboard: ← reject, → accept
  useEffect(() => {
    if (phase !== "deck") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") setForced("left");
      if (e.key === "ArrowRight") setForced("right");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  const occasionLabel = custom.trim() || occasion;
  const clothesOf = (o: OutfitView) => o.items.filter((i) => i.role !== "Accessory");

  async function request(occ: string, opts: { fresh?: boolean; excludeItems?: string[]; avoidItems?: string[]; seen?: string[] } = {}) {
    setPhase("loading");
    setError(null);
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          occasion: occ,
          lat: loc?.lat ?? null,
          lon: loc?.lon ?? null,
          manual_temp_c: manualTemp === "" ? null : Number(manualTemp),
          manual_rain: rain,
          exclude_item_ids: opts.fresh ? [] : opts.excludeItems ?? unavailable,
          avoid_item_ids: opts.fresh ? [] : opts.avoidItems ?? rejectedItems,
          exclude_outfit_ids: opts.fresh ? [] : opts.seen ?? shownOutfits,
        }),
      });
      const json = (await res.json()) as RecommendResponse & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Something went wrong");
      const fresh = json.outfits.filter((o) => o.complete);
      setData(json);
      if (opts.fresh) {
        setRound(1);
        setShownOutfits(fresh.map((o) => o.id));
        setRejectedItems([]);
        setUnavailable([]);
      } else {
        setRound((r) => r + 1);
        setShownOutfits((s) => [...s, ...fresh.map((o) => o.id)]);
      }
      setDeck(fresh);
      setIndex(0);
      setForced(null);
      setPhase(fresh.length ? "deck" : "exhausted");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setPhase("pick");
    }
  }

  function start(occ: string) {
    setOccasion(occ);
    setCustom("");
    request(occ, { fresh: true });
  }

  async function onSwipe(dir: SwipeDir) {
    const outfit = deck[index];
    setForced(null);
    const swipe = { occasion: data!.occasion.label, item_ids: outfit.item_ids, decision: dir === "right" ? "accept" : "reject", round };
    fetch("/api/swipes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(swipe) }).catch(() => {});

    if (dir === "right") {
      setAccepted({ outfit, logId: null });
      setRating(0);
      setPhase("accepted");
      const res = await fetch("/api/outfits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ occasion: data!.occasion.label, item_ids: outfit.item_ids, weather: data!.weather, stylist_note: outfit.note }),
      });
      if (res.ok) {
        const { log } = await res.json();
        setAccepted({ outfit, logId: log.id });
      }
      return;
    }

    const newlyRejected = clothesOf(outfit).map((i) => i.item.id);
    setRejectedItems((r) => [...new Set([...r, ...newlyRejected])]);
    if (index + 1 < deck.length) setIndex(index + 1);
    else {
      setLaundryPick([]);
      setPhase("laundry");
    }
  }

  // Distinct clothing items from the batch the user just rejected
  const batchItems = useMemo(() => {
    const m = new Map<string, WardrobeItem>();
    for (const o of deck) for (const { item } of clothesOf(o)) m.set(item.id, item);
    return [...m.values()];
  }, [deck]);

  async function continueAfterLaundry(markLaundry: boolean) {
    let excl = unavailable;
    if (markLaundry && laundryPick.length) {
      await fetch("/api/laundry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ item_ids: laundryPick, in_laundry: true }) });
      excl = [...new Set([...unavailable, ...laundryPick])];
      setUnavailable(excl);
    }
    request(data!.occasion.label, { excludeItems: excl });
  }

  async function rate(n: number) {
    setRating(n);
    if (accepted?.logId) await fetch(`/api/outfits/${accepted.logId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ feedback: n }) });
  }

  function reset() {
    setPhase("pick");
    setData(null);
    setDeck([]);
    setAccepted(null);
  }

  // ---------------------------------------------------------------- render
  if (phase === "pick" || phase === "loading") {
    return (
      <section className="space-y-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">What&apos;s the occasion?</h1>
          <p className="mt-1 text-sm text-muted">Pick one and swipe through outfits from your wardrobe.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {QUICK.map((o) => (
            <button key={o} disabled={phase === "loading"} onClick={() => start(o)} className={`${occasion === o && !custom ? "chip-on" : "chip"} py-2 text-sm`}>
              {o}
            </button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (custom.trim()) request(custom.trim(), { fresh: true });
          }}
        >
          <input className="input" placeholder="Something else? e.g. “beach wedding”" value={custom} onChange={(e) => setCustom(e.target.value)} />
          <button className="btn-primary shrink-0" disabled={!custom.trim() || phase === "loading"}>
            Go
          </button>
        </form>
        <details className="text-sm">
          <summary className="cursor-pointer text-muted">{loc ? "📍 Live weather from your location" : "Weather: set temperature"}</summary>
          <div className="mt-2 flex items-center gap-2">
            <input className="input max-w-40" type="number" inputMode="decimal" placeholder="°C override" value={manualTemp} onChange={(e) => setManualTemp(e.target.value)} />
            <label className="flex items-center gap-1.5 text-xs">
              <input type="checkbox" checked={rain} onChange={(e) => setRain(e.target.checked)} /> rain
            </label>
          </div>
        </details>
        {phase === "loading" && <p className="text-sm text-muted">Putting outfits together for {occasionLabel || "you"}…</p>}
        {error && <p className="text-sm text-accent">{error}</p>}
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold leading-tight">{data?.occasion.label}</h1>
          <p className="text-xs text-muted">
            {data?.weather_summary}
            {data?.weather.location_name ? ` · ${data.weather.location_name}` : ""}
          </p>
        </div>
        <button onClick={reset} className="btn-ghost shrink-0 py-1.5 text-xs">
          Change
        </button>
      </div>

      {phase === "deck" && (
        <>
          <div className="text-xs text-muted">
            <span>
              Outfit {index + 1} of {deck.length}
              {round > 1 ? ` · round ${round}` : ""}
            </span>
            {data?.relaxed && <span className="block">Reusing your {data.relaxed_categories.map((c) => (c === "footwear" ? "shoes" : c.replace("_", "-") + "s")).join(" & ")} – you&apos;ve seen the rest</span>}
          </div>
          <div className="relative mx-auto h-[min(54dvh,520px)] w-full max-w-sm">
            {deck
              .map((o, i) => ({ o, i }))
              .filter(({ i }) => i >= index && i < index + 3)
              .reverse()
              .map(({ o, i }) => (
                <SwipeCard key={o.id} outfit={o} active={i === index} depth={i - index} forced={i === index ? forced : null} onSwipe={onSwipe} />
              ))}
          </div>
          <div className="flex items-center justify-center gap-8">
            <button onClick={() => setForced("left")} aria-label="Not today" className="flex h-16 w-16 items-center justify-center rounded-full border border-line bg-surface text-2xl text-accent shadow hover:scale-105">
              ✕
            </button>
            <button onClick={() => setForced("right")} aria-label="Wear it" className="flex h-16 w-16 items-center justify-center rounded-full bg-ink text-2xl text-white shadow hover:scale-105">
              ♥
            </button>
          </div>
          <p className="text-center text-[11px] text-muted">Swipe right to wear it · left if it&apos;s not today</p>
        </>
      )}

      {phase === "accepted" && accepted && (
        <div className="card space-y-3 text-center">
          <div className="text-4xl">✨</div>
          <h2 className="font-display text-xl font-semibold">Great choice – {accepted.outfit.title}</h2>
          <div className="flex justify-center gap-2">
            {accepted.outfit.items.map(({ item }) => (
              <div key={item.id} className="h-16 w-14 overflow-hidden rounded-lg bg-canvas">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {item.image_url ? <img src={item.image_url} alt={item.subcategory} className="h-full w-full object-cover" /> : <div className="h-full w-full" style={{ background: item.color_hex }} />}
              </div>
            ))}
          </div>
          <p className="text-sm text-muted">{accepted.outfit.note}</p>
          <div className="text-sm">
            How did it feel?{" "}
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => rate(n)} aria-label={`${n} stars`} className={`text-xl ${n <= rating ? "text-accent" : "text-line"}`}>
                ★
              </button>
            ))}
          </div>
          <button onClick={reset} className="btn-ghost">
            Plan another occasion
          </button>
        </div>
      )}

      {phase === "exhausted" && (
        <div className="card space-y-2 text-sm">
          <p className="font-medium">That&apos;s every combination that works for this occasion right now.</p>
          <p className="text-muted">Some pieces may be in the laundry or missing. Here&apos;s what would open up more options:</p>
          <button onClick={() => request(data!.occasion.label, { fresh: true })} className="btn-ghost mt-1 py-2">
            Start over
          </button>
        </div>
      )}

      {(phase === "exhausted" || (phase === "deck" && round === 1)) && data && data.gaps.length > 0 && (
        <div className="space-y-3 pt-2">
          <h2 className="font-display text-lg font-semibold">Close the gap</h2>
          {data.gaps.map((g, i) => (
            <GapCard key={i} gap={g} />
          ))}
        </div>
      )}

      {phase === "laundry" && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="laundry-title">
          <div className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-3xl">
            <h2 id="laundry-title" className="font-display text-xl font-semibold">
              None of those today?
            </h2>
            <p className="mt-1 text-sm text-muted">Is any of this in the laundry? Tap the pieces and we&apos;ll leave them out.</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {batchItems.map((item) => {
                const on = laundryPick.includes(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => setLaundryPick((p) => (on ? p.filter((x) => x !== item.id) : [...p, item.id]))}
                    className={`relative overflow-hidden rounded-xl border-2 text-left ${on ? "border-accent" : "border-transparent"}`}
                    aria-pressed={on}
                  >
                    <div className="aspect-square bg-canvas">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {item.image_url ? <img src={item.image_url} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full" style={{ background: item.color_hex }} />}
                    </div>
                    <div className="truncate px-1 py-1 text-[11px] capitalize">{item.subcategory}</div>
                    {on && <span className="absolute right-1 top-1 rounded-full bg-accent px-1.5 text-[10px] font-semibold text-white">🧺</span>}
                  </button>
                );
              })}
            </div>
            <div className="mt-5 flex flex-col gap-2">
              <button disabled={laundryPick.length === 0} onClick={() => continueAfterLaundry(true)} className="btn-primary w-full">
                {laundryPick.length ? `Mark ${laundryPick.length} as in laundry & show more` : "Select items in the laundry"}
              </button>
              <button onClick={() => continueAfterLaundry(false)} className="btn-ghost w-full">
                Skip – show me more outfits
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
