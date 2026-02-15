import { format, subDays } from "date-fns";
import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { db, isDatabaseConfigured } from "@/lib/db";

export async function GET(request: Request) {
  if (!isDatabaseConfigured) {
    return NextResponse.json(
      { error: "Database is not configured. Set DATABASE_URL to use creator analytics." },
      { status: 503 }
    );
  }

  const user = await getCurrentUserFromRequest(request);
  const creator = await db.creator.findUnique({ where: { userId: user.id } });

  if (!creator) {
    return NextResponse.json({ error: "Creator profile not found." }, { status: 403 });
  }

  const now = new Date();
  const since = subDays(now, 30);

  const [activeSubscribersCount, subscriptions, transactions, contents] = await Promise.all([
    db.subscription.count({
      where: {
        creatorId: creator.id,
        status: "ACTIVE",
        expiresAt: { gt: now }
      }
    }),
    db.subscription.findMany({
      where: {
        creatorId: creator.id,
        startsAt: { gte: since }
      },
      orderBy: { startsAt: "asc" },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            walletAddress: true
          }
        }
      }
    }),
    db.transaction.findMany({
      where: {
        creatorId: creator.id,
        status: "CONFIRMED",
        timestamp: { gte: since }
      },
      orderBy: { timestamp: "asc" }
    }),
    db.content.findMany({
      where: { creatorId: creator.id },
      orderBy: { createdAt: "desc" }
    })
  ]);

  const chartIndex = new Map<
    string,
    {
      date: string;
      revenue: number;
      subscriptionAdds: number;
    }
  >();

  for (let i = 30; i >= 0; i -= 1) {
    const day = subDays(now, i);
    const dateLabel = format(day, "MMM d");
    chartIndex.set(dateLabel, {
      date: dateLabel,
      revenue: 0,
      subscriptionAdds: 0
    });
  }

  for (const tx of transactions) {
    const key = format(tx.timestamp, "MMM d");
    const item = chartIndex.get(key);
    if (!item) {
      continue;
    }
    item.revenue += Number(tx.amount);
  }

  for (const sub of subscriptions) {
    const key = format(sub.startsAt, "MMM d");
    const item = chartIndex.get(key);
    if (!item) {
      continue;
    }
    item.subscriptionAdds += 1;
  }

  let rollingSubscribers = 0;
  const chartData = [...chartIndex.values()].map((item) => {
    rollingSubscribers += item.subscriptionAdds;
    return {
      date: item.date,
      revenue: Number(item.revenue.toFixed(2)),
      subscribers: rollingSubscribers
    };
  });

  const topContentMap = new Map<string, { revenue: number; unlocks: number }>();
  for (const tx of transactions) {
    if (tx.type !== "PAY_PER_VIEW" || !tx.contentId) {
      continue;
    }

    const current = topContentMap.get(tx.contentId) ?? { revenue: 0, unlocks: 0 };
    current.revenue += Number(tx.amount);
    current.unlocks += 1;
    topContentMap.set(tx.contentId, current);
  }

  const contentById = new Map(contents.map((content) => [content.id, content]));
  const topContent = [...topContentMap.entries()]
    .map(([contentId, data]) => {
      const content = contentById.get(contentId);
      if (!content) {
        return null;
      }

      return {
        id: content.id,
        title: content.title,
        type: content.type,
        revenue: Number(data.revenue.toFixed(2)),
        unlocks: data.unlocks
      };
    })
    .filter((value): value is NonNullable<typeof value> => Boolean(value))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  const subscriberRows = subscriptions
    .filter((item) => item.expiresAt > now)
    .map((item) => ({
      userId: item.userId,
      email: item.user.email,
      phone: item.user.phone,
      walletAddress: item.user.walletAddress,
      startsAt: item.startsAt,
      expiresAt: item.expiresAt,
      amount: item.amount.toString()
    }));

  return NextResponse.json({
    creator: {
      id: creator.id,
      name: creator.name,
      username: creator.username,
      description: creator.description,
      category: creator.category,
      walletAddress: creator.walletAddress,
      subscriptionFee: creator.subscriptionFee.toString(),
      lifetimeEarnings: creator.lifetimeEarnings.toString(),
      availableEarnings: creator.availableEarnings.toString()
    },
    analytics: {
      activeSubscribersCount,
      chartData,
      topContent
    },
    contents: contents.map((content) => ({
      id: content.id,
      title: content.title,
      type: content.type,
      price: content.price.toString(),
      onlyForSubscribers: content.onlyForSubscribers,
      createdAt: content.createdAt,
      storagePath: content.storagePath
    })),
    subscribers: subscriberRows
  });
}
