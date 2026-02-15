"use client";

import { useCallback, useMemo } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth";
import { buildPrivyAuthHeaders } from "@/lib/privy-auth-headers";

type FetchInput = Parameters<typeof fetch>[0];
type FetchInit = Parameters<typeof fetch>[1];

export function useAuthedFetch() {
  const { user } = usePrivy();
  const { wallets } = useWallets();
  const authHeaders = useMemo(() => buildPrivyAuthHeaders(user), [user]);
  const privyWalletAddress = useMemo(
    () => wallets.find((wallet) => wallet.walletClientType === "privy")?.address ?? null,
    [wallets]
  );

  return useCallback(
    (input: FetchInput, init?: FetchInit) => {
      const headers = new Headers(init?.headers);
      for (const [key, value] of Object.entries(authHeaders)) {
        headers.set(key, value);
      }
      if (privyWalletAddress) {
        headers.set("x-wallet-address", privyWalletAddress);
      }

      return fetch(input, {
        ...init,
        headers
      });
    },
    [authHeaders, privyWalletAddress]
  );
}
