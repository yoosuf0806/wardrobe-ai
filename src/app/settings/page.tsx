"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { baselineRulesFor } from "@/lib/engine/body-rules";
import { BODY_SHAPE_LABELS, PATTERNS, SLEEVES, type FitPreferences, type Profile } from "@/lib/types";

type Tri = boolean | null;
const TOGGLES: { key: keyof FitPreferences; label: string }[] = [
  { key: "allow_slim_fit", label: "Slim-fit pieces" },
  { key: "allow_oversized", label: "Oversized / boxy cuts" },
  { key: "allow_cropped_tops", label: "Cropped tops" },
  { key: "allow_horizontal_stripes", label: "Horizontal stripes" },
  { key: "allow_bold_patterns", label: "Bold patterns" },
];

function TriState({ value, onChange }: { value: Tri; onChange: (v: Tri) => void }) {
  const opts: { v: Tri; l: string }[] = [{ v: false, l: "Never" }, { v: null, l: "Stylist decides" }, { v: true, l: "Always OK" }];
  return (
    <div className="flex overflow-hidden rounded-full border border-line text-xs">
      {opts.map((o) => (
        <button key={String(o.v)} onClick={() => onChange(o.v)} className={`px-2.5 py-1.5 ${value === o.v ? "bg-ink text-white" : "bg-surface"}`}>{o.l}</button>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [mode, setMode] = useState<string>("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/profile").then(async (r) => {
      if (r.status === 401) return (location.href = "/login");
      const j = await r.json();
      setProfile(j.profile);
      setMode(j.mode);
    });
  }, []);

  if (!profile) return <p className="text-sm text-muted">Loading…</p>;
  const prefs = profile.fit_preferences;
  const setPrefs = (p: Partial<FitPreferences>) => { setSaved(false); setProfile({ ...profile, fit_preferences: { ...prefs, ...p } }); };
  const rules = baselineRulesFor(profile.body_shape);

  async function save() {
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fit_preferences: profile!.fit_preferences, budget: profile!.budget, department: profile!.department, display_name: profile!.display_name }),
    });
    setSaved(true);
  }

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-semibold">Profile & fit</h1>

      <section className="card flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted">Body shape</div>
          <div className="font-medium">{profile.body_shape ? BODY_SHAPE_LABELS[profile.body_shape] : "Not set"}{profile.body_shape_source === "manual" ? " (chosen by you)" : ""}</div>
        </div>
        <Link href="/body" className="btn-ghost py-2">{profile.body_shape ? "Re-analyse" : "Analyse"}</Link>
      </section>

      <section className="card space-y-3">
        <div>
          <h2 className="font-medium">Your comfort rules</h2>
          <p className="text-xs text-muted">These override body-type advice. “Never” removes items from every suggestion; “Always OK” switches off related baseline rules.</p>
        </div>
        {TOGGLES.map((t) => (
          <div key={t.key} className="flex items-center justify-between gap-3">
            <span className="text-sm">{t.label}</span>
            <TriState value={prefs[t.key] as Tri} onChange={(v) => setPrefs({ [t.key]: v } as Partial<FitPreferences>)} />
          </div>
        ))}
        <div>
          <label className="label">Sleeve lengths you wear (none selected = any)</label>
          <div className="flex flex-wrap gap-1.5">
            {SLEEVES.filter((s) => s !== "none").map((s) => (
              <button key={s} className={`${prefs.preferred_sleeves.includes(s) ? "chip-on" : "chip"} capitalize`}
                onClick={() => setPrefs({ preferred_sleeves: prefs.preferred_sleeves.includes(s) ? prefs.preferred_sleeves.filter((x) => x !== s) : [...prefs.preferred_sleeves, s] })}>
                {s.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Patterns to avoid</label>
          <div className="flex flex-wrap gap-1.5">
            {PATTERNS.filter((p) => p !== "solid").map((p) => (
              <button key={p} className={`${prefs.avoid_patterns.includes(p) ? "chip-on" : "chip"} capitalize`}
                onClick={() => setPrefs({ avoid_patterns: prefs.avoid_patterns.includes(p) ? prefs.avoid_patterns.filter((x) => x !== p) : [...prefs.avoid_patterns, p] })}>
                {p.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Colours to avoid</label>
          <div className="flex flex-wrap items-center gap-2">
            {prefs.avoid_colors.map((c) => (
              <button key={c} title="Remove" onClick={() => setPrefs({ avoid_colors: prefs.avoid_colors.filter((x) => x !== c) })} className="h-7 w-7 rounded-full border border-line" style={{ background: c }} />
            ))}
            <input type="color" className="h-7 w-10 rounded border border-line" onChange={(e) => !prefs.avoid_colors.includes(e.target.value.toUpperCase()) && setPrefs({ avoid_colors: [...prefs.avoid_colors, e.target.value.toUpperCase()] })} />
          </div>
        </div>
        <div>
          <label className="label">Anything else the stylist should know?</label>
          <textarea className="input" rows={2} maxLength={500} value={prefs.notes} placeholder="e.g. I prefer high-waisted trousers and never tuck in shirts" onChange={(e) => setPrefs({ notes: e.target.value })} />
        </div>
      </section>

      {rules.length > 0 && (
        <section className="card space-y-2">
          <h2 className="font-medium">{BODY_SHAPE_LABELS[profile.body_shape!]} baseline rules</h2>
          <p className="text-xs text-muted">Soft guidance only. Untick any you don&apos;t want applied.</p>
          {rules.map((r) => (
            <label key={r.id} className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" checked={!prefs.disabled_rules.includes(r.id)}
                onChange={(e) => setPrefs({ disabled_rules: e.target.checked ? prefs.disabled_rules.filter((x) => x !== r.id) : [...prefs.disabled_rules, r.id] })} />
              <span>{r.description}{r.overriddenBy && prefs[r.overriddenBy] === true ? <em className="text-muted"> – off (you allowed it)</em> : null}</span>
            </label>
          ))}
        </section>
      )}

      <section className="card grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label">Max per item</label>
          <input className="input" type="number" min={1} value={profile.budget.max_per_item} onChange={(e) => { setSaved(false); setProfile({ ...profile, budget: { ...profile.budget, max_per_item: Number(e.target.value) || 1 } }); }} />
        </div>
        <div>
          <label className="label">Currency</label>
          <input className="input uppercase" maxLength={3} value={profile.budget.currency} onChange={(e) => { setSaved(false); setProfile({ ...profile, budget: { ...profile.budget, currency: e.target.value.toUpperCase() } }); }} />
        </div>
        <div>
          <label className="label">Shop in</label>
          <select className="input" value={profile.department} onChange={(e) => { setSaved(false); setProfile({ ...profile, department: e.target.value as Profile["department"] }); }}>
            <option value="womens">Womenswear</option>
            <option value="mens">Menswear</option>
            <option value="unisex">Any / unisex</option>
          </select>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button className="btn-primary" onClick={save}>Save</button>
        {saved && <span className="text-sm text-good">Saved ✓</span>}
        {mode === "demo" && <span className="text-xs text-muted">Demo mode – resets on restart</span>}
      </div>
    </div>
  );
}
