import { tempoModerato } from "viem/chains";
import { alphaUsd } from "@/lib/constants";

const DEFAULT_TEMPO_RPC_URL = "https://rpc.moderato.tempo.xyz";

export const tempoRpcUrl =
  process.env.NEXT_PUBLIC_TEMPO_RPC_URL ??
  process.env.TEMPO_RPC_URL ??
  DEFAULT_TEMPO_RPC_URL;

export const tempo = {
  ...tempoModerato,
  feeToken: alphaUsd,
  rpcUrls: {
    ...tempoModerato.rpcUrls,
    default: {
      ...tempoModerato.rpcUrls.default,
      http: [tempoRpcUrl]
    }
  }
} as const;
