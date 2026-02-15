import { NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/lib/db";
import { getDemoCreatorByUsername } from "@/lib/demo-data";

export async function GET(_: Request, { params }: { params: { username: string } }) {
  if (!isDatabaseConfigured) {
    const creator = getDemoCreatorByUsername(params.username);
    if (!creator) {
      return NextResponse.json({ error: "Creator not found." }, { status: 404 });
    }

    return NextResponse.json({
      creator: {
        id: creator.id,
        name: creator.name,
        username: creator.username,
        description: creator.description,
        category: creator.category,
        walletAddress: "0xDEMO000000000000000000000000000000000111",
        subscriptionFee: creator.subscriptionFee,
        subscriberCount: creator.subscriberCount,
        lifetimeEarnings: "0",
        availableEarnings: "0",
        contents: creator.contents.map((content) => ({
          ...content,
          description: null,
          thumbnailPath: null,
          createdAt: new Date()
        }))
      }
    });
  }

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
      name: creator.name,
      username: creator.username,
      description: creator.description,
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
