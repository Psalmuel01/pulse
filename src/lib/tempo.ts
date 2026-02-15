import { env } from "@/lib/env";

const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const TRANSFER_WITH_MEMO_TOPIC =
  "0x57bc7354aa85aed339e000bccffabbc529466af35f0772c8f8ee1145927de7f0";

type JsonRpcResponse<T> = {
  jsonrpc: "2.0";
  id: number;
  result?: T;
  error?: { code: number; message: string };
};

type TxReceipt = {
  status: string;
  from?: string;
  to?: string | null;
  logs: Array<{
    address: string;
    topics: string[];
    data: string;
  }>;
};

type TxByHash = {
  from: string;
  to: string | null;
  input: string;
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

function parseUnitsFromDecimal(value: string, decimals: number) {
  const normalized = value.trim();
  if (!normalized) {
    return BigInt(0);
  }

  const negative = normalized.startsWith("-");
  if (negative) {
    return BigInt(0);
  }

  const [wholeRaw, fractionRaw = ""] = normalized.split(".");
  const whole = wholeRaw.replace(/\D/g, "") || "0";
  const fraction = fractionRaw.replace(/\D/g, "").slice(0, decimals).padEnd(decimals, "0");
  return BigInt(`${whole}${fraction}`);
}

type VerifyPathUsdTransferParams = {
  txHash: string;
  fromWallet: string;
  toWallet: string;
  amount: string;
};

export async function verifyTempoPathUsdTransfer({
  txHash,
  fromWallet,
  toWallet,
  amount
}: VerifyPathUsdTransferParams): Promise<boolean> {
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

  if (!env.tempoPathUsdAddress) {
    return false;
  }

  const normalizedToken = normalizeAddress(env.tempoPathUsdAddress);
  const expectedFrom = topicAddress(fromWallet);
  const expectedTo = topicAddress(toWallet);
  const expectedAmount = parseUnitsFromDecimal(amount, env.tempoPathUsdDecimals);

  const transfer = receipt.logs.find((log) => {
    if (normalizeAddress(log.address) !== normalizedToken) {
      return false;
    }

    const eventTopic = log.topics[0]?.toLowerCase();
    if (eventTopic !== TRANSFER_TOPIC && eventTopic !== TRANSFER_WITH_MEMO_TOPIC) {
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

type VerifyContractCallParams = {
  txHash: string;
  fromWallet: string;
  contractAddress: string;
  methodSelector?: string;
};

export async function verifyTempoContractCall({
  txHash,
  fromWallet,
  contractAddress,
  methodSelector
}: VerifyContractCallParams): Promise<boolean> {
  if (!txHash) {
    return false;
  }

  if (!fromWallet || !contractAddress) {
    return false;
  }

  if (process.env.NODE_ENV !== "production" && txHash.startsWith("demo_")) {
    return true;
  }

  const [receipt, transaction] = await Promise.all([
    rpcCall<TxReceipt>("eth_getTransactionReceipt", [txHash]),
    rpcCall<TxByHash>("eth_getTransactionByHash", [txHash])
  ]);

  if (!receipt || receipt.status !== "0x1" || !transaction) {
    return false;
  }

  if (normalizeAddress(transaction.from) !== normalizeAddress(fromWallet)) {
    return false;
  }

  if (!transaction.to || normalizeAddress(transaction.to) !== normalizeAddress(contractAddress)) {
    return false;
  }

  if (!methodSelector) {
    return true;
  }

  return transaction.input.toLowerCase().startsWith(methodSelector.toLowerCase());
}
