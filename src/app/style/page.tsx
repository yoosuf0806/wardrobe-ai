"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FlatLay } from "@/components/flat-lay";
import { IconCheck } from "@/components/icons";
import { looksFor, scoreStyle, topArchetypes } from "@/lib/style/looks";
import { ARCHETYPE_LABELS, EMPTY_STYLE_PROFILE, type Department, type Profile } from "@/lib/types";

const MIN_LIKES = 3;

/** Style quiz: tap the looks you'd wear; we infer style archetypes + palettes. */
export default function StylePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [dept, setDept] = useState<Department>("unisex");
  const [liked, setLiked] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch("/api/profile").then(async (r) => {
      if (r.status === 401) return void (location.href = "/login");
      const { profile: p } = (await r.json()) as { profile: Profile };
      setProfile(p);
      setDept(p.department);
      setLiked(p.style_profile.liked_looks ?? []);
    });
  }, []);

  const looks = useMemo(() => looksFor(dept), [dept]);
  const visibleLiked = liked.filter((id) => looks.some((l) => l.id === id));

  async function save() {
    if (!profile) return;
    setSaving(true);
    const s = scoreStyle(looks, visibleLiked);
    const style_profile = { ...EMPTY_STYLE_PROFILE, ...profile.style_profile, ...s, completed_at: new Date().toISOString() };
    const patch: Partial<Profile> = { style_profile, ...(profile.department === "unisex" && dept !== "unisex" ? { department: dept } : {}) };
    const r = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    if (r.ok) setProfile((await r.json()).profile);
    setSaving(false);
    setDone(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (!profile) return <p className="text-sm text-muted">Loading…</p>;

  if (done) {
    const top = topArchetypes(profile.style_profile.archetypes);
    const likedLooks = looks.filter((l) => visibleLiked.includes(l.id));
    return (
      <div className="space-y-6">
        <header className="space-y-2">
          <p className="eyebrow">Your style</p>
          <h1 className="display text-[44px]">{top.length ? top.map((a) => ARCHETYPE_LABELS[a]).join(" & ") : "Eclectic"}</h1>
          <p className="text-[15px] text-muted">
            We&apos;ll lean your outfits and shopping picks this way. Your fit settings still come first, and we keep learning from what you wear.
          </p>
        </header>
        <div className="grid grid-cols-3 gap-2">
          {likedLooks.slice(0, 6).map((l) => (
            <div key={l.id} className="aspect-[4/5] overflow-hidden rounded-2xl">
              <FlatLay look={l} />
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/" className="btn-primary">
            Style me
          </Link>
          <button className="btn-ghost" onClick={() => setDone(false)}>
            Change answers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      <header className="space-y-2">
        <p className="eyebrow">Style profile</p>
        <h1 className="display text-[44px]">Which looks feel like you?</h1>
        <p className="text-[15px] text-muted">Tap every outfit you&apos;d happily wear. Pick at least {MIN_LIKES} — we use this when suggesting outfits and new clothes.</p>
      </header>

      {profile.department === "unisex" && (
        <div className="flex gap-2" role="tablist" aria-label="Show looks for">
          {(["womens", "mens", "unisex"] as Department[]).map((d) => (
            <button key={d} role="tab" aria-selected={dept === d} onClick={() => setDept(d)} className={dept === d ? "chip-on" : "chip"}>
              {d === "womens" ? "Women's looks" : d === "mens" ? "Men's looks" : "Both"}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {looks.map((l) => {
          const on = liked.includes(l.id);
          return (
            <button
              key={l.id}
              aria-pressed={on}
              onClick={() => setLiked((x) => (on ? x.filter((i) => i !== l.id) : [...x, l.id]))}
              className={`relative overflow-hidden rounded-[22px] border-2 bg-surface text-left transition ${on ? "border-ink" : "border-transparent"}`}
            >
              <div className="aspect-[4/5]">
                <FlatLay look={l} />
              </div>
              <p className="px-3 pt-2.5 text-sm">{l.title}</p>
              <p className="truncate px-3 pb-2.5 text-[10px] text-faint">{l.credit ? `Photo: ${l.credit.photographer} · Pexels` : "\u00a0"}</p>
              <span className={`absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full transition ${on ? "bg-ink text-white" : "bg-surface/90 text-faint"}`}>
                <IconCheck className="h-4 w-4" />
              </span>
            </button>
          );
        })}
      </div>

      <div className="fixed inset-x-0 bottom-[68px] z-20 px-4 pb-3 sm:px-6">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3 rounded-full border border-line bg-surface/95 p-2 pl-5 shadow-lg backdrop-blur">
          <span className="text-sm text-muted">{visibleLiked.length} liked</span>
          <button className="btn-primary" disabled={visibleLiked.length < MIN_LIKES || saving} onClick={save}>
            {saving ? "Saving…" : visibleLiked.length < MIN_LIKES ? `Pick ${MIN_LIKES - visibleLiked.length} more` : "Save my style"}
          </button>
        </div>
      </div>
    </div>
  );
}
