import { notFound } from "next/navigation";
import { CreatorProfileClient } from "@/components/creator-profile-client";
import { getCurrentUserFromServerContext } from "@/lib/auth";
import { db, isDatabaseConfigured } from "@/lib/db";
import { getDemoCreatorByUsername } from "@/lib/demo-data";

export default async function CreatorProfilePage({ params }: { params: { username: string } }) {
  const username = decodeURIComponent(params.username);

  if (!isDatabaseConfigured) {
    const creator = getDemoCreatorByUsername(username);
    if (!creator) {
      notFound();
    }

    return (
      <CreatorProfileClient
        creator={{
          id: creator.id,
          username: creator.username,
          category: creator.category,
          subscriptionFee: creator.subscriptionFee,
          subscriberCount: creator.subscriberCount
        }}
        contents={creator.contents.map((content) => ({
          id: content.id,
          title: content.title,
          type: content.type,
          price: content.price,
          onlyForSubscribers: content.onlyForSubscribers
        }))}
        initialSubscribed={false}
        initialUnlockedIds={[]}
      />
    );
  }

  const user = await getCurrentUserFromServerContext();

  const creator = await db.creator.findUnique({
    where: { username },
    include: {
      contents: {
        orderBy: { createdAt: "desc" }
      },
      subscriptions: {
        where: {
          status: "ACTIVE",
          expiresAt: { gt: new Date() }
        },
        select: {
          id: true,
          userId: true,
          expiresAt: true
        }
      }
    }
  });

  if (!creator) {
    notFound();
  }

  const userUnlocks = await db.unlock.findMany({
    where: {
      userId: user.id,
      content: {
        creatorId: creator.id
      },
      viewsRemaining: { gt: 0 }
    },
    select: {
      contentId: true
    }
  });

  const isSubscribed = creator.subscriptions.some((subscription) => subscription.userId === user.id);

  return (
    <CreatorProfileClient
      creator={{
        id: creator.id,
        username: creator.username,
        category: creator.category,
        subscriptionFee: creator.subscriptionFee.toString(),
        subscriberCount: creator.subscriptions.length
      }}
      contents={creator.contents.map((content) => ({
        id: content.id,
        title: content.title,
        type: content.type,
        price: content.price.toString(),
        onlyForSubscribers: content.onlyForSubscribers
      }))}
      initialSubscribed={isSubscribed}
      initialUnlockedIds={userUnlocks.map((unlock) => unlock.contentId)}
    />
  );
}
