import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Pulse",
  description: "Tempo-native creator subscriptions and pay-per-view"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <SiteHeader />
          <main className="mx-auto w-full max-w-6xl px-5 py-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
