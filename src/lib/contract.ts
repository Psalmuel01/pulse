import { verifyTempoContractCall, verifyTempoPathUsdTransfer } from "@/lib/tempo";
import { env } from "@/lib/env";
import {
  createPublicClient,
  http,
  isAddress,
  parseAbi,
  type Address
} from "viem";
import { tempo } from "@/lib/tempo-chain";

type SubscribeContractParams = {
  txHash: string;
  subscriberWallet: string;
  creatorWallet: string;
  amountUsd: string;
  receiverWallet?: string;
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
  if (!creatorWallet || Number(initialFeeUsd) <= 0) {
    return false;
  }

  if (!txHash && process.env.NODE_ENV !== "production") {
    return true;
  }

  if (!txHash) {
    return false;
  }

  const methodSelector = "0xbdca7d77"; // registerCreator(uint256)
  const strictAddress = env.pulseSubscriptionsContractAddress;

  if (strictAddress) {
    const strictMatch = await verifyTempoContractCall({
      txHash,
      fromWallet: creatorWallet,
      contractAddress: strictAddress,
      methodSelector
    });

    if (strictMatch) {
      return true;
    }
  }

  // Development fallback:
  // Tempo tx formatting can vary between clients; if strict verification fails,
  // accept a successful tx from this wallet (and prefer matching selector when possible).
  if (process.env.NODE_ENV !== "production") {
    const methodMatch = await verifyTempoContractCall({
      txHash,
      fromWallet: creatorWallet,
      methodSelector
    });
    if (methodMatch) {
      return true;
    }

    const methodOnlyMatch = await verifyTempoContractCall({
      txHash,
      methodSelector
    });
    if (methodOnlyMatch) {
      return true;
    }

    return verifyTempoContractCall({
      txHash
    });
  }

  return false;
}

export async function subscribeContractCall({
  txHash,
  subscriberWallet,
  creatorWallet,
  amountUsd,
  receiverWallet
}: SubscribeContractParams) {
  const receiver = receiverWallet ?? env.pulseSubscriptionsContractAddress ?? creatorWallet;
  const transferOk = await verifyTempoPathUsdTransfer({
    txHash,
    fromWallet: subscriberWallet,
    toWallet: receiver,
    amount: amountUsd
  });

  if (!transferOk) {
    return false;
  }

  if (!receiverWallet && env.pulseSubscriptionsContractAddress) {
    const contractCallOk = await verifyTempoContractCall({
      txHash,
      fromWallet: subscriberWallet,
      contractAddress: env.pulseSubscriptionsContractAddress,
      methodSelector: "0x8de69284" // subscribe(address,uint256)
    });

    return contractCallOk;
  }

  return true;
}

export async function withdrawCreatorEarningContractCall({
  txHash,
  creatorWallet,
  amountUsd
}: WithdrawCreatorEarningParams) {
  if (!creatorWallet || Number(amountUsd) <= 0) {
    return false;
  }

  if (!txHash && process.env.NODE_ENV !== "production") {
    return true;
  }

  if (!txHash || !env.pulseSubscriptionsContractAddress) {
    return false;
  }

  return verifyTempoContractCall({
    txHash,
    fromWallet: creatorWallet,
    contractAddress: env.pulseSubscriptionsContractAddress,
    methodSelector: "0x84a7e788" // withdrawCreatorEarning(uint256)
  });
}

export async function updateSubscriptionFeeContractCall({
  txHash,
  creatorWallet,
  newFeeUsd
}: UpdateSubscriptionFeeParams) {
  if (!creatorWallet || Number(newFeeUsd) <= 0) {
    return false;
  }

  if (!txHash && process.env.NODE_ENV !== "production") {
    return true;
  }

  if (!txHash || !env.pulseSubscriptionsContractAddress) {
    return false;
  }

  return verifyTempoContractCall({
    txHash,
    fromWallet: creatorWallet,
    contractAddress: env.pulseSubscriptionsContractAddress,
    methodSelector: "0xb97ff114" // updateSubscriptionFee(uint256)
  });
}

export async function isActiveSubscriberContractRead(params: {
  subscriberWallet: string;
  creatorWallet: string;
}) {
  const { subscriberWallet, creatorWallet } = params;
  const contractAddress = env.pulseSubscriptionsContractAddress;
  if (!contractAddress) {
    return null;
  }

  if (!isAddress(contractAddress) || !isAddress(subscriberWallet) || !isAddress(creatorWallet)) {
    return null;
  }

  try {
    const publicClient = createPublicClient({
      chain: tempo,
      transport: http(env.tempoRpcUrl ?? tempo.rpcUrls.default.http[0])
    });

    const isActive = await publicClient.readContract({
      address: contractAddress as Address,
      abi: parseAbi([
        "function isActiveSubscriber(address subscriber, address creator) view returns (bool)"
      ]),
      functionName: "isActiveSubscriber",
      args: [subscriberWallet as Address, creatorWallet as Address]
    });

    return Boolean(isActive);
  } catch {
    return null;
  }
}
