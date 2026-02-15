"use client";

import { useState } from "react";
import { useWallets } from "@privy-io/react-auth";
import {
  custom,
  createPublicClient,
  createWalletClient,
  http,
  isAddress,
  parseAbi,
  parseUnits,
  stringToHex,
  walletActions,
  type Address,
  type Hash
} from "viem";
import { tempoActions } from "viem/tempo";
import { pathUsd } from "@/lib/constants";
import { tempo, tempoRpcUrl } from "@/lib/tempo-chain";

const tip20Abi = parseAbi([
  "function decimals() view returns (uint8)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function transferWithMemo(address to, uint256 amount, bytes32 memo) returns (bool)"
]);

const pulseSubscriptionsAbi = parseAbi([
  "function registerCreator(uint256 initialFee)",
  "function subscribe(address creator, uint256 amount)",
  "function withdrawCreatorEarning(uint256 amount)",
  "function updateSubscriptionFee(uint256 newFee)"
]);

function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Transaction failed.";
}

const MIN_TEMPO_BASE_FEE = BigInt("20000000000");
const MIN_PRIORITY_FEE = BigInt("1000000000");
const ZERO_BIGINT = BigInt(0);
const ONE_BIGINT = BigInt(1);
const TWO_BIGINT = BigInt(2);
const HUNDRED_BIGINT = BigInt(100);
const GAS_BUFFER_PERCENT = BigInt(120);
const MIN_GAS_TOKEN_APPROVE = BigInt("120000");
const MIN_GAS_TOKEN_TRANSFER = BigInt("120000");
const MIN_GAS_REGISTER_CREATOR = BigInt("500000");
const MIN_GAS_SUBSCRIBE = BigInt("700000");
const MIN_GAS_UPDATE_SUBSCRIPTION_FEE = BigInt("300000");
const MIN_GAS_WITHDRAW_CREATOR = BigInt("350000");

export function useTempoPayments() {
  const { wallets } = useWallets();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function withTx<T>(fn: () => Promise<T>) {
    if (isSubmitting) {
      throw new Error("A transaction is already in progress.");
    }

    setIsSubmitting(true);
    setError(null);

    try {
      return await fn();
    } catch (err) {
      const message = toErrorMessage(err);
      setError(message);
      throw new Error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function getClients() {
    const wallet = wallets.find((item) => item.walletClientType === "privy");
    if (!wallet?.address) {
      throw new Error("No Privy embedded wallet found. Sign in with Privy first.");
    }

    await wallet.switchChain(tempo.id);
    const provider = await wallet.getEthereumProvider();

    const publicClient = createPublicClient({
      chain: tempo,
      transport: http(tempoRpcUrl)
    }).extend(tempoActions());

    const walletClient = createWalletClient({
      account: wallet.address as Address,
      chain: tempo,
      transport: custom(provider)
    })
      .extend(walletActions)
      .extend(tempoActions());

    return {
      account: wallet.address as Address,
      publicClient,
      walletClient
    };
  }

  async function getPathUsdAmount(publicClient: Awaited<ReturnType<typeof getClients>>["publicClient"], amountUsd: string) {
    const decimals = await publicClient.readContract({
      address: pathUsd,
      abi: tip20Abi,
      functionName: "decimals"
    });

    return parseUnits(amountUsd, Number(decimals));
  }

  function getSubscriptionsContractAddress() {
    const contractAddress = process.env.NEXT_PUBLIC_PULSE_SUBSCRIPTIONS_CONTRACT_ADDRESS;
    if (!contractAddress || !isAddress(contractAddress)) {
      throw new Error(
        "Missing NEXT_PUBLIC_PULSE_SUBSCRIPTIONS_CONTRACT_ADDRESS in .env.local."
      );
    }

    return contractAddress as Address;
  }

  async function waitForHash(
    publicClient: Awaited<ReturnType<typeof getClients>>["publicClient"],
    hash: Hash
  ) {
    await publicClient.waitForTransactionReceipt({ hash });
    return hash;
  }

  async function getPendingNonce(
    publicClient: Awaited<ReturnType<typeof getClients>>["publicClient"],
    account: Address
  ) {
    return publicClient.getTransactionCount({
      address: account,
      blockTag: "pending"
    });
  }

  async function resolveFeeOverrides(
    publicClient: Awaited<ReturnType<typeof getClients>>["publicClient"]
  ) {
    const [estimatedFees, gasPrice] = await Promise.all([
      publicClient.estimateFeesPerGas().catch(() => null),
      publicClient.getGasPrice().catch(() => null)
    ]);

    let maxPriorityFeePerGas = estimatedFees?.maxPriorityFeePerGas ?? MIN_PRIORITY_FEE;
    if (maxPriorityFeePerGas <= ZERO_BIGINT) {
      maxPriorityFeePerGas = MIN_PRIORITY_FEE;
    }

    let maxFeePerGas =
      estimatedFees?.maxFeePerGas ??
      (gasPrice && gasPrice > ZERO_BIGINT ? gasPrice * TWO_BIGINT : MIN_TEMPO_BASE_FEE);

    if (maxFeePerGas < MIN_TEMPO_BASE_FEE) {
      maxFeePerGas = MIN_TEMPO_BASE_FEE;
    }

    if (maxPriorityFeePerGas >= maxFeePerGas) {
      maxPriorityFeePerGas =
        maxFeePerGas > TWO_BIGINT ? maxFeePerGas / TWO_BIGINT : ONE_BIGINT;
    }

    return {
      maxFeePerGas,
      maxPriorityFeePerGas
    };
  }

  async function estimateGasWithBuffer(
    publicClient: Awaited<ReturnType<typeof getClients>>["publicClient"],
    request: Parameters<typeof publicClient.estimateContractGas>[0],
    minGas: bigint
  ) {
    try {
      const estimatedGas = await publicClient.estimateContractGas(request);
      const bufferedGas = (estimatedGas * GAS_BUFFER_PERCENT) / HUNDRED_BIGINT;
      return bufferedGas > minGas ? bufferedGas : minGas;
    } catch {
      return minGas;
    }
  }

  async function registerCreator(initialFeeUsd: string) {
    return withTx(async () => {
      const contractAddress = getSubscriptionsContractAddress();
      const { account, publicClient, walletClient } = await getClients();
      const amount = await getPathUsdAmount(publicClient, initialFeeUsd);
      const feeOverrides = await resolveFeeOverrides(publicClient);
      const gas = await estimateGasWithBuffer(publicClient, {
        address: contractAddress,
        abi: pulseSubscriptionsAbi,
        functionName: "registerCreator",
        args: [amount],
        account
      }, MIN_GAS_REGISTER_CREATOR);

      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: pulseSubscriptionsAbi,
        functionName: "registerCreator",
        args: [amount],
        account,
        gas,
        nonce: await getPendingNonce(publicClient, account),
        ...feeOverrides
      });

      return waitForHash(publicClient, hash);
    });
  }

  async function updateSubscriptionFee(newFeeUsd: string) {
    return withTx(async () => {
      const contractAddress = getSubscriptionsContractAddress();
      const { account, publicClient, walletClient } = await getClients();
      const amount = await getPathUsdAmount(publicClient, newFeeUsd);
      const feeOverrides = await resolveFeeOverrides(publicClient);
      const gas = await estimateGasWithBuffer(publicClient, {
        address: contractAddress,
        abi: pulseSubscriptionsAbi,
        functionName: "updateSubscriptionFee",
        args: [amount],
        account
      }, MIN_GAS_UPDATE_SUBSCRIPTION_FEE);

      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: pulseSubscriptionsAbi,
        functionName: "updateSubscriptionFee",
        args: [amount],
        account,
        gas,
        nonce: await getPendingNonce(publicClient, account),
        ...feeOverrides
      });

      return waitForHash(publicClient, hash);
    });
  }

  async function withdrawCreatorEarning(amountUsd: string) {
    return withTx(async () => {
      const contractAddress = getSubscriptionsContractAddress();
      const { account, publicClient, walletClient } = await getClients();
      const amount = await getPathUsdAmount(publicClient, amountUsd);
      const feeOverrides = await resolveFeeOverrides(publicClient);
      const gas = await estimateGasWithBuffer(publicClient, {
        address: contractAddress,
        abi: pulseSubscriptionsAbi,
        functionName: "withdrawCreatorEarning",
        args: [amount],
        account
      }, MIN_GAS_WITHDRAW_CREATOR);

      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: pulseSubscriptionsAbi,
        functionName: "withdrawCreatorEarning",
        args: [amount],
        account,
        gas,
        nonce: await getPendingNonce(publicClient, account),
        ...feeOverrides
      });

      return waitForHash(publicClient, hash);
    });
  }

  async function subscribe(creatorWallet: string, amountUsd: string) {
    return withTx(async () => {
      if (!isAddress(creatorWallet)) {
        throw new Error("Creator wallet address is invalid.");
      }

      const contractAddress = getSubscriptionsContractAddress();
      const { account, publicClient, walletClient } = await getClients();
      const amount = await getPathUsdAmount(publicClient, amountUsd);
      const feeOverrides = await resolveFeeOverrides(publicClient);

      const allowance = await publicClient.readContract({
        address: pathUsd,
        abi: tip20Abi,
        functionName: "allowance",
        args: [account, contractAddress]
      });

      if (allowance < amount) {
        const approveGas = await estimateGasWithBuffer(publicClient, {
          address: pathUsd,
          abi: tip20Abi,
          functionName: "approve",
          args: [contractAddress, amount],
          account
        }, MIN_GAS_TOKEN_APPROVE);
        const approveHash = await walletClient.writeContract({
          address: pathUsd,
          abi: tip20Abi,
          functionName: "approve",
          args: [contractAddress, amount],
          account,
          gas: approveGas,
          nonce: await getPendingNonce(publicClient, account),
          ...feeOverrides
        });
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
      }

      const subscribeGas = await estimateGasWithBuffer(publicClient, {
        address: contractAddress,
        abi: pulseSubscriptionsAbi,
        functionName: "subscribe",
        args: [creatorWallet as Address, amount],
        account
      }, MIN_GAS_SUBSCRIBE);
      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: pulseSubscriptionsAbi,
        functionName: "subscribe",
        args: [creatorWallet as Address, amount],
        account,
        gas: subscribeGas,
        nonce: await getPendingNonce(publicClient, account),
        ...feeOverrides
      });

      return waitForHash(publicClient, hash);
    });
  }

  async function unlockContent(toWallet: string, amountUsd: string, memo?: string) {
    return withTx(async () => {
      if (!isAddress(toWallet)) {
        throw new Error("Creator wallet address is invalid.");
      }

      const { account, publicClient, walletClient } = await getClients();
      const amount = await getPathUsdAmount(publicClient, amountUsd);
      const memoHex = memo?.trim() ? stringToHex(memo.trim().slice(0, 31), { size: 32 }) : undefined;

      const request = memoHex
        ? {
            address: pathUsd,
            abi: tip20Abi,
            functionName: "transferWithMemo" as const,
            args: [toWallet as Address, amount, memoHex],
            account
          }
        : {
            address: pathUsd,
            abi: tip20Abi,
            functionName: "transfer" as const,
            args: [toWallet as Address, amount],
            account
          };

      const [feeOverrides, gas, nonce] = await Promise.all([
        resolveFeeOverrides(publicClient),
        estimateGasWithBuffer(publicClient, request, MIN_GAS_TOKEN_TRANSFER),
        getPendingNonce(publicClient, account)
      ]);

      const hash = await walletClient.writeContract({
        ...request,
        gas,
        nonce,
        ...feeOverrides
      });

      return waitForHash(publicClient, hash);
    });
  }

  return {
    error,
    isSubmitting,
    registerCreator,
    updateSubscriptionFee,
    withdrawCreatorEarning,
    subscribe,
    unlockContent
  };
}
