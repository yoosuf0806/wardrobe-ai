import { Suspense } from "react";
import { StylistClient } from "./stylist-client";

export default function StylistPage() {
  return (
    <Suspense>
      <StylistClient />
    </Suspense>
  );
}
