"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { classifyBodyShape, type ShapeResult } from "@/lib/body/classify";
import { BODY_SHAPES, BODY_SHAPE_LABELS, type BodyMetrics, type BodyShape } from "@/lib/types";

export default function BodyPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<"photo" | "manual">("photo");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [result, setResult] = useState<{ shape: ShapeResult; metrics: BodyMetrics } | null>(null);
  const [override, setOverride] = useState<BodyShape | "">("");
  const [m, setM] = useState({ bust: "", waist: "", hip: "" });

  async function onPhoto(file: File) {
    setBusy(true);
    setError(null);
    setResult(null);
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      const { measureFromImage } = await import("@/lib/body/measure");
      const fm = await measureFromImage(img);
      const shape = classifyBodyShape({ kind: "frontal_width", shoulder: fm.shoulder, waist: fm.waist, hip: fm.hip });
      setWarnings(fm.warnings);
      setResult({
        shape,
        metrics: {
          method: "mediapipe_frontal",
          shoulder: fm.shoulder,
          waist: fm.waist,
          hip: fm.hip,
          ...shape.ratios,
          torso_to_leg: Math.round(fm.torso_to_leg * 1000) / 1000,
          confidence: Math.round(shape.confidence * fm.quality * 1000) / 1000,
          measured_at: new Date().toISOString(),
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      URL.revokeObjectURL(url); // the photo is discarded – never uploaded
      if (fileRef.current) fileRef.current.value = "";
      setBusy(false);
    }
  }

  function onManual() {
    setError(null);
    try {
      const shoulder = Number(m.bust), waist = Number(m.waist), hip = Number(m.hip);
      const shape = classifyBodyShape({ kind: "circumference", shoulder, waist, hip });
      setWarnings([]);
      setResult({ shape, metrics: { method: "manual_circumference", shoulder, waist, hip, ...shape.ratios, confidence: shape.confidence, measured_at: new Date().toISOString() } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check your measurements");
    }
  }

  async function save() {
    if (!result) return;
    const body_shape = override || result.shape.shape;
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body_shape, body_shape_source: override ? "manual" : "detected", body_metrics: result.metrics }),
    });
    router.push("/settings");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold">Body shape</h1>
        <p className="mt-1 text-sm text-muted">Used as a starting point for styling. Your own fit preferences always win.</p>
      </div>

      <div className="flex gap-1.5">
        <button className={tab === "photo" ? "chip-on" : "chip"} onClick={() => setTab("photo")}>Photo scan</button>
        <button className={tab === "manual" ? "chip-on" : "chip"} onClick={() => setTab("manual")}>Tape measure</button>
      </div>

      {tab === "photo" ? (
        <div className="card space-y-3 text-sm">
          <ul className="list-disc space-y-1 pl-5 text-muted">
            <li>Full body, facing the camera, head to ankles in frame.</li>
            <li>Fitted clothing, arms held slightly away from your sides.</li>
            <li>Plain background and good light.</li>
          </ul>
          <p className="rounded-lg bg-canvas p-2 text-xs">
            🔒 Processed entirely on this device. The photo is never uploaded or stored – only shoulder/waist/hip ratios are saved.
          </p>
          <input ref={fileRef} type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => e.target.files?.[0] && onPhoto(e.target.files[0])} />
          <button className="btn-primary" disabled={busy} onClick={() => fileRef.current?.click()}>
            {busy ? "Analysing on device…" : "Choose full-body photo"}
          </button>
        </div>
      ) : (
        <div className="card space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {(["bust", "waist", "hip"] as const).map((k) => (
              <div key={k}>
                <label className="label">{k === "bust" ? "Bust / chest" : k}</label>
                <input className="input" inputMode="decimal" placeholder="cm or in" value={m[k]} onChange={(e) => setM({ ...m, [k]: e.target.value })} />
              </div>
            ))}
          </div>
          <p className="text-xs text-muted">Measure around the fullest part of the chest, the narrowest part of the waist and the fullest part of the hips. Use the same unit for all three.</p>
          <button className="btn-primary" onClick={onManual}>Calculate</button>
        </div>
      )}

      {error && <p className="text-sm text-accent">{error}</p>}

      {result && (
        <div className="card space-y-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted">Detected</div>
            <div className="font-display text-2xl font-semibold">{BODY_SHAPE_LABELS[result.shape.shape]}</div>
            <p className="text-sm text-muted">{result.shape.explanation} Confidence {Math.round(result.metrics.confidence * 100)}%.</p>
            <p className="mt-1 text-xs text-muted">
              Shoulder:hip {result.shape.ratios.shoulder_to_hip} · waist:hip {result.shape.ratios.waist_to_hip}
            </p>
            {warnings.map((w) => <p key={w} className="text-xs text-accent">⚠ {w}</p>)}
          </div>
          <div>
            <label className="label">Doesn&apos;t feel right? Choose yourself</label>
            <select className="input" value={override} onChange={(e) => setOverride(e.target.value as BodyShape | "")}>
              <option value="">Keep {BODY_SHAPE_LABELS[result.shape.shape]}</option>
              {BODY_SHAPES.map((s) => <option key={s} value={s}>{BODY_SHAPE_LABELS[s]}</option>)}
            </select>
          </div>
          <button className="btn-primary w-full" onClick={save}>Save to profile</button>
        </div>
      )}
    </div>
  );
}
