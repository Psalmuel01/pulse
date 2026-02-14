import { CreatorCard } from "@/components/creator-card";
import { db, isDatabaseConfigured } from "@/lib/db";
import { demoCreators } from "@/lib/demo-data";

export default async function ExplorePage() {
  let creators: Array<{
    id: string;
    username: string;
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
        username: creator.username,
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
      username: creator.username,
      category: creator.category,
      subscriptionFee: creator.subscriptionFee,
      subscriberCount: creator.subscriberCount
    }));
  }

  return (
    <section className="space-y-6">
      <header className="max-w-2xl space-y-2">
        <p className="text-xs uppercase tracking-[0.22em] text-muted">Tempo Creator Economy</p>
        <h1 className="font-serif text-4xl leading-tight">Explore creators across music, video, and writing.</h1>
        <p className="text-sm text-ink/75">
          Subscribe monthly for full access, or unlock single premium drops with stablecoin.
        </p>
      </header>

      {creators.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-sm text-ink/75">
          No creators registered yet. Start from the Become a Creator page.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {creators.map((creator) => (
            <CreatorCard
              key={creator.id}
              id={creator.id}
              username={creator.username}
              category={creator.category}
              subscriptionFee={creator.subscriptionFee}
              subscriberCount={creator.subscriberCount}
            />
          ))}
        </div>
      )}
    </section>
  );
}
