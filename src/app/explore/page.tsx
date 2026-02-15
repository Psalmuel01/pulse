import { ExplorePageClient } from "@/components/explore-page-client";
import { db, isDatabaseConfigured } from "@/lib/db";
import { demoCreators } from "@/lib/demo-data";

export default async function ExplorePage() {
  let creators: Array<{
    id: string;
    name: string;
    username: string;
    description: string;
    category: string;
    subscriptionFee: string;
    subscriberCount: number;
  }> = [];

  if (isDatabaseConfigured) {
    try {
      const now = new Date();
      const dbCreators = await db.creator.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          subscriptions: {
            where: {
              status: "ACTIVE",
              expiresAt: { gt: now }
            },
            select: { id: true }
          }
        }
      });

      creators = dbCreators.map((creator) => ({
        id: creator.id,
        name: creator.name,
        username: creator.username,
        description: creator.description,
        category: creator.category,
        subscriptionFee: creator.subscriptionFee.toString(),
        subscriberCount: creator.subscriptions.length
      }));
    } catch {
      creators = [];
    }
  } else {
    creators = demoCreators.map((creator) => ({
      id: creator.id,
      name: creator.name,
      username: creator.username,
      description: creator.description,
      category: creator.category,
      subscriptionFee: creator.subscriptionFee,
      subscriberCount: creator.subscriberCount
    }));
  }

  return <ExplorePageClient creators={creators} />;
}
