import { addDays } from "date-fns";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { subscribeContractCall } from "@/lib/contract";
import { db } from "@/lib/db";
import { subscribeSchema } from "@/lib/validators";

export async function GET(request: Request) {
  const user = await getCurrentUserFromRequest(request);

  const subscriptions = await db.subscription.findMany({
    where: {
      userId: user.id,
      status: "ACTIVE",
      expiresAt: { gt: new Date() }
    },
    include: {
      creator: {
        select: {
          id: true,
          username: true,
          category: true,
          subscriptionFee: true
        }
      }
    },
    orderBy: { expiresAt: "desc" }
  });

  return NextResponse.json({
    subscriptions: subscriptions.map((subscription) => ({
      id: subscription.id,
      creator: {
        ...subscription.creator,
        subscriptionFee: subscription.creator.subscriptionFee.toString()
      },
      startsAt: subscription.startsAt,
      expiresAt: subscription.expiresAt,
      amount: subscription.amount.toString(),
      onChainTxHash: subscription.onChainTxHash
    }))
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUserFromRequest(request);
  const payload = await request.json().catch(() => null);
  const parsed = subscribeSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  if (!user.walletAddress) {
    return NextResponse.json({ error: "Missing wallet address for current user." }, { status: 400 });
  }

  const creator = await db.creator.findUnique({ where: { id: parsed.data.creatorId } });
  if (!creator) {
    return NextResponse.json({ error: "Creator not found." }, { status: 404 });
  }

  if (creator.userId === user.id) {
    return NextResponse.json({ error: "Creators cannot subscribe to themselves." }, { status: 400 });
  }

  const amountUsd = creator.subscriptionFee.toString();

  const verified = await subscribeContractCall({
    txHash: parsed.data.txHash,
    subscriberWallet: user.walletAddress,
    creatorWallet: creator.walletAddress,
    amountUsd
  });

  if (!verified) {
    return NextResponse.json(
      { error: "subscribe contract payment could not be verified on Tempo." },
      { status: 400 }
    );
  }

  const now = new Date();
  const existing = await db.subscription.findFirst({
    where: {
      userId: user.id,
      creatorId: creator.id,
      status: "ACTIVE"
    },
    orderBy: { expiresAt: "desc" }
  });

  const startAnchor = existing && existing.expiresAt > now ? existing.expiresAt : now;
  const expiresAt = addDays(startAnchor, 30);

  try {
    const result = await db.$transaction(async (tx) => {
      const subscription = existing
        ? await tx.subscription.update({
            where: { id: existing.id },
            data: {
              startsAt: now,
              expiresAt,
              amount: creator.subscriptionFee,
              onChainTxHash: parsed.data.txHash,
              status: "ACTIVE"
            }
          })
        : await tx.subscription.create({
            data: {
              userId: user.id,
              creatorId: creator.id,
              startsAt: now,
              expiresAt,
              status: "ACTIVE",
              amount: creator.subscriptionFee,
              onChainTxHash: parsed.data.txHash
            }
          });

      await tx.transaction.create({
        data: {
          userId: user.id,
          creatorId: creator.id,
          type: "SUBSCRIPTION",
          amount: creator.subscriptionFee,
          status: "CONFIRMED",
          onChainTxHash: parsed.data.txHash
        }
      });

      const updatedCreator = await tx.creator.update({
        where: { id: creator.id },
        data: {
          lifetimeEarnings: { increment: creator.subscriptionFee },
          availableEarnings: { increment: creator.subscriptionFee }
        },
        select: {
          lifetimeEarnings: true,
          availableEarnings: true
        }
      });

      return { subscription, updatedCreator };
    });

    return NextResponse.json({
      subscription: {
        id: result.subscription.id,
        startsAt: result.subscription.startsAt,
        expiresAt: result.subscription.expiresAt,
        amount: result.subscription.amount.toString(),
        status: result.subscription.status
      },
      creatorEarnings: {
        lifetime: result.updatedCreator.lifetimeEarnings.toString(),
        available: result.updatedCreator.availableEarnings.toString()
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Transaction hash already used." }, { status: 409 });
    }

    throw error;
  }
}
