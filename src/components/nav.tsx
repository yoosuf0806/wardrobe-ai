"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconBag, IconShirt, IconSparkle, IconUser } from "./icons";

const LINKS = [
  { href: "/", label: "Stylist", Icon: IconSparkle },
  { href: "/wardrobe", label: "Wardrobe", Icon: IconShirt },
  { href: "/shop", label: "Shop", Icon: IconBag },
  { href: "/profile", label: "Profile", Icon: IconUser },
];

export function Brand({ className = "text-[30px]" }: { className?: string }) {
  return (
    <span className={`font-display leading-none tracking-tight ${className}`}>
      Smart<em className="text-accent">Stylist</em>
    </span>
  );
}

export function Header() {
  const path = usePathname();
  if (path.startsWith("/login")) return null;
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-canvas/90 backdrop-blur">
      <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" aria-label="SmartStylist home">
          <Brand />
        </Link>
      </div>
    </header>
  );
}

export function Nav() {
  const path = usePathname();
  if (path.startsWith("/login")) return null;
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto grid max-w-xl grid-cols-4">
        {LINKS.map(({ href, label, Icon }) => (
          <Link key={href} href={href} className={`flex flex-col items-center gap-1 py-2.5 text-[12px] transition ${active(href) ? "text-ink" : "text-muted hover:text-ink"}`}>
            <Icon className="h-6 w-6" />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
