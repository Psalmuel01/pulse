import Link from "next/link";
import type { Route } from "next";

const links: Array<{ href: Route; label: string }> = [
  { href: "/explore", label: "Explore" },
  { href: "/creator", label: "Creator" },
  { href: "/feed", label: "Feed" }
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border/80 bg-canvas/90">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4">
        <div className="text-sm text-ink/80">
          <p className="font-serif text-base">Pulse</p>
          <p className="text-xs text-muted">Built on Tempo x Privy</p>
        </div>
        <nav className="flex items-center gap-5">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm text-ink/80 transition hover:text-ink">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}

