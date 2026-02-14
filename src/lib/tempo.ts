import { env } from "@/lib/env";

const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

type JsonRpcResponse<T> = {
  jsonrpc: "2.0";
  id: number;
  result?: T;
  error?: { code: number; message: string };
};

type TxReceipt = {
  status: string;
  logs: Array<{
    address: string;
    topics: string[];
    data: string;
  }>;
};

function normalizeAddress(address: string) {
  return address.toLowerCase();
}

function topicAddress(address: string) {
  return `0x${address.toLowerCase().replace(/^0x/, "").padStart(64, "0")}`;
}

async function rpcCall<T>(method: string, params: unknown[]): Promise<T | null> {
  if (!env.tempoRpcUrl) {
    return null;
  }

  const response = await fetch(env.tempoRpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method,
      params
    })
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as JsonRpcResponse<T>;
  if (!payload.result || payload.error) {
    return null;
  }

  return payload.result;
}

function hexToBigInt(hex: string) {
  try {
    return BigInt(hex);
  } catch {
    return BigInt(0);
  }
}

type VerifyStablecoinTransferParams = {
  txHash: string;
  fromWallet: string;
  toWallet: string;
  amount: string;
};

export async function verifyTempoStablecoinTransfer({
  txHash,
  fromWallet,
  toWallet,
  amount
}: VerifyStablecoinTransferParams): Promise<boolean> {
  if (!txHash) {
    return false;
  }

  // Development convenience path for local demo/testing.
  if (process.env.NODE_ENV !== "production" && txHash.startsWith("demo_")) {
    return true;
  }

  const receipt = await rpcCall<TxReceipt>("eth_getTransactionReceipt", [txHash]);
  if (!receipt || receipt.status !== "0x1") {
    return false;
  }

  if (!env.tempoStablecoinAddress) {
    return false;
  }

  const normalizedToken = normalizeAddress(env.tempoStablecoinAddress);
  const expectedFrom = topicAddress(fromWallet);
  const expectedTo = topicAddress(toWallet);
  const expectedAmount = BigInt(Math.round(Number(amount) * 1_000_000));

  const transfer = receipt.logs.find((log) => {
    if (normalizeAddress(log.address) !== normalizedToken) {
      return false;
    }

    if (log.topics[0]?.toLowerCase() !== TRANSFER_TOPIC) {
      return false;
    }

    return (
      log.topics[1]?.toLowerCase() === expectedFrom.toLowerCase() &&
      log.topics[2]?.toLowerCase() === expectedTo.toLowerCase()
    );
  });

  if (!transfer) {
    return false;
  }

  return hexToBigInt(transfer.data) >= expectedAmount;
}
