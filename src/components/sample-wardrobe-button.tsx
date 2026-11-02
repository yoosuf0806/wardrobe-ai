"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

/** One tap: copy the 21-piece sample wardrobe into the user's own account. */
export function SampleWardrobeButton({ className = "btn-primary" }: { className?: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  return (
    <button
      className={className}
      disabled={state === "loading"}
      onClick={async () => {
        setState("loading");
        const res = await fetch("/api/wardrobe/sample", { method: "POST" });
        if (!res.ok) return setState("error");
        setState("idle");
        router.refresh();
      }}
    >
      {state === "loading" ? "Adding 21 pieces…" : state === "error" ? "Couldn't add – try again" : "Load sample wardrobe"}
    </button>
  );
}
