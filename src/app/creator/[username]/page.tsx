import { notFound } from "next/navigation";
import { CreatorProfileClient } from "@/components/creator-profile-client";
import { PrivyAuthGate } from "@/components/privy-auth-gate";
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
      <PrivyAuthGate
        title="Creator Profile"
        description="Create an account to subscribe, unlock drops, and access premium content."
      >
        <CreatorProfileClient
          creator={{
            id: creator.id,
            name: creator.name,
            username: creator.username,
            description: creator.description,
            category: creator.category,
            walletAddress: "0xDEMO000000000000000000000000000000000111",
            subscriptionFee: creator.subscriptionFee,
            subscriberCount: creator.subscriberCount,
            totalContent: creator.contents.length,
            memberSince: new Date().toISOString()
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
      </PrivyAuthGate>
    );
  }

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
          id: true
        }
      }
    }
  });

  if (!creator) {
    notFound();
  }

  return (
    <PrivyAuthGate
      title="Creator Profile"
      description="Create an account to subscribe, unlock drops, and access premium content."
    >
      <CreatorProfileClient
        creator={{
          id: creator.id,
          name: creator.name,
          username: creator.username,
          description: creator.description,
          category: creator.category,
          walletAddress: creator.walletAddress,
          subscriptionFee: creator.subscriptionFee.toString(),
          subscriberCount: creator.subscriptions.length,
          totalContent: creator.contents.length,
          memberSince: creator.createdAt.toISOString()
        }}
        contents={creator.contents.map((content) => ({
          id: content.id,
          title: content.title,
          type: content.type,
          price: content.price.toString(),
          onlyForSubscribers: content.onlyForSubscribers
        }))}
        initialSubscribed={false}
        initialUnlockedIds={[]}
      />
    </PrivyAuthGate>
  );
}
