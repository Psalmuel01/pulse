import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        canvas: "hsl(var(--canvas))",
        ink: "hsl(var(--ink))",
        card: "hsl(var(--card))",
        accent: "hsl(var(--accent))",
        muted: "hsl(var(--muted))",
        border: "hsl(var(--border))"
      },
      fontFamily: {
        sans: ["var(--font-space-grotesk)", "system-ui", "sans-serif"],
        serif: ["var(--font-source-serif)", "Georgia", "serif"]
      },
      boxShadow: {
        glow: "0 10px 40px rgba(20, 64, 110, 0.18)"
      }
    }
  },
  plugins: []
};

export default config;
