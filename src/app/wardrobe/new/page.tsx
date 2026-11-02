"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES, FABRIC_WEIGHTS, FITS, LENGTHS, PATTERNS, SEASONS, SLEEVES, type GarmentAttributes } from "@/lib/types";

const EMPTY: GarmentAttributes = {
  category: "top",
  subcategory: "",
  color_hex: "#808080",
  color_name: "",
  secondary_colors: [],
  pattern: "solid",
  fabric_type: "",
  fabric_weight: "medium",
  sleeve_length: "none",
  fit: "regular",
  length: "regular",
  formality: 5,
  seasonality: [],
  waterproof: false,
};

/** Downscale on-device: faster uploads, lower vision-token cost, and strips EXIF (incl. GPS). */
async function downscale(file: File, max = 1024): Promise<{ blob: Blob; dataUrl: string; avgHex: string }> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  // centre-crop average colour as a fallback when AI tagging is off
  const s = Math.round(Math.min(canvas.width, canvas.height) * 0.3);
  const px = ctx.getImageData((canvas.width - s) / 2, (canvas.height - s) / 2, s, s).data;
  let r = 0, g = 0, b = 0;
  for (let i = 0; i < px.length; i += 4) { r += px[i]; g += px[i + 1]; b += px[i + 2]; }
  const n = px.length / 4;
  const avgHex = "#" + [r, g, b].map((v) => Math.round(v / n).toString(16).padStart(2, "0")).join("").toUpperCase();
  const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), "image/jpeg", 0.88));
  return { blob, dataUrl: canvas.toDataURL("image/jpeg", 0.8), avgHex };
}

export default function NewItemPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [attrs, setAttrs] = useState<GarmentAttributes>(EMPTY);
  const [aiRaw, setAiRaw] = useState<unknown>(null);
  const [status, setStatus] = useState<"idle" | "analyzing" | "review" | "saving">("idle");
  const [note, setNote] = useState<string | null>(null);

  const set = <K extends keyof GarmentAttributes>(k: K, v: GarmentAttributes[K]) => setAttrs((a) => ({ ...a, [k]: v }));

  async function onFile(file: File) {
    setStatus("analyzing");
    setNote(null);
    const { blob, dataUrl, avgHex } = await downscale(file);
    setPreview(dataUrl);
    setBlob(blob);
    setAttrs({ ...EMPTY, color_hex: avgHex });
    try {
      const fd = new FormData();
      fd.append("image", blob, "garment.jpg");
      const res = await fetch("/api/wardrobe/analyze", { method: "POST", body: fd });
      const json = await res.json();
      if (json.ok) {
        setAttrs(json.attributes);
        setAiRaw(json.attributes);
        setNote("Tagged by AI – check the details and fix anything that's off.");
      } else setNote(json.error ?? "Couldn't analyse the photo – please fill in the details.");
    } catch {
      setNote("Couldn't analyse the photo – please fill in the details.");
    }
    setStatus("review");
  }

  async function save() {
    setStatus("saving");
    const fd = new FormData();
    fd.append("attributes", JSON.stringify(attrs));
    if (blob) fd.append("image", blob, "garment.jpg");
    if (aiRaw) fd.append("ai_raw", JSON.stringify(aiRaw));
    const res = await fetch("/api/wardrobe", { method: "POST", body: fd });
    if (res.ok) {
      router.push("/wardrobe");
      router.refresh();
    } else {
      const j = await res.json().catch(() => ({}));
      setNote(j.error ?? "Save failed");
      setStatus("review");
    }
  }

  const sel = <K extends keyof GarmentAttributes>(k: K, options: readonly string[]) => (
    <select className="input capitalize" value={String(attrs[k])} onChange={(e) => set(k, e.target.value as GarmentAttributes[K])}>
      {options.map((o) => (
        <option key={o} value={o}>{o.replace(/_/g, " ")}</option>
      ))}
    </select>
  );

  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <p className="eyebrow">Wardrobe</p>
        <h1 className="display text-[44px]">Add a piece</h1>
        <p className="text-[15px] text-muted">Snap one garment. We&apos;ll read the colour, fabric and formality for you.</p>
      </header>

      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />

      {!preview ? (
        <button onClick={() => inputRef.current?.click()} className="card flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 border-2 border-dashed text-muted hover:border-ink">
          <span className="text-3xl">📷</span>
          <span className="text-sm">Take or upload a photo of one garment</span>
          <span className="text-xs">Lay it flat or hang it against a plain background</span>
        </button>
      ) : (
        <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Garment preview" className="w-full rounded-[20px] object-cover" />
            <button onClick={() => inputRef.current?.click()} className="mt-2 text-xs text-muted underline">Retake</button>
          </div>

          {status === "analyzing" ? (
            <div className="card flex items-center justify-center text-sm text-muted">Analysing fabric, colour and formality…</div>
          ) : (
            <div className="card space-y-3">
              {note && <p className="text-xs text-muted">{note}</p>}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Category</label>{sel("category", CATEGORIES)}</div>
                <div><label className="label">Type</label><input className="input" value={attrs.subcategory} placeholder="e.g. oxford shirt" onChange={(e) => set("subcategory", e.target.value)} /></div>
                <div>
                  <label className="label">Colour</label>
                  <div className="flex gap-2">
                    <input type="color" className="h-10 w-12 shrink-0 rounded-lg border border-line" value={attrs.color_hex} onChange={(e) => set("color_hex", e.target.value.toUpperCase())} />
                    <input className="input" value={attrs.color_name} placeholder="Navy Blue" onChange={(e) => set("color_name", e.target.value)} />
                  </div>
                </div>
                <div><label className="label">Pattern</label>{sel("pattern", PATTERNS)}</div>
                <div><label className="label">Fabric</label><input className="input" value={attrs.fabric_type} placeholder="linen" onChange={(e) => set("fabric_type", e.target.value)} /></div>
                <div><label className="label">Weight</label>{sel("fabric_weight", FABRIC_WEIGHTS)}</div>
                <div><label className="label">Sleeves</label>{sel("sleeve_length", SLEEVES)}</div>
                <div><label className="label">Fit</label>{sel("fit", FITS)}</div>
                <div><label className="label">Length</label>{sel("length", LENGTHS)}</div>
                <div>
                  <label className="label">Formality: {attrs.formality}/10</label>
                  <input type="range" min={1} max={10} value={attrs.formality} onChange={(e) => set("formality", Number(e.target.value))} className="w-full accent-[var(--color-ink)]" />
                </div>
              </div>
              <div>
                <label className="label">Seasons</label>
                <div className="flex flex-wrap gap-1.5">
                  {SEASONS.map((s) => (
                    <button key={s} type="button" className={`${attrs.seasonality.includes(s) ? "chip-on" : "chip"} capitalize`}
                      onClick={() => set("seasonality", attrs.seasonality.includes(s) ? attrs.seasonality.filter((x) => x !== s) : [...attrs.seasonality, s])}>
                      {s}
                    </button>
                  ))}
                  <label className="chip gap-1.5"><input type="checkbox" checked={attrs.waterproof} onChange={(e) => set("waterproof", e.target.checked)} /> waterproof</label>
                </div>
              </div>
              <button onClick={save} disabled={status === "saving" || !attrs.subcategory} className="btn-primary w-full">
                {status === "saving" ? "Saving…" : "Save to wardrobe"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
