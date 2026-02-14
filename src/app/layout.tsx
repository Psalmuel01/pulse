import type { Metadata } from "next";
import { Space_Grotesk, Source_Serif_4 } from "next/font/google";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";
import "@/app/globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk"
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif"
});

export const metadata: Metadata = {
  title: "Pulse",
  description: "Tempo-native creator subscriptions and pay-per-view"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${spaceGrotesk.variable} ${sourceSerif.variable}`}>
        <Providers>
          <SiteHeader />
          <main className="mx-auto w-full max-w-6xl px-5 py-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
