import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { userHasActiveSubscription } from "@/lib/access";
import { subscribeContractCall } from "@/lib/contract";
import { db, isDatabaseConfigured } from "@/lib/db";
import { unlockSchema } from "@/lib/validators";

export async function POST(request: Request) {
  if (!isDatabaseConfigured) {
    const payload = await request.json().catch(() => null);
    const parsed = unlockSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
    }

    return NextResponse.json({
      unlocked: true,
      accessMode: "payPerView",
      unlockId: `demo-unlock-${parsed.data.contentId}`,
      viewsRemaining: 1
    });
  }

  const user = await getCurrentUserFromRequest(request);
  const payload = await request.json().catch(() => null);
  const parsed = unlockSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const content = await db.content.findUnique({
    where: { id: parsed.data.contentId },
    include: { creator: true }
  });

  if (!content) {
    return NextResponse.json({ error: "Content not found." }, { status: 404 });
  }

  const hasSubscription = await userHasActiveSubscription(user.id, content.creatorId);

  if (content.onlyForSubscribers && !hasSubscription) {
    return NextResponse.json(
      { error: "This content is only available to active subscribers." },
      { status: 403 }
    );
  }

  if (hasSubscription) {
    return NextResponse.json({
      unlocked: true,
      accessMode: "subscription",
      contentId: content.id
    });
  }

  if (!user.walletAddress) {
    return NextResponse.json({ error: "Missing wallet address for current user." }, { status: 400 });
  }

  if (!parsed.data.txHash) {
    return NextResponse.json({ error: "txHash is required for pay-per-view unlock." }, { status: 400 });
  }

  const verified = await subscribeContractCall({
    txHash: parsed.data.txHash,
    subscriberWallet: user.walletAddress,
    creatorWallet: content.creator.walletAddress,
    amountUsd: content.price.toString(),
    receiverWallet: content.creator.walletAddress
  });

  if (!verified) {
    return NextResponse.json(
      { error: "Pay-per-view payment could not be verified on Tempo." },
      { status: 400 }
    );
  }

  try {
    const unlock = await db.$transaction(async (tx) => {
      const createdUnlock = await tx.unlock.create({
        data: {
          userId: user.id,
          contentId: content.id,
          viewsRemaining: 1,
          onChainTxHash: parsed.data.txHash ?? `demo_unlock_${Date.now()}`
        }
      });

      await tx.transaction.create({
        data: {
          userId: user.id,
          creatorId: content.creatorId,
          contentId: content.id,
          type: "PAY_PER_VIEW",
          amount: content.price,
          status: "CONFIRMED",
          onChainTxHash: parsed.data.txHash ?? `demo_unlock_${Date.now()}`
        }
      });

      await tx.creator.update({
        where: { id: content.creatorId },
        data: {
          lifetimeEarnings: { increment: content.price },
          availableEarnings: { increment: content.price }
        }
      });

      return createdUnlock;
    });

    return NextResponse.json({
      unlocked: true,
      accessMode: "payPerView",
      unlockId: unlock.id,
      viewsRemaining: unlock.viewsRemaining
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Transaction hash already used." }, { status: 409 });
    }

    throw error;
  }
}
