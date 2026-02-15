import Link from "next/link";
import type { Route } from "next";
import { PrivyAuthButton } from "@/components/privy-auth-button";
import { ThemeToggle } from "@/components/theme-toggle";

const links: Array<{ href: Route; label: string }> = [
  { href: "/explore", label: "Explore" },
  { href: "/feed", label: "Feed" },
  { href: "/dashboard", label: "Creator Dashboard" },
  { href: "/become-creator", label: "Become a Creator" }
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-canvas/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-4">
        <Link href="/" className="font-serif text-xl tracking-tight">
          Pulse
        </Link>
        <nav className="hidden items-center gap-5 md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm text-ink/80 transition hover:text-ink">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <PrivyAuthButton />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
