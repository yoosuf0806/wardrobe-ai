"use client";
import { CATEGORIES, FABRIC_WEIGHTS, FITS, LENGTHS, PATTERNS, SEASONS, SLEEVES, type GarmentAttributes } from "@/lib/types";

export const EMPTY_GARMENT: GarmentAttributes = {
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

export const pickAttributes = (i: GarmentAttributes): GarmentAttributes => ({
  category: i.category,
  subcategory: i.subcategory,
  color_hex: i.color_hex,
  color_name: i.color_name,
  secondary_colors: i.secondary_colors,
  pattern: i.pattern,
  fabric_type: i.fabric_type,
  fabric_weight: i.fabric_weight,
  sleeve_length: i.sleeve_length,
  fit: i.fit,
  length: i.length,
  formality: i.formality,
  seasonality: i.seasonality,
  waterproof: i.waterproof,
});

/** Downscale on-device: faster uploads, lower vision cost, and strips EXIF (incl. GPS). */
export async function downscale(file: File, max = 1024): Promise<{ blob: Blob; dataUrl: string; avgHex: string }> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const s = Math.round(Math.min(canvas.width, canvas.height) * 0.3);
  const px = ctx.getImageData((canvas.width - s) / 2, (canvas.height - s) / 2, s, s).data;
  let r = 0, g = 0, b = 0;
  for (let i = 0; i < px.length; i += 4) {
    r += px[i];
    g += px[i + 1];
    b += px[i + 2];
  }
  const n = px.length / 4;
  const avgHex = "#" + [r, g, b].map((v) => Math.round(v / n).toString(16).padStart(2, "0")).join("").toUpperCase();
  const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), "image/jpeg", 0.88));
  return { blob, dataUrl: canvas.toDataURL("image/jpeg", 0.8), avgHex };
}

/** All editable garment attributes. */
export function GarmentForm({ value, onChange }: { value: GarmentAttributes; onChange: (v: GarmentAttributes) => void }) {
  const set = <K extends keyof GarmentAttributes>(k: K, v: GarmentAttributes[K]) => onChange({ ...value, [k]: v });
  const sel = <K extends keyof GarmentAttributes>(k: K, options: readonly string[]) => (
    <select className="input capitalize" value={String(value[k])} onChange={(e) => set(k, e.target.value as GarmentAttributes[K])}>
      {options.map((o) => (
        <option key={o} value={o}>
          {o.replace(/_/g, " ")}
        </option>
      ))}
    </select>
  );
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Category</label>
          {sel("category", CATEGORIES)}
        </div>
        <div>
          <label className="label">Type</label>
          <input className="input" value={value.subcategory} placeholder="e.g. oxford shirt" onChange={(e) => set("subcategory", e.target.value)} />
        </div>
        <div>
          <label className="label">Colour</label>
          <div className="flex gap-2">
            <input type="color" aria-label="Colour" className="h-11 w-12 shrink-0 rounded-xl border border-line" value={value.color_hex} onChange={(e) => set("color_hex", e.target.value.toUpperCase())} />
            <input className="input" value={value.color_name} placeholder="Navy Blue" onChange={(e) => set("color_name", e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Pattern</label>
          {sel("pattern", PATTERNS)}
        </div>
        <div>
          <label className="label">Fabric</label>
          <input className="input" value={value.fabric_type} placeholder="linen" onChange={(e) => set("fabric_type", e.target.value)} />
        </div>
        <div>
          <label className="label">Weight</label>
          {sel("fabric_weight", FABRIC_WEIGHTS)}
        </div>
        <div>
          <label className="label">Sleeves</label>
          {sel("sleeve_length", SLEEVES)}
        </div>
        <div>
          <label className="label">Fit</label>
          {sel("fit", FITS)}
        </div>
        <div>
          <label className="label">Length</label>
          {sel("length", LENGTHS)}
        </div>
        <div>
          <label className="label">Formality: {value.formality}/10</label>
          <input type="range" min={1} max={10} value={value.formality} onChange={(e) => set("formality", Number(e.target.value))} className="w-full accent-[var(--color-ink)]" />
        </div>
      </div>
      <div>
        <label className="label">Seasons</label>
        <div className="flex flex-wrap gap-1.5">
          {SEASONS.map((s) => (
            <button
              key={s}
              type="button"
              className={`${value.seasonality.includes(s) ? "chip-on" : "chip"} px-3 py-1 text-xs capitalize`}
              onClick={() => set("seasonality", value.seasonality.includes(s) ? value.seasonality.filter((x) => x !== s) : [...value.seasonality, s])}
            >
              {s}
            </button>
          ))}
          <label className="chip gap-1.5 px-3 py-1 text-xs">
            <input type="checkbox" checked={value.waterproof} onChange={(e) => set("waterproof", e.target.checked)} /> waterproof
          </label>
        </div>
      </div>
    </div>
  );
}
