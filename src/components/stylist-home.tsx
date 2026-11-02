"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ItemImage, titleCase } from "@/components/garment-art";
import { IconCheck, IconRain, IconSparkle, IconSun, IconX } from "@/components/icons";
import { QUICK_OCCASIONS } from "@/lib/engine/occasions";
import type { OutfitView, RecommendResponse } from "@/lib/services/stylist-service";
import type { WardrobeItem, Weather } from "@/lib/types";

export interface SavedLook {
  id: string;
  occasion: string;
  worn_on: string;
  items: WardrobeItem[];
}

type Phase = "loading" | "deck" | "laundry" | "accepted" | "exhausted" | "error";
type Dir = "left" | "right";
const STORE_KEY = "smartstylist.occasion";
const ROLE_LABEL: Record<string, string> = { Top: "Top", Bottom: "Bottom", "Dress / One-piece": "Dress", Shoes: "Footwear", Outerwear: "Outerwear", Accessory: "Accessory" };

function weatherPhrase(w: Weather) {
  const parts = [`${Math.round(w.temp_c)}°C`];
  if (w.rain_probability >= 0.5) parts.push("rain likely");
  else if (w.humidity >= 70) parts.push("humid");
  else if (w.humidity <= 35) parts.push("dry");
  else parts.push(w.condition.toLowerCase() === "clear" ? "clear skies" : w.condition.toLowerCase());
  if (w.wind_kph !== null) parts.push(w.wind_kph < 6 ? "calm" : w.wind_kph < 20 ? "light breeze" : w.wind_kph < 35 ? "breezy" : "windy");
  return parts.join(", ");
}

export function StylistHome({ initialOccasion, shapeLabel, savedLooks: initialSaved, demo, styleDone }: { initialOccasion: string; shapeLabel: string | null; savedLooks: SavedLook[]; demo: boolean; styleDone: boolean }) {
  const [occasion, setOccasion] = useState(initialOccasion);
  const [otherOpen, setOtherOpen] = useState(false);
  const [otherText, setOtherText] = useState("");
  const [tempOverride, setTempOverride] = useState<string>("");
  const [loc, setLoc] = useState<{ lat: number; lon: number } | null>(null);
  const locReady = useRef<Promise<void> | null>(null);

  const [phase, setPhase] = useState<Phase>("loading");
  const [data, setData] = useState<RecommendResponse | null>(null);
  const [deck, setDeck] = useState<OutfitView[]>([]);
  const [index, setIndex] = useState(0);
  const [round, setRound] = useState(1);
  const [shown, setShown] = useState<string[]>([]);
  const [rejectedItems, setRejectedItems] = useState<string[]>([]);
  const [unavailable, setUnavailable] = useState<string[]>([]);
  const [laundryPick, setLaundryPick] = useState<string[]>([]);
  const [accepted, setAccepted] = useState<{ outfit: OutfitView; logId: string | null; rating: number } | null>(null);
  const [saved, setSaved] = useState<SavedLook[]>(initialSaved);
  const [error, setError] = useState<string | null>(null);

  // Location: wait briefly so the first deck uses live weather, but never block on it
  useEffect(() => {
    locReady.current = new Promise<void>((resolve) => {
      if (!("geolocation" in navigator)) return resolve();
      const t = setTimeout(resolve, 2500);
      navigator.geolocation.getCurrentPosition(
        (p) => {
          setLoc({ lat: p.coords.latitude, lon: p.coords.longitude });
          clearTimeout(t);
          resolve();
        },
        () => {
          clearTimeout(t);
          resolve();
        },
        { maximumAge: 30 * 60_000, timeout: 2500 },
      );
    });
  }, []);
  const locRef = useRef(loc);
  locRef.current = loc;

  const request = useCallback(
    async (occ: string, opts: { fresh: boolean; excludeItems?: string[]; avoidItems?: string[]; seen?: string[] }) => {
      setPhase("loading");
      setError(null);
      await locReady.current;
      try {
        const res = await fetch("/api/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            occasion: occ,
            lat: locRef.current?.lat ?? null,
            lon: locRef.current?.lon ?? null,
            manual_temp_c: tempOverride === "" ? null : Number(tempOverride),
            exclude_item_ids: opts.fresh ? [] : opts.excludeItems ?? [],
            avoid_item_ids: opts.fresh ? [] : opts.avoidItems ?? [],
            exclude_outfit_ids: opts.fresh ? [] : opts.seen ?? [],
          }),
        });
        const json = (await res.json()) as RecommendResponse & { error?: string };
        if (res.status === 401) return void (location.href = "/login");
        if (!res.ok) throw new Error(json.error ?? "Something went wrong");
        const fresh = json.outfits.filter((o) => o.complete);
        setData(json);
        setDeck(fresh);
        setIndex(0);
        if (opts.fresh) {
          setRound(1);
          setShown(fresh.map((o) => o.id));
          setRejectedItems([]);
          setUnavailable([]);
        } else {
          setRound((r) => r + 1);
          setShown((s) => [...s, ...fresh.map((o) => o.id)]);
        }
        setPhase(fresh.length ? "deck" : "exhausted");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
        setPhase("error");
      }
    },
    [tempOverride],
  );

  useEffect(() => {
    request(occasion, { fresh: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pick(occ: string) {
    setOccasion(occ);
    setOtherOpen(false);
    try {
      localStorage.setItem(STORE_KEY, occ);
    } catch {}
    request(occ, { fresh: true });
  }

  const clothesOf = (o: OutfitView) => o.items.filter((i) => i.role !== "Accessory");

  async function decide(dir: Dir) {
    const outfit = deck[index];
    if (!outfit || !data) return;
    fetch("/api/swipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ occasion: data.occasion.label, item_ids: outfit.item_ids, decision: dir === "right" ? "accept" : "reject", round }),
    }).catch(() => {});

    if (dir === "right") {
      setAccepted({ outfit, logId: null, rating: 0 });
      setPhase("accepted");
      setSaved((s) => [{ id: outfit.id + Date.now(), occasion: data.occasion.label, worn_on: new Date().toISOString().slice(0, 10), items: outfit.items.map((i) => i.item) }, ...s].slice(0, 8));
      const res = await fetch("/api/outfits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ occasion: data.occasion.label, item_ids: outfit.item_ids, weather: data.weather, stylist_note: outfit.note }),
      });
      if (res.ok) {
        const { log } = await res.json();
        setAccepted((a) => (a ? { ...a, logId: log.id } : a));
      }
      return;
    }

    const next = [...new Set([...rejectedItems, ...clothesOf(outfit).map((i) => i.item.id)])];
    setRejectedItems(next);
    if (index + 1 < deck.length) setIndex(index + 1);
    else {
      setLaundryPick([]);
      setPhase("laundry");
    }
  }

  const batchItems = useMemo(() => {
    const m = new Map<string, WardrobeItem>();
    for (const o of deck) for (const { item } of clothesOf(o)) m.set(item.id, item);
    return [...m.values()];
  }, [deck]);

  async function moreAfterLaundry(mark: boolean) {
    let excl = unavailable;
    if (mark && laundryPick.length) {
      await fetch("/api/laundry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ item_ids: laundryPick, in_laundry: true }) });
      excl = [...new Set([...unavailable, ...laundryPick])];
      setUnavailable(excl);
    }
    request(data!.occasion.label, { fresh: false, excludeItems: excl, avoidItems: rejectedItems, seen: shown });
  }

  async function rate(n: number) {
    setAccepted((a) => (a ? { ...a, rating: n } : a));
    if (accepted?.logId) await fetch(`/api/outfits/${accepted.logId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ feedback: n }) });
  }

  // keyboard: ← reject, → accept
  const [forced, setForced] = useState<Dir | null>(null);
  useEffect(() => {
    if (phase !== "deck") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "ArrowLeft") setForced("left");
      if (e.key === "ArrowRight") setForced("right");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  const today = new Date().toLocaleDateString(undefined, { weekday: "long" });
  const city = data?.weather.location_name;

  return (
    <div className="space-y-6">
      {demo && <p className="rounded-2xl border border-dashed border-line px-4 py-2 text-xs text-muted">Demo mode · sample wardrobe, resets on restart</p>}

      <header className="space-y-3">
        <p className="eyebrow">
          {today}
          {city ? ` · ${city}` : ""}
        </p>
        <h1 className="display text-[44px] sm:text-[52px]">What are we dressing for?</h1>
        <details className="group text-[15px] text-muted">
          <summary className="flex cursor-pointer list-none items-center gap-2">
            {data && data.weather.rain_probability >= 0.5 ? <IconRain /> : <IconSun />}
            <span>
              {data ? weatherPhrase(data.weather) : "Checking the weather…"}
              {shapeLabel ? ` — styled for ${/^[aeiou]/i.test(shapeLabel) ? "an" : "a"} ${shapeLabel} shape` : ""}
            </span>
          </summary>
          <div className="mt-3 flex items-center gap-2">
            <input className="input max-w-36 py-2" type="number" inputMode="decimal" placeholder="Set °C" value={tempOverride} onChange={(e) => setTempOverride(e.target.value)} />
            <button className="btn-ghost py-2" onClick={() => request(data?.occasion.label ?? occasion, { fresh: true })}>
              Update
            </button>
            {data?.weather.source !== "openweathermap" && <span className="text-xs">Live weather needs location access.</span>}
          </div>
        </details>
      </header>

      {!styleDone && (
        <Link href="/style" className="flex items-center justify-between gap-3 rounded-[22px] bg-accent-soft px-5 py-4 transition hover:brightness-[0.98]">
          <span>
            <span className="eyebrow block text-accent">1-minute style quiz</span>
            <span className="text-[15px]">Pick looks you love so we can tailor outfits and shopping to you.</span>
          </span>
          <span aria-hidden className="text-xl">→</span>
        </Link>
      )}

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:-mx-6 sm:px-6" role="tablist" aria-label="Occasion">
        {QUICK_OCCASIONS.map((o) => (
          <button key={o.key} role="tab" aria-selected={occasion === o.label} onClick={() => pick(o.label)} className={`${occasion === o.label ? "chip-on" : "chip"} px-5 py-2.5 text-[15px]`}>
            {o.label}
          </button>
        ))}
        <button role="tab" aria-selected={otherOpen || !QUICK_OCCASIONS.some((o) => o.label === occasion)} onClick={() => setOtherOpen((v) => !v)} className={`${otherOpen || !QUICK_OCCASIONS.some((o) => o.label === occasion) ? "chip-on" : "chip"} px-5 py-2.5 text-[15px]`}>
          {!otherOpen && !QUICK_OCCASIONS.some((o) => o.label === occasion) ? occasion : "Other…"}
        </button>
      </div>
      {otherOpen && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (otherText.trim()) pick(otherText.trim());
          }}
        >
          <input autoFocus className="input" placeholder="e.g. beach wedding, job interview" value={otherText} onChange={(e) => setOtherText(e.target.value)} />
          <button className="btn-primary shrink-0" disabled={!otherText.trim()}>
            Style
          </button>
        </form>
      )}

      {/* ------------------------------------------------------------ deck */}
      <section aria-live="polite">
        {phase === "loading" && <SkeletonCard />}

        {phase === "error" && (
          <div className="card text-sm">
            <p>{error}</p>
            <button className="btn-ghost mt-3" onClick={() => request(occasion, { fresh: true })}>
              Try again
            </button>
          </div>
        )}

        {(phase === "deck" || phase === "laundry") && deck[index] && data && (
          <>
            <div className="relative">
              {index + 1 < deck.length && <div className="absolute inset-x-6 -bottom-2 top-4 rounded-[28px] border border-line bg-surface/70" aria-hidden />}
              <SwipeableLook key={deck[index].id} outfit={deck[index]} occasion={data.occasion.label} ai={data.stylist === "claude"} forced={forced} onDecide={(d) => { setForced(null); decide(d); }} />
            </div>
            {data.relaxed && (
              <p className="mt-3 text-center text-xs text-muted">
                Reusing your {data.relaxed_categories.map((c) => (c === "footwear" ? "shoes" : c.replace("_", "-") + "s")).join(" & ")} — you&apos;ve seen the rest.
              </p>
            )}
            <div className="mt-6 flex items-center justify-center gap-10">
              <button onClick={() => setForced("left")} aria-label="Not today" className="flex h-[72px] w-[72px] items-center justify-center rounded-full border border-line bg-surface shadow-[0_8px_24px_-10px_rgba(0,0,0,0.25)] transition hover:scale-105">
                <IconX className="h-7 w-7" />
              </button>
              <span className="w-10 text-center text-sm tabular-nums text-muted">
                {index + 1} / {deck.length}
              </span>
              <button onClick={() => setForced("right")} aria-label="Wear this" className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-ink text-white shadow-[0_8px_24px_-8px_rgba(0,0,0,0.45)] transition hover:scale-105">
                <IconCheck className="h-7 w-7" />
              </button>
            </div>
            {round > 1 && <p className="mt-2 text-center text-[11px] text-faint">Round {round}</p>}
          </>
        )}

        {phase === "accepted" && accepted && (
          <div className="card space-y-4 text-center">
            <p className="eyebrow text-accent">Saved to your looks</p>
            <h2 className="display text-[34px]">{accepted.outfit.title}</h2>
            <div className="flex justify-center gap-2">
              {accepted.outfit.items.map(({ item }) => (
                <ItemImage key={item.id} item={item} className="h-16 w-14 rounded-xl" />
              ))}
            </div>
            <div className="text-sm text-muted">
              How did it feel?
              <div className="mt-1 flex justify-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => rate(n)} aria-label={`${n} stars`} className={`text-2xl ${n <= accepted.rating ? "text-accent" : "text-line"}`}>
                    ★
                  </button>
                ))}
              </div>
            </div>
            <button
              className="btn-ghost"
              onClick={() => {
                setAccepted(null);
                if (index + 1 < deck.length) {
                  setIndex(index + 1);
                  setPhase("deck");
                } else request(data!.occasion.label, { fresh: false, excludeItems: unavailable, avoidItems: rejectedItems, seen: shown });
              }}
            >
              See other options
            </button>
          </div>
        )}

        {phase === "exhausted" && data && (
          <div className="card space-y-3">
            <p className="eyebrow">{data.occasion.label}</p>
            <h2 className="display text-[30px]">You&apos;ve seen every combination</h2>
            <p className="text-sm text-muted">
              {data.gaps.length > 0
                ? data.gaps[0].message
                : "Nothing else in your wardrobe works for this occasion right now — pieces may be in the laundry."}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Link href="/shop" className="btn-primary">
                See what&apos;s missing
              </Link>
              <button className="btn-ghost" onClick={() => request(data.occasion.label, { fresh: true })}>
                Start over
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ------------------------------------------------------ saved looks */}
      <section className="space-y-3 pt-4">
        <h2 className="eyebrow">Saved looks</h2>
        {saved.length === 0 ? (
          <p className="text-[15px] text-muted">Swipe right on a look to save it here.</p>
        ) : (
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6">
            {saved.map((l) => (
              <div key={l.id} className="w-40 shrink-0 rounded-3xl border border-line bg-surface p-2.5">
                <div className="grid grid-cols-2 gap-1">
                  {l.items.slice(0, 4).map((i) => (
                    <ItemImage key={i.id} item={i} className="aspect-square rounded-xl" />
                  ))}
                </div>
                <p className="mt-2 truncate px-1 text-sm">{l.occasion}</p>
                <p className="px-1 text-[11px] text-muted">{new Date(l.worn_on).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* -------------------------------------------------- laundry sheet */}
      {phase === "laundry" && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="laundry-title">
          <div className="max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-[32px] bg-surface p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:rounded-[32px]">
            <p className="eyebrow">Not feeling these?</p>
            <h2 id="laundry-title" className="display mt-1 text-[32px]">
              Anything in the laundry?
            </h2>
            <p className="mt-1 text-sm text-muted">Tap the pieces that aren&apos;t available. We&apos;ll leave them out for 2 days.</p>
            <div className="mt-5 grid grid-cols-3 gap-2.5">
              {batchItems.map((item) => {
                const on = laundryPick.includes(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => setLaundryPick((p) => (on ? p.filter((x) => x !== item.id) : [...p, item.id]))}
                    aria-pressed={on}
                    className="text-left"
                  >
                    <div className={`relative overflow-hidden rounded-2xl ring-2 transition ${on ? "ring-accent" : "ring-transparent"}`}>
                      <ItemImage item={item} className="aspect-square" />
                      {on && <span className="absolute right-1.5 top-1.5 rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white">Laundry</span>}
                    </div>
                    <p className="mt-1 truncate text-xs">{titleCase(item.subcategory)}</p>
                  </button>
                );
              })}
            </div>
            <div className="mt-6 flex flex-col gap-2">
              <button disabled={laundryPick.length === 0} onClick={() => moreAfterLaundry(true)} className="btn-primary w-full py-3">
                {laundryPick.length ? `Mark ${laundryPick.length} in laundry · show more` : "Select pieces in the laundry"}
              </button>
              <button onClick={() => moreAfterLaundry(false)} className="btn-ghost w-full py-3">
                Skip · show more outfits
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="card animate-pulse space-y-4 p-6">
      <div className="h-8 w-1/2 rounded-full bg-sunken" />
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="aspect-[3/2] rounded-2xl bg-sunken" />
        ))}
      </div>
      <div className="h-20 rounded-2xl bg-sunken" />
    </div>
  );
}

const THRESHOLD = 110;

/** The outfit card from the design, draggable left/right. */
function SwipeableLook({ outfit, occasion, ai, forced, onDecide }: { outfit: OutfitView; occasion: string; ai: boolean; forced: Dir | null; onDecide: (d: Dir) => void }) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [gone, setGone] = useState<Dir | null>(null);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);

  const fling = useCallback(
    (d: Dir) => {
      if (gone) return;
      setGone(d);
      setDx(d === "right" ? 700 : -700);
      setTimeout(() => onDecide(d), 230);
    },
    [gone, onDecide],
  );

  useEffect(() => {
    if (forced) fling(forced);
  }, [forced, fling]);

  function down(e: React.PointerEvent) {
    if (gone || e.button > 0) return;
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
  }
  function move(e: React.PointerEvent) {
    if (!start.current) return;
    const ddx = e.clientX - start.current.x;
    if (!dragging && Math.abs(ddx) > 8 && Math.abs(ddx) > Math.abs(e.clientY - start.current.y)) {
      setDragging(true);
      (e.currentTarget as Element).setPointerCapture(start.current.id);
    }
    if (dragging || Math.abs(ddx) > 8) setDx(ddx);
  }
  function up() {
    if (!start.current) return;
    start.current = null;
    setDragging(false);
    if (dx > THRESHOLD) fling("right");
    else if (dx < -THRESHOLD) fling("left");
    else setDx(0);
  }

  const p = Math.max(-1, Math.min(1, dx / THRESHOLD));
  return (
    <article
      className="card relative touch-pan-y select-none p-6"
      style={{ transform: `translateX(${dx}px) rotate(${dx / 22}deg)`, transition: dragging ? "none" : "transform 230ms ease-out" }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      <div className="pointer-events-none absolute left-6 top-6 z-10 -rotate-12 rounded-xl border-[3px] border-good bg-surface/80 px-3 py-1 text-lg font-semibold tracking-[0.2em] text-good" style={{ opacity: Math.max(0, p) }}>
        WEAR IT
      </div>
      <div className="pointer-events-none absolute right-6 top-6 z-10 rotate-12 rounded-xl border-[3px] border-accent bg-surface/80 px-3 py-1 text-lg font-semibold tracking-[0.2em] text-accent" style={{ opacity: Math.max(0, -p) }}>
        NOT TODAY
      </div>

      <div className="flex items-baseline justify-between gap-3">
        <h3 className="display text-[34px]">{outfit.title}</h3>
        <span className="eyebrow shrink-0 text-[10px]">{occasion}</span>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-5">
        {outfit.items.map(({ role, item }) => (
          <div key={item.id} className="min-w-0">
            <ItemImage item={item} className="aspect-[3/2] rounded-2xl" />
            <p className="eyebrow mt-2.5 text-[10px]">{ROLE_LABEL[role] ?? role}</p>
            <p className="truncate text-[15px]">{titleCase(item.subcategory)}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-2xl bg-sunken p-4">
        <p className="eyebrow flex items-center gap-1.5 text-[11px] text-accent">
          <IconSparkle className="h-4 w-4" /> {ai ? "Stylist AI" : "Stylist notes"}
        </p>
        <p className="mt-1.5 text-[15px] leading-relaxed">{outfit.note}</p>
      </div>
    </article>
  );
}
