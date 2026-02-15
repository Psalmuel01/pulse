"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { ThemeProvider } from "next-themes";
import { tempo } from "@/lib/tempo-chain";

const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

export function Providers({ children }: { children: React.ReactNode }) {
  const themedChildren = (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </ThemeProvider>
  );

  if (!privyAppId) {
    return themedChildren;
  }

  return (
    <PrivyProvider
      appId={privyAppId}
      config={{
        loginMethods: ["email", "sms", "wallet"],
        defaultChain: tempo,
        supportedChains: [tempo],
        appearance: {
          theme: "light",
          accentColor: "#0f766e",
          landingHeader: "Create your Pulse account",
          loginMessage: "Sign up with email or phone. Your wallet is created automatically.",
          showWalletLoginFirst: false,
          walletChainType: "ethereum-only"
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: "all-users"
          }
        }
      }}
    >
      {themedChildren}
    </PrivyProvider>
  );
}
