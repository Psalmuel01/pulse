import { verifyTempoPathUsdTransfer } from "@/lib/tempo";
import { env } from "@/lib/env";

type SubscribeContractParams = {
  txHash: string;
  subscriberWallet: string;
  creatorWallet: string;
  amountUsd: string;
};

type RegisterCreatorParams = {
  txHash?: string;
  creatorWallet: string;
  initialFeeUsd: string;
};

type UpdateSubscriptionFeeParams = {
  txHash?: string;
  creatorWallet: string;
  newFeeUsd: string;
};

type WithdrawCreatorEarningParams = {
  txHash?: string;
  creatorWallet: string;
  amountUsd: string;
};

export async function registerCreatorContractCall({
  txHash,
  creatorWallet,
  initialFeeUsd
}: RegisterCreatorParams) {
  if (process.env.NODE_ENV === "production" && !txHash) {
    return false;
  }

  if (!creatorWallet || Number(initialFeeUsd) <= 0) {
    return false;
  }

  return true;
}

export async function subscribeContractCall({
  txHash,
  subscriberWallet,
  creatorWallet,
  amountUsd
}: SubscribeContractParams) {
  // Contract flow collects pathUSD in the contract and tracks creator earnings internally.
  const receiver = env.pulseSubscriptionsContractAddress ?? creatorWallet;

  return verifyTempoPathUsdTransfer({
    txHash,
    fromWallet: subscriberWallet,
    toWallet: receiver,
    amount: amountUsd
  });
}

export async function withdrawCreatorEarningContractCall({
  txHash,
  creatorWallet,
  amountUsd
}: WithdrawCreatorEarningParams) {
  if (process.env.NODE_ENV === "production" && !txHash) {
    return false;
  }

  if (!creatorWallet || Number(amountUsd) <= 0) {
    return false;
  }

  if (!txHash && process.env.NODE_ENV !== "production") {
    return true;
  }

  return Boolean(txHash);
}

export async function updateSubscriptionFeeContractCall({
  txHash,
  creatorWallet,
  newFeeUsd
}: UpdateSubscriptionFeeParams) {
  if (process.env.NODE_ENV === "production" && !txHash) {
    return false;
  }

  if (!creatorWallet || Number(newFeeUsd) <= 0) {
    return false;
  }

  return true;
}

export async function isActiveSubscriberContractRead(params: {
  subscriberWallet: string;
  creatorWallet: string;
}) {
  void params;
  // Hook to chain read-only function `isActiveSubscriber`.
  // Return `null` if no direct chain read is configured.
  return null;
}
