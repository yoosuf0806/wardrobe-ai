"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { EMPTY_GARMENT, GarmentForm, downscale } from "@/components/garment-form";
import type { GarmentAttributes } from "@/lib/types";

interface Pending {
  file: File;
}

/**
 * Add one or many pieces. Several photos are processed one after another:
 * AI reads each photo, you review the details, then "Save & next".
 */
export default function NewItemPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<Pending[]>([]);
  const [total, setTotal] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [attrs, setAttrs] = useState<GarmentAttributes>(EMPTY_GARMENT);
  const [aiRaw, setAiRaw] = useState<unknown>(null);
  const [status, setStatus] = useState<"idle" | "analyzing" | "review" | "saving">("idle");
  const [note, setNote] = useState<string | null>(null);

  async function load(file: File) {
    setStatus("analyzing");
    setNote(null);
    setAiRaw(null);
    const { blob, dataUrl, avgHex } = await downscale(file);
    setPreview(dataUrl);
    setBlob(blob);
    setAttrs({ ...EMPTY_GARMENT, color_hex: avgHex });
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

  function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const list = [...files].map((file) => ({ file }));
    setTotal(list.length);
    setSavedCount(0);
    setQueue(list.slice(1));
    load(list[0].file);
  }

  function next() {
    if (queue.length === 0) {
      router.push("/wardrobe");
      router.refresh();
      return;
    }
    const [head, ...rest] = queue;
    setQueue(rest);
    load(head.file);
  }

  async function save() {
    setStatus("saving");
    const fd = new FormData();
    fd.append("attributes", JSON.stringify(attrs));
    if (blob) fd.append("image", blob, "garment.jpg");
    if (aiRaw) fd.append("ai_raw", JSON.stringify(aiRaw));
    const res = await fetch("/api/wardrobe", { method: "POST", body: fd });
    if (res.ok) {
      setSavedCount((n) => n + 1);
      next();
    } else {
      const j = await res.json().catch(() => ({}));
      setNote(j.error ?? "Save failed");
      setStatus("review");
    }
  }

  const position = total - queue.length;

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <p className="eyebrow">Wardrobe{total > 1 ? ` · ${position} of ${total}` : ""}</p>
        <h1 className="display text-[44px]">{total > 1 ? "Add your pieces" : "Add a piece"}</h1>
        <p className="text-[15px] text-muted">Snap one garment per photo – or select several at once. We&apos;ll read the colour, fabric and formality for you.</p>
      </header>

      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />

      {!preview ? (
        <button onClick={() => inputRef.current?.click()} className="card flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 border-2 border-dashed text-muted hover:border-ink">
          <span className="text-3xl">📷</span>
          <span className="text-sm text-ink">Take or choose photos</span>
          <span className="text-xs">One garment per photo · lay it flat or hang it on a plain background</span>
        </button>
      ) : (
        <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Garment preview" className="w-full rounded-[20px] object-cover" />
            {total > 1 && <p className="mt-2 text-xs text-muted">{savedCount} saved · {queue.length} to go</p>}
          </div>

          {status === "analyzing" ? (
            <div className="card flex items-center justify-center text-sm text-muted">Reading fabric, colour and formality…</div>
          ) : (
            <div className="card space-y-4">
              {note && <p className="text-xs text-muted">{note}</p>}
              <GarmentForm value={attrs} onChange={setAttrs} />
              <div className="flex gap-2">
                <button onClick={save} disabled={status === "saving" || !attrs.subcategory} className="btn-primary flex-1">
                  {status === "saving" ? "Saving…" : queue.length ? "Save & next" : "Save to wardrobe"}
                </button>
                {queue.length > 0 && (
                  <button onClick={next} className="btn-ghost" disabled={status === "saving"}>
                    Skip
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
