"use client";
import { useEffect, useRef, useState } from "react";
import { classifyBodyShape, SHAPE_COPY } from "@/lib/body/classify";
import { baselineRulesFor } from "@/lib/engine/body-rules";
import { BODY_SHAPE_LABELS, type BodyShape, type FitPreferences, type Profile } from "@/lib/types";

type Tri = boolean | null;
const SHAPES: BodyShape[] = ["hourglass", "rectangle", "inverted_triangle", "pear", "oval"];
const OVERRIDES: { key: "allow_slim_fit" | "allow_oversized" | "allow_cropped_tops" | "allow_horizontal_stripes" | "allow_bold_patterns"; title: string; desc: string }[] = [
  { key: "allow_slim_fit", title: "Slim-fit", desc: "Tailored, close-cut pieces" },
  { key: "allow_oversized", title: "Oversized cuts", desc: "Boxy, relaxed silhouettes" },
  { key: "allow_cropped_tops", title: "Cropped tops", desc: "Tops that end above the waist" },
  { key: "allow_horizontal_stripes", title: "Horizontal stripes", desc: "Bretons, rugby stripes" },
  { key: "allow_bold_patterns", title: "Bold patterns", desc: "Florals, graphics, animal print" },
];

/** Simple geometric glyph for each body shape (shoulder → hip silhouette). */
function ShapeGlyph({ shape }: { shape: BodyShape | null }) {
  const pts: Record<BodyShape, string> = {
    hourglass: "8,4 40,4 30,30 40,56 8,56 18,30",
    rectangle: "12,4 36,4 36,56 12,56",
    inverted_triangle: "6,4 42,4 32,56 16,56",
    pear: "16,4 32,4 42,56 6,56",
    oval: "14,4 34,4 42,30 34,56 14,56 6,30",
  };
  return (
    <svg viewBox="0 0 48 60" className="h-20 w-16 shrink-0" aria-hidden>
      <polygon points={pts[shape ?? "rectangle"]} fill="var(--color-accent-soft)" />
    </svg>
  );
}

function Segmented<T extends string | boolean | null>({ value, options, onChange }: { value: T; options: { v: T; l: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex shrink-0 rounded-full bg-sunken p-1 text-xs">
      {options.map((o) => (
        <button key={String(o.v)} onClick={() => onChange(o.v)} aria-pressed={value === o.v} className={`rounded-full px-3 py-1.5 transition ${value === o.v ? "bg-ink text-white shadow" : "text-muted hover:text-ink"}`}>
          {o.l}
        </button>
      ))}
    </div>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={`relative h-9 w-16 shrink-0 rounded-full transition ${on ? "bg-ink" : "bg-sunken"}`}>
      <span className={`absolute top-1 h-7 w-7 rounded-full bg-white shadow transition-all ${on ? "left-8" : "left-1"}`} />
    </button>
  );
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [mode, setMode] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [m, setM] = useState({ bust: "", waist: "", hip: "", unit: "cm" as "cm" | "in" });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/profile").then(async (r) => {
      if (r.status === 401) return void (location.href = "/login");
      const j = await r.json();
      const p: Profile = j.profile;
      setProfile(p);
      setMode(j.mode);
      if (p.body_metrics) setM({ bust: String(p.body_metrics.bust), waist: String(p.body_metrics.waist), hip: String(p.body_metrics.hip), unit: p.body_metrics.unit });
    });
  }, []);

  /** Optimistic update + debounced autosave. */
  function save(patch: Partial<Profile>) {
    setProfile((p) => (p ? { ...p, ...patch } : p));
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    pending.current = { ...pending.current, ...patch };
    timer.current = setTimeout(async () => {
      const body = pending.current;
      pending.current = {};
      await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      setStatus("saved");
    }, 600);
  }
  const pending = useRef<Partial<Profile>>({});

  if (!profile) return <p className="text-sm text-muted">Loading…</p>;
  const prefs = profile.fit_preferences;
  const setPrefs = (p: Partial<FitPreferences>) => save({ fit_preferences: { ...prefs, ...p } });
  const setSizes = (p: Partial<Profile["sizes"]>) => save({ sizes: { ...profile.sizes, ...p } });

  function onMeasure(next: typeof m) {
    setM(next);
    const bust = Number(next.bust), waist = Number(next.waist), hip = Number(next.hip);
    if (!(bust > 0 && waist > 0 && hip > 0)) return;
    const r = classifyBodyShape({ bust, waist, hip });
    save({
      body_metrics: { method: "manual_circumference", unit: next.unit, bust, waist, hip, ...r.ratios, confidence: r.confidence, measured_at: new Date().toISOString() },
      // measurements re-derive the shape unless the user picked one by hand
      ...(profile!.body_shape_source === "manual" ? {} : { body_shape: r.shape, body_shape_source: "detected" as const }),
    });
  }

  const derived = (() => {
    try {
      return classifyBodyShape({ bust: Number(m.bust), waist: Number(m.waist), hip: Number(m.hip) }).shape;
    } catch {
      return null;
    }
  })();
  const rules = baselineRulesFor(profile.body_shape);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="eyebrow">Profile</p>
          <span className="text-xs text-muted" aria-live="polite">{status === "saving" ? "Saving…" : status === "saved" ? "Saved" : ""}</span>
        </div>
        <h1 className="display text-[44px]">Fit &amp; preferences</h1>
        <p className="text-[15px] text-muted">Everything here shapes the reasoning behind each outfit.</p>
      </header>

      {/* Body shape */}
      <section className="card space-y-5 p-6">
        <p className="eyebrow">{profile.body_shape_source === "manual" ? "Your body shape" : "Analysed body shape"}</p>
        <div className="flex items-center gap-5">
          <ShapeGlyph shape={profile.body_shape} />
          <div>
            <h2 className="display text-[34px]">{profile.body_shape ? BODY_SHAPE_LABELS[profile.body_shape] : "Not set yet"}</h2>
            <p className="mt-1 text-[15px] leading-relaxed text-muted">{profile.body_shape ? SHAPE_COPY[profile.body_shape] : "Add your measurements below and we'll work it out, or pick a shape."}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {SHAPES.map((s) => (
            <button key={s} onClick={() => save({ body_shape: s, body_shape_source: s === derived ? "detected" : "manual" })} className={profile.body_shape === s ? "chip-on" : "chip"}>
              {BODY_SHAPE_LABELS[s]}
            </button>
          ))}
        </div>
        {profile.body_shape_source === "manual" && derived && derived !== profile.body_shape && (
          <button className="text-xs text-accent" onClick={() => save({ body_shape: derived, body_shape_source: "detected" })}>
            Your measurements suggest {BODY_SHAPE_LABELS[derived]} — use that instead
          </button>
        )}
      </section>

      {/* Measurements & sizes */}
      <section className="card space-y-5 p-6">
        <div className="flex items-center justify-between">
          <p className="eyebrow">Measurements</p>
          <Segmented value={m.unit} options={[{ v: "cm", l: "cm" }, { v: "in", l: "in" }]} onChange={(unit) => onMeasure({ ...m, unit })} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {(["bust", "waist", "hip"] as const).map((k) => (
            <div key={k}>
              <label className="label">{k === "bust" ? "Bust / chest" : k}</label>
              <input className="input" inputMode="decimal" placeholder={m.unit} value={m[k]} onChange={(e) => onMeasure({ ...m, [k]: e.target.value })} />
            </div>
          ))}
        </div>
        <p className="text-xs text-muted">Measure around the fullest part of your chest and hips and the narrowest part of your waist. No photos needed.</p>

        <div className="border-t border-line pt-5">
          <p className="eyebrow mb-3">Sizes</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <label className="label">Tops · shirts</label>
              <select className="input" value={profile.sizes.top ?? ""} onChange={(e) => setSizes({ top: e.target.value || null })}>
                <option value="">—</option>
                {["XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL"].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Dress · frock</label>
              <input className="input" maxLength={10} placeholder="8 or M" value={profile.sizes.dress ?? ""} onChange={(e) => setSizes({ dress: e.target.value || null })} />
            </div>
            <div>
              <label className="label">Waist (in)</label>
              <input className="input" type="number" min={20} max={60} value={profile.sizes.bottom_waist ?? ""} onChange={(e) => setSizes({ bottom_waist: e.target.value ? Number(e.target.value) : null })} />
            </div>
            <div>
              <label className="label">Length · inseam (in)</label>
              <input className="input" type="number" min={20} max={40} value={profile.sizes.bottom_inseam ?? ""} onChange={(e) => setSizes({ bottom_inseam: e.target.value ? Number(e.target.value) : null })} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="label">Shoes</label>
              <div className="flex gap-2">
                <input className="input" maxLength={6} placeholder="10" value={profile.sizes.shoe ?? ""} onChange={(e) => setSizes({ shoe: e.target.value || null })} />
                <select className="input w-24" value={profile.sizes.shoe_system} onChange={(e) => setSizes({ shoe_system: e.target.value as "US" | "UK" | "EU" })}>
                  <option>US</option>
                  <option>UK</option>
                  <option>EU</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Fit overrides */}
      <section className="card p-6">
        <p className="eyebrow">Fit overrides</p>
        <p className="mt-1 text-xs text-muted">Your comfort beats body-type advice. “Auto” lets the stylist decide.</p>
        <div className="mt-2 divide-y divide-line">
          {OVERRIDES.map((o) => (
            <div key={o.key} className="flex items-center justify-between gap-4 py-4">
              <div className="min-w-0">
                <p className="text-[16px] font-medium">{o.title}</p>
                <p className="text-sm text-muted">{o.desc}</p>
              </div>
              <Segmented<Tri> value={prefs[o.key]} options={[{ v: false, l: "Avoid" }, { v: null, l: "Auto" }, { v: true, l: "Allow" }]} onChange={(v) => setPrefs({ [o.key]: v } as Partial<FitPreferences>)} />
            </div>
          ))}
          <div className="flex items-center justify-between gap-4 py-4">
            <div>
              <p className="text-[16px] font-medium">Prefer long sleeves</p>
              <p className="text-sm text-muted">Favour full-length sleeves when possible</p>
            </div>
            <Toggle label="Prefer long sleeves" on={prefs.prefer_long_sleeves} onChange={(v) => setPrefs({ prefer_long_sleeves: v })} />
          </div>
          <div className="pt-4">
            <label className="label">Anything else your stylist should know?</label>
            <textarea className="input" rows={2} maxLength={500} placeholder="e.g. I never tuck in shirts" value={prefs.notes} onChange={(e) => setPrefs({ notes: e.target.value })} />
          </div>
          {rules.length > 0 && (
            <details className="pt-4 text-sm">
              <summary className="cursor-pointer text-muted">{BODY_SHAPE_LABELS[profile.body_shape!]} styling rules</summary>
              <div className="mt-3 space-y-2">
                {rules.map((r) => (
                  <label key={r.id} className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1 accent-[var(--color-ink)]" checked={!prefs.disabled_rules.includes(r.id)} onChange={(e) => setPrefs({ disabled_rules: e.target.checked ? prefs.disabled_rules.filter((x) => x !== r.id) : [...prefs.disabled_rules, r.id] })} />
                    <span>
                      {r.description}
                      {r.overriddenBy && prefs[r.overriddenBy] === true ? <em className="text-muted"> — off (you allowed it)</em> : null}
                    </span>
                  </label>
                ))}
              </div>
            </details>
          )}
        </div>
      </section>

      {/* Budget */}
      <section id="budget" className="card space-y-4 p-6">
        <p className="eyebrow">Shopping budget</p>
        <div className="flex items-center gap-5">
          <label className="flex w-36 shrink-0 items-baseline gap-1 rounded-2xl border border-line px-4 py-3">
            <span className="text-muted">{profile.budget.currency === "USD" ? "$" : profile.budget.currency}</span>
            <input
              className="display w-full bg-transparent text-[34px] outline-none"
              inputMode="numeric"
              aria-label="Maximum per item"
              value={profile.budget.max_per_item}
              onChange={(e) => save({ budget: { ...profile.budget, max_per_item: Math.max(1, Number(e.target.value.replace(/\D/g, "")) || 1) } })}
            />
          </label>
          <input type="range" min={10} max={500} step={5} value={Math.min(500, profile.budget.max_per_item)} onChange={(e) => save({ budget: { ...profile.budget, max_per_item: Number(e.target.value) } })} className="w-full accent-[var(--color-ink)]" aria-label="Budget slider" />
        </div>
        <p className="text-sm text-muted">Maximum spend per item for gap-analysis suggestions.</p>
        <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
          <span className="text-sm">Shop in</span>
          <Segmented value={profile.department} options={[{ v: "womens", l: "Women" }, { v: "mens", l: "Men" }, { v: "unisex", l: "Any" }]} onChange={(department) => save({ department })} />
        </div>
      </section>

      {mode === "supabase" && (
        <button
          className="text-sm text-muted underline"
          onClick={async () => {
            const { createSupabaseBrowserClient } = await import("@/lib/supabase/browser");
            await createSupabaseBrowserClient().auth.signOut();
            location.href = "/login";
          }}
        >
          Sign out
        </button>
      )}
    </div>
  );
}
