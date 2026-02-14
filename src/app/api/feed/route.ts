import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { db, isDatabaseConfigured } from "@/lib/db";
import { demoCreators } from "@/lib/demo-data";

type Tab = "all" | "subscriptions" | "history";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tab = (searchParams.get("tab") ?? "all") as Tab;

  if (!isDatabaseConfigured) {
    if (tab === "subscriptions") {
      return NextResponse.json({
        tab,
        data: demoCreators.map((creator) => ({
          id: `demo-sub-${creator.id}`,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          creator: {
            id: creator.id,
            username: creator.username,
            category: creator.category,
            subscriptionFee: creator.subscriptionFee,
            contents: creator.contents
          }
        }))
      });
    }

    if (tab === "history") {
      return NextResponse.json({
        tab,
        data: []
      });
    }

    return NextResponse.json({
      tab: "all",
      data: demoCreators.flatMap((creator) =>
        creator.contents.map((content) => ({
          contentId: content.id,
          title: content.title,
          type: content.type,
          price: content.price,
          creator: {
            id: creator.id,
            username: creator.username,
            category: creator.category
          },
          lastActivityAt: new Date(),
          source: "unlock"
        }))
      )
    });
  }

  const user = await getCurrentUserFromRequest(request);
  const now = new Date();

  if (tab === "subscriptions") {
    const subscriptions = await db.subscription.findMany({
      where: {
        userId: user.id,
        status: "ACTIVE",
        expiresAt: { gt: now }
      },
      include: {
        creator: {
          include: {
            contents: {
              orderBy: { createdAt: "desc" },
              take: 6
            }
          }
        }
      },
      orderBy: { expiresAt: "desc" }
    });

    return NextResponse.json({
      tab,
      data: subscriptions.map((subscription) => ({
        id: subscription.id,
        expiresAt: subscription.expiresAt,
        creator: {
          id: subscription.creator.id,
          username: subscription.creator.username,
          category: subscription.creator.category,
          subscriptionFee: subscription.creator.subscriptionFee.toString(),
          contents: subscription.creator.contents.map((content) => ({
            id: content.id,
            title: content.title,
            type: content.type,
            price: content.price.toString(),
            onlyForSubscribers: content.onlyForSubscribers
          }))
        }
      }))
    });
  }

  if (tab === "history") {
    const transactions = await db.transaction.findMany({
      where: { userId: user.id },
      include: {
        creator: {
          select: {
            id: true,
            username: true
          }
        },
        content: {
          select: {
            id: true,
            title: true,
            type: true
          }
        }
      },
      orderBy: { timestamp: "desc" },
      take: 100
    });

    return NextResponse.json({
      tab,
      data: transactions.map((tx) => ({
        id: tx.id,
        type: tx.type,
        status: tx.status,
        amount: tx.amount.toString(),
        timestamp: tx.timestamp,
        onChainTxHash: tx.onChainTxHash,
        creator: tx.creator,
        content: tx.content
      }))
    });
  }

  const [views, unlocks] = await Promise.all([
    db.contentView.findMany({
      where: { userId: user.id },
      include: {
        content: {
          include: {
            creator: {
              select: {
                id: true,
                username: true,
                category: true
              }
            }
          }
        }
      },
      orderBy: { viewedAt: "desc" },
      take: 100
    }),
    db.unlock.findMany({
      where: { userId: user.id },
      include: {
        content: {
          include: {
            creator: {
              select: {
                id: true,
                username: true,
                category: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 100
    })
  ]);

  const merged = new Map<
    string,
    {
      contentId: string;
      title: string;
      type: string;
      price: string;
      creator: { id: string; username: string; category: string };
      lastActivityAt: Date;
      source: "view" | "unlock";
    }
  >();

  for (const view of views) {
    const current = merged.get(view.contentId);
    if (!current || current.lastActivityAt < view.viewedAt) {
      merged.set(view.contentId, {
        contentId: view.contentId,
        title: view.content.title,
        type: view.content.type,
        price: view.content.price.toString(),
        creator: view.content.creator,
        lastActivityAt: view.viewedAt,
        source: "view"
      });
    }
  }

  for (const unlock of unlocks) {
    const current = merged.get(unlock.contentId);
    if (!current || current.lastActivityAt < unlock.createdAt) {
      merged.set(unlock.contentId, {
        contentId: unlock.contentId,
        title: unlock.content.title,
        type: unlock.content.type,
        price: unlock.content.price.toString(),
        creator: unlock.content.creator,
        lastActivityAt: unlock.createdAt,
        source: "unlock"
      });
    }
  }

  const data = [...merged.values()].sort(
    (a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime()
  );

  return NextResponse.json({
    tab: "all",
    data
  });
}
