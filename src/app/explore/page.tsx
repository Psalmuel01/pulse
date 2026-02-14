import { CreatorCard } from "@/components/creator-card";
import { db } from "@/lib/db";

export default async function ExplorePage() {
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
      }
    }
  });

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
              subscriptionFee={creator.subscriptionFee.toString()}
              subscriberCount={creator.subscriptions.length}
            />
          ))}
        </div>
      )}
    </section>
  );
}
