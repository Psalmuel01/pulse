import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { registerCreatorContractCall } from "@/lib/contract";
import { db } from "@/lib/db";
import { createCreatorSchema } from "@/lib/validators";

export async function GET() {
  const now = new Date();

  const creators = await db.creator.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      subscriptions: {
        where: {
          status: "ACTIVE",
          expiresAt: { gt: now }
        },
        select: { id: true }
      },
      _count: {
        select: { contents: true }
      }
    }
  });

  return NextResponse.json({
    creators: creators.map((creator) => ({
      id: creator.id,
      username: creator.username,
      category: creator.category,
      walletAddress: creator.walletAddress,
      subscriptionFee: creator.subscriptionFee.toString(),
      contentCount: creator._count.contents,
      subscriberCount: creator.subscriptions.length,
      lifetimeEarnings: creator.lifetimeEarnings.toString(),
      availableEarnings: creator.availableEarnings.toString()
    }))
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUserFromRequest(request);
  const payload = await request.json().catch(() => null);
  const parsed = createCreatorSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await db.creator.findUnique({ where: { userId: user.id } });
  if (existing) {
    return NextResponse.json({ error: "User is already a creator." }, { status: 409 });
  }

  const contractOk = await registerCreatorContractCall({
    txHash: parsed.data.txHash,
    creatorWallet: user.walletAddress ?? "",
    initialFeeUsd: parsed.data.subscriptionFee.toString()
  });

  if (!contractOk) {
    return NextResponse.json({ error: "registerCreator contract call could not be verified." }, { status: 400 });
  }

  try {
    const creator = await db.creator.create({
      data: {
        userId: user.id,
        username: parsed.data.username,
        category: parsed.data.category,
        walletAddress: user.walletAddress ?? "",
        subscriptionFee: new Prisma.Decimal(parsed.data.subscriptionFee),
        lifetimeEarnings: new Prisma.Decimal(0),
        availableEarnings: new Prisma.Decimal(0)
      }
    });

    return NextResponse.json(
      {
        creator: {
          id: creator.id,
          username: creator.username,
          category: creator.category,
          subscriptionFee: creator.subscriptionFee.toString(),
          lifetimeEarnings: creator.lifetimeEarnings.toString(),
          availableEarnings: creator.availableEarnings.toString()
        }
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Username is already taken." }, { status: 409 });
    }

    throw error;
  }
}
