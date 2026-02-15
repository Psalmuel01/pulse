import { PrivyClient } from "@privy-io/node";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const findSchema = z.object({
  identifier: z.string().min(1)
});

function getPrivyClient() {
  const appId = process.env.PRIVY_APP_ID ?? process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;

  if (!appId || !appSecret) {
    return null;
  }

  return new PrivyClient({
    appId,
    appSecret
  });
}

function getWalletAddressFromUser(user: unknown): string | null {
  const linkedAccounts =
    (user as { linked_accounts?: Array<Record<string, unknown>> | undefined })?.linked_accounts ?? [];

  const wallet = linkedAccounts.find(
    (account) => account.type === "wallet" && account.chain_type === "ethereum"
  ) as { address?: unknown } | undefined;

  return typeof wallet?.address === "string" ? wallet.address : null;
}

async function getOrCreateUser(privy: PrivyClient, identifier: string) {
  const users = privy.users();

  if (identifier.startsWith("0x") && identifier.length === 42) {
    return {
      id: identifier,
      linked_accounts: [{ type: "wallet", chain_type: "ethereum", address: identifier }]
    };
  }

  if (!identifier.includes("@")) {
    const existing = await users.getByPhoneNumber({ number: identifier }).catch(() => null);
    if (existing) {
      return existing;
    }

    return users.create({
      linked_accounts: [{ type: "phone", number: identifier }],
      wallets: [{ chain_type: "ethereum" }]
    });
  }

  const existing = await users.getByEmailAddress({ address: identifier }).catch(() => null);
  if (existing) {
    return existing;
  }

  return users.create({
    linked_accounts: [{ type: "email", address: identifier }],
    wallets: [{ chain_type: "ethereum" }]
  });
}

export async function POST(request: NextRequest) {
  try {
    const payload = findSchema.parse(await request.json());
    if (payload.identifier.startsWith("0x") && payload.identifier.length === 42) {
      return NextResponse.json({
        success: true,
        address: payload.identifier,
        identifier: payload.identifier,
        identifierType: "wallet",
        userId: payload.identifier
      });
    }

    const privy = getPrivyClient();
    if (!privy) {
      return NextResponse.json(
        { error: "Missing Privy server config. Set PRIVY_APP_SECRET for email/phone lookup." },
        { status: 500 }
      );
    }

    const user = await getOrCreateUser(privy, payload.identifier);
    const walletAddress = getWalletAddressFromUser(user);

    if (!walletAddress) {
      return NextResponse.json({ error: "Wallet not found." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      address: walletAddress,
      identifier: payload.identifier,
      identifierType: payload.identifier.includes("@") ? "email" : "phone",
      userId: (user as { id: string }).id
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
