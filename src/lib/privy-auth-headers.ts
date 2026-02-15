import type { User } from "@privy-io/react-auth";

type LinkedAccountLike = {
  type?: string;
  address?: string;
  number?: string;
  chainType?: string;
};

function getWalletAddress(user: User | null | undefined) {
  if (user?.wallet?.address) {
    return user.wallet.address;
  }

  const linkedAccounts = (user?.linkedAccounts ?? []) as LinkedAccountLike[];
  const walletAccount = linkedAccounts.find(
    (account) =>
      account.type === "wallet" &&
      (account.chainType === "ethereum" || account.chainType === undefined) &&
      typeof account.address === "string"
  );

  return walletAccount?.address;
}

export function buildPrivyAuthHeaders(user: User | null | undefined) {
  if (!user?.id) {
    return {};
  }

  const headers: Record<string, string> = {
    "x-user-id": user.id
  };

  const walletAddress = getWalletAddress(user);
  if (walletAddress) {
    headers["x-wallet-address"] = walletAddress;
  }

  if (user.email?.address) {
    headers["x-user-email"] = user.email.address;
  }

  if (user.phone?.number) {
    headers["x-user-phone"] = user.phone.number;
  }

  return headers;
}
