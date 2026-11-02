"use client";
import { useEffect, useRef, useState } from "react";
import { downscale } from "@/components/garment-form";
import { IconPlus, IconX } from "@/components/icons";
import { QUIZ_OCCASIONS } from "@/lib/style/looks";
import { CATEGORIES, PATTERNS, type Inspiration, type InspirationPiece } from "@/lib/types";

const BLANK: InspirationPiece[] = [
  { category: "top", subcategory: "", color_hex: "#1F2A44", color_name: "", pattern: "solid" },
  { category: "bottom", subcategory: "", color_hex: "#C8B494", color_name: "", pattern: "solid" },
  { category: "footwear", subcategory: "", color_hex: "#6B4226", color_name: "", pattern: "solid" },
];

/** Small thumbnail (≈240px) – the only image data we keep. */
async function thumbnail(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, 240 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * s);
  c.height = Math.round(bmp.height * s);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.72);
}

type Draft = { file: File; thumb: string; occasion: string | null; pieces: InspirationPiece[]; status: "reading" | "review" | "saving"; note: string | null };

/**
 * Outfit photos the user likes (e.g. saved from Pinterest). The AI lists the
 * pieces, the user confirms, and each saved look teaches the stylist.
 */
export function InspirationBoard({ defaultOccasion }: { defaultOccasion: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [list, setList] = useState<Inspiration[] | null>(null);
  const [queue, setQueue] = useState<File[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);

  useEffect(() => {
    fetch("/api/inspiration").then(async (r) => r.ok && setList((await r.json()).inspirations));
  }, []);

  async function start(file: File) {
    const thumb = await thumbnail(file);
    setDraft({ file, thumb, occasion: defaultOccasion, pieces: BLANK, status: "reading", note: null });
    try {
      const { blob } = await downscale(file);
      const fd = new FormData();
      fd.append("image", blob, "look.jpg");
      const res = await fetch("/api/inspiration/analyze", { method: "POST", body: fd });
      const json = await res.json();
      setDraft((d) =>
        d && d.file === file
          ? json.ok
            ? { ...d, pieces: json.pieces.length >= 2 ? json.pieces : BLANK, occasion: json.occasion ?? d.occasion, status: "review", note: "Read by AI – check the pieces." }
            : { ...d, status: "review", note: json.error ?? "Add the pieces you see." }
          : d,
      );
    } catch {
      setDraft((d) => (d ? { ...d, status: "review", note: "Add the pieces you see." } : d));
    }
  }

  function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const all = [...files];
    setQueue(all.slice(1));
    start(all[0]);
  }

  function next() {
    setDraft(null);
    if (queue.length) {
      const [h, ...rest] = queue;
      setQueue(rest);
      start(h);
    }
  }

  async function save() {
    if (!draft) return;
    const pieces = draft.pieces.filter((p) => p.subcategory.trim());
    if (pieces.length < 2) return setDraft({ ...draft, note: "Add at least two pieces (e.g. a top and trousers)." });
    setDraft({ ...draft, status: "saving" });
    const res = await fetch("/api/inspiration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ occasion: draft.occasion, pieces: pieces.map((p) => ({ ...p, color_name: p.color_name || p.subcategory.split(" ")[0] })), thumb: draft.thumb }),
    });
    if (res.ok) {
      const { inspiration } = await res.json();
      setList((l) => [inspiration, ...(l ?? [])]);
      next();
    } else setDraft({ ...draft, status: "review", note: "Couldn't save – check the pieces and try again." });
  }

  async function remove(id: string) {
    setList((l) => (l ?? []).filter((x) => x.id !== id));
    await fetch(`/api/inspiration/${id}`, { method: "DELETE" });
  }

  const setPiece = (i: number, patch: Partial<InspirationPiece>) => setDraft((d) => (d ? { ...d, pieces: d.pieces.map((p, j) => (j === i ? { ...p, ...patch } : p)) } : d));

  return (
    <section className="space-y-4">
      <div>
        <p className="eyebrow">Your inspiration</p>
        <h2 className="display mt-1 text-[32px]">Outfits you love</h2>
        <p className="mt-1 text-sm text-muted">
          Add photos of looks you like – screenshots from Pinterest or Instagram work great. We read the pieces and colours, and when two looks share a combination
          (say, a navy shirt with beige chinos) the stylist starts building it from your wardrobe. Photos stay private; only a small thumbnail is kept.
        </p>
      </div>

      <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
      <div className="grid grid-cols-3 gap-2">
        <button onClick={() => input.current?.click()} className="flex aspect-[3/4] flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-line text-muted hover:border-ink hover:text-ink">
          <IconPlus className="h-6 w-6" />
          <span className="text-xs">Add photos</span>
        </button>
        {(list ?? []).map((i) => (
          <div key={i.id} className="group relative aspect-[3/4] overflow-hidden rounded-2xl bg-sunken">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {i.thumb && <img src={i.thumb} alt="" className="h-full w-full object-cover" />}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6 text-[10px] leading-tight text-white">
              {i.pieces.slice(0, 3).map((p) => p.subcategory).join(" · ")}
            </div>
            <button aria-label="Remove" onClick={() => remove(i.id)} className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white">
              <IconX className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {draft && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 sm:items-center" role="dialog" aria-modal="true">
          <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-[32px] bg-surface p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:rounded-[32px]">
            <div className="flex gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={draft.thumb} alt="" className="aspect-[3/4] w-24 shrink-0 rounded-2xl object-cover" />
              <div className="min-w-0">
                <p className="eyebrow">{queue.length ? `${queue.length} more after this` : "Inspiration"}</p>
                <h3 className="display text-[26px]">{draft.status === "reading" ? "Reading the outfit…" : "What's in this look?"}</h3>
                {draft.note && <p className="text-xs text-muted">{draft.note}</p>}
              </div>
            </div>

            {draft.status !== "reading" && (
              <div className="mt-5 space-y-3">
                <div>
                  <label className="label">Occasion</label>
                  <div className="flex flex-wrap gap-1.5">
                    {QUIZ_OCCASIONS.map((o) => (
                      <button key={o.key} onClick={() => setDraft({ ...draft, occasion: o.key })} className={`${draft.occasion === o.key ? "chip-on" : "chip"} px-3 py-1 text-xs`}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
                {draft.pieces.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input type="color" aria-label="Colour" value={p.color_hex} onChange={(e) => setPiece(i, { color_hex: e.target.value.toUpperCase() })} className="h-10 w-10 shrink-0 rounded-lg border border-line" />
                    <input className="input py-2" placeholder="e.g. navy shirt" value={p.subcategory} onChange={(e) => setPiece(i, { subcategory: e.target.value })} />
                    <select className="input w-28 shrink-0 py-2 text-xs capitalize" value={p.category} onChange={(e) => setPiece(i, { category: e.target.value as InspirationPiece["category"] })}>
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace("_", "-")}</option>)}
                    </select>
                    <select className="sr-only" aria-hidden tabIndex={-1} value={p.pattern} onChange={(e) => setPiece(i, { pattern: e.target.value as InspirationPiece["pattern"] })}>
                      {PATTERNS.map((x) => <option key={x}>{x}</option>)}
                    </select>
                    <button aria-label="Remove piece" className="shrink-0 text-faint hover:text-accent" onClick={() => setDraft({ ...draft, pieces: draft.pieces.filter((_, j) => j !== i) })}>
                      <IconX className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {draft.pieces.length < 6 && (
                  <button className="text-xs text-muted underline" onClick={() => setDraft({ ...draft, pieces: [...draft.pieces, { category: "accessory", subcategory: "", color_hex: "#6B4226", color_name: "", pattern: "solid" }] })}>
                    + Add a piece
                  </button>
                )}
                <div className="flex gap-2 pt-2">
                  <button className="btn-primary flex-1 py-3" disabled={draft.status === "saving"} onClick={save}>
                    {draft.status === "saving" ? "Saving…" : "Save look"}
                  </button>
                  <button className="btn-ghost py-3" onClick={next}>
                    Skip
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
