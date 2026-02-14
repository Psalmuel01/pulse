import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_: Request, { params }: { params: { username: string } }) {
  const creator = await db.creator.findUnique({
    where: { username: params.username },
    include: {
      contents: {
        orderBy: { createdAt: "desc" }
      },
      subscriptions: {
        where: {
          status: "ACTIVE",
          expiresAt: { gt: new Date() }
        },
        select: { id: true }
      }
    }
  });

  if (!creator) {
    return NextResponse.json({ error: "Creator not found." }, { status: 404 });
  }

  return NextResponse.json({
    creator: {
      id: creator.id,
      username: creator.username,
      category: creator.category,
      walletAddress: creator.walletAddress,
      subscriptionFee: creator.subscriptionFee.toString(),
      subscriberCount: creator.subscriptions.length,
      lifetimeEarnings: creator.lifetimeEarnings.toString(),
      availableEarnings: creator.availableEarnings.toString(),
      contents: creator.contents.map((content) => ({
        id: content.id,
        title: content.title,
        type: content.type,
        description: content.description,
        price: content.price.toString(),
        onlyForSubscribers: content.onlyForSubscribers,
        thumbnailPath: content.thumbnailPath,
        createdAt: content.createdAt
      }))
    }
  });
}
