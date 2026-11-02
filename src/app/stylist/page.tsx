import { redirect } from "next/navigation";

// The stylist now lives on the home screen (occasion → swipe deck).
export default async function StylistPage({ searchParams }: { searchParams: Promise<{ occasion?: string }> }) {
  const { occasion } = await searchParams;
  redirect(occasion ? `/?occasion=${encodeURIComponent(occasion)}` : "/");
}
