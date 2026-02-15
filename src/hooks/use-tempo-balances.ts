"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createPublicClient,
  formatUnits,
  http,
  isAddress,
  parseAbi,
  type Address
} from "viem";
import { alphaUsd, pathUsd } from "@/lib/constants";
import { tempo, tempoRpcUrl } from "@/lib/tempo-chain";

const tip20Abi = parseAbi([
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
]);

type TokenBalance = {
  symbol: string;
  value: string;
};

type TempoBalances = {
  gas: TokenBalance;
  payment: TokenBalance;
  loading: boolean;
  error: string | null;
};

const fallbackState: TempoBalances = {
  gas: { symbol: "aUSD", value: "0.00" },
  payment: { symbol: "pathUSD", value: "0.00" },
  loading: false,
  error: null
};

export function useTempoBalances(walletAddress?: string | null): TempoBalances {
  const [state, setState] = useState<TempoBalances>({
    ...fallbackState,
    loading: Boolean(walletAddress)
  });

  const client = useMemo(
    () =>
      createPublicClient({
        chain: tempo,
        transport: http(tempoRpcUrl)
      }),
    []
  );

  useEffect(() => {
    if (!walletAddress || !isAddress(walletAddress)) {
      setState(fallbackState);
      return;
    }

    let active = true;

    async function loadBalances() {
      try {
        if (active) {
          setState((current) => ({ ...current, loading: true, error: null }));
        }

        async function fetchTokenBalance(token: Address, fallbackSymbol: string) {
          const [balance, decimals, symbol] = await Promise.all([
            client.readContract({
              address: token,
              abi: tip20Abi,
              functionName: "balanceOf",
              args: [walletAddress as Address]
            }),
            client.readContract({
              address: token,
              abi: tip20Abi,
              functionName: "decimals"
            }),
            client.readContract({
              address: token,
              abi: tip20Abi,
              functionName: "symbol"
            })
          ]);

          return {
            symbol: typeof symbol === "string" ? symbol : fallbackSymbol,
            value: Number(formatUnits(balance as bigint, Number(decimals))).toFixed(4)
          };
        }

        const [gas, payment] = await Promise.all([
          fetchTokenBalance(alphaUsd, "aUSD"),
          fetchTokenBalance(pathUsd, "pathUSD")
        ]);

        if (!active) {
          return;
        }

        setState({
          gas,
          payment,
          loading: false,
          error: null
        });
      } catch (error) {
        if (!active) {
          return;
        }

        setState({
          ...fallbackState,
          loading: false,
          error: error instanceof Error ? error.message : "Could not load balances."
        });
      }
    }

    loadBalances().catch(() => {
      // Errors are handled in state above.
    });

    const timer = setInterval(() => {
      loadBalances().catch(() => {
        // Errors are handled in state above.
      });
    }, 15000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [client, walletAddress]);

  return state;
}
