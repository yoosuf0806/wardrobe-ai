"use client";
import { useState } from "react";
import { Brand } from "@/components/nav";
import { artUrlForKind, type ArtKind } from "@/lib/samples/garments";

const COLLAGE: [ArtKind, string][] = [["blazer", "#1F2A44"], ["knit", "#7F1D1D"], ["dress", "#556B2F"], ["loafers", "#8B5A2B"], ["shirt", "#F4F4F0"], ["bag", "#7A5236"]];
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [msg, setMsg] = useState("");
  const configured = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const next = new URLSearchParams(location.search).get("next") ?? "/";
    const { error } = await createSupabaseBrowserClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) { setMsg(error.message); setState("error"); } else setState("sent");
  }

  return (
    <div className="mx-auto mt-10 max-w-sm space-y-6">
      <div className="grid grid-cols-3 gap-2" aria-hidden>
        {COLLAGE.map(([k, c], i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={artUrlForKind(k, c)} alt="" className={`aspect-square w-full rounded-2xl object-cover`} />
        ))}
      </div>
      <div className="text-center">
        <h1><Brand className="text-[52px]" /></h1>
        <p className="mt-2 text-[15px] text-muted">Your wardrobe, styled for the day ahead.</p>
      </div>
      {!configured ? (
        <p className="card text-sm">Supabase isn&apos;t configured, so the app runs in demo mode. <a className="underline" href="/">Open the demo →</a></p>
      ) : state === "sent" ? (
        <p className="card text-sm">Check <strong>{email}</strong> for a sign-in link.</p>
      ) : (
        <form onSubmit={send} className="card space-y-3">
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          <button className="btn-primary w-full" disabled={state === "sending"}>{state === "sending" ? "Sending…" : "Email me a sign-in link"}</button>
          {state === "error" && <p className="text-sm text-accent">{msg}</p>}
        </form>
      )}
    </div>
  );
}
