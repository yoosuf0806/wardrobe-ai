"use client";
import { useEffect, useRef, useState } from "react";
import type { OutfitView } from "@/lib/services/stylist-service";

const THRESHOLD = 110; // px of horizontal drag that commits a swipe

export type SwipeDir = "left" | "right";

/**
 * A draggable outfit card (Tinder/Bumble style). Drag right = wear it, drag
 * left = not today. Works with mouse, touch and pen via Pointer Events.
 */
export function SwipeCard({
  outfit,
  onSwipe,
  active,
  forced,
  depth,
}: {
  outfit: OutfitView;
  onSwipe: (dir: SwipeDir) => void;
  active: boolean;
  /** set by the ✕ / ♥ buttons to animate the card away */
  forced: SwipeDir | null;
  depth: number;
}) {
  const [dx, setDx] = useState(0);
  const [dy, setDy] = useState(0);
  const [leaving, setLeaving] = useState<SwipeDir | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (forced && active && !leaving) fling(forced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forced, active]);

  function fling(dir: SwipeDir) {
    setLeaving(dir);
    setDx(dir === "right" ? 600 : -600);
    setTimeout(() => onSwipe(dir), 220);
  }

  function down(e: React.PointerEvent) {
    if (!active || leaving) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    start.current = { x: e.clientX, y: e.clientY };
  }
  function move(e: React.PointerEvent) {
    if (!start.current) return;
    setDx(e.clientX - start.current.x);
    setDy((e.clientY - start.current.y) * 0.3);
  }
  function up() {
    if (!start.current) return;
    start.current = null;
    if (dx > THRESHOLD) fling("right");
    else if (dx < -THRESHOLD) fling("left");
    else {
      setDx(0);
      setDy(0);
    }
  }

  const dragging = start.current !== null;
  const progress = Math.max(-1, Math.min(1, dx / THRESHOLD));
  const style: React.CSSProperties = active
    ? {
        transform: `translate(${dx}px, ${dy}px) rotate(${dx / 18}deg)`,
        transition: dragging ? "none" : "transform 220ms ease-out",
        zIndex: 10,
      }
    : { transform: `translateY(${depth * 10}px) scale(${1 - depth * 0.04})`, transition: "transform 220ms ease-out", zIndex: 10 - depth };

  const big = outfit.items.filter((i) => i.role !== "Accessory");
  const acc = outfit.items.find((i) => i.role === "Accessory");

  return (
    <div
      className="absolute inset-0 touch-none select-none overflow-hidden rounded-3xl border border-line bg-surface shadow-lg"
      style={style}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      aria-hidden={!active}
    >
      {active && (
        <>
          <div className="pointer-events-none absolute left-5 top-5 z-10 rotate-[-12deg] rounded-lg border-4 border-good px-3 py-1 text-2xl font-black tracking-wider text-good" style={{ opacity: Math.max(0, progress) }}>
            WEAR IT
          </div>
          <div className="pointer-events-none absolute right-5 top-5 z-10 rotate-[12deg] rounded-lg border-4 border-accent px-3 py-1 text-2xl font-black tracking-wider text-accent" style={{ opacity: Math.max(0, -progress) }}>
            NOT TODAY
          </div>
        </>
      )}

      <div className="flex h-full flex-col">
        <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-2 gap-1 bg-canvas p-1">
          {big.map(({ role, item }) => (
            <div key={item.id} className="relative min-h-0 overflow-hidden rounded-2xl bg-surface">
              {item.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image_url} alt={`${item.color_name} ${item.subcategory}`} draggable={false} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full" style={{ background: item.color_hex }} />
              )}
              <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white">
                {role}: {item.subcategory}
              </span>
            </div>
          ))}
        </div>
        <div className="shrink-0 space-y-1.5 p-4">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="font-display text-xl font-semibold leading-tight">{outfit.title}</h3>
            <span className="shrink-0 text-[11px] text-muted">F{outfit.formality}</span>
          </div>
          {acc && (
            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="h-3 w-3 rounded-full border border-line" style={{ background: acc.item.color_hex }} /> + {acc.item.subcategory}
            </div>
          )}
          <p className="line-clamp-3 text-sm leading-relaxed text-ink/80">{outfit.note}</p>
        </div>
      </div>
    </div>
  );
}
