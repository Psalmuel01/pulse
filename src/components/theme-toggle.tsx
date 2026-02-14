"use client";

import { MoonStar, SunMedium } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm font-medium transition hover:shadow-glow"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Toggle theme"
    >
      {isDark ? <SunMedium size={16} /> : <MoonStar size={16} />}
      <span>{isDark ? "Light" : "Dark"}</span>
    </button>
  );
}
