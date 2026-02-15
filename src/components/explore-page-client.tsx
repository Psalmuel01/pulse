"use client";

import { useMemo, useState } from "react";
import { CreatorCard } from "@/components/creator-card";

type ExploreCreator = {
  id: string;
  name: string;
  username: string;
  description: string;
  category: string;
  subscriptionFee: string;
  subscriberCount: number;
};

type ExplorePageClientProps = {
  creators: ExploreCreator[];
};

export function ExplorePageClient({ creators }: ExplorePageClientProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const categories = useMemo(() => {
    return Array.from(new Set(creators.map((creator) => creator.category))).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [creators]);

  const filteredCreators = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return creators.filter((creator) => {
      const matchesCategory = category === "all" || creator.category === category;
      if (!matchesCategory) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = `${creator.name} ${creator.username} ${creator.description} ${creator.category}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [category, creators, search]);

  return (
    <section className="space-y-6">
      <header className="max-w-3xl space-y-2">
        <p className="text-xs uppercase tracking-[0.22em] text-muted">Tempo Creator Economy</p>
        <h1 className="font-serif text-4xl leading-tight">Explore creators across music, education, gaming, and more.</h1>
        <p className="text-sm text-ink/75">
          Subscribe monthly for full access, or unlock single premium drops with pathUSD.
        </p>
      </header>

      <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 md:grid-cols-[1fr_220px]">
        <label className="text-sm">
          <span className="mb-1 block text-ink/80">Search creators</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-xl border border-border bg-canvas px-4 py-2"
            placeholder="Search name, username, description, category..."
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-ink/80">Filter by category</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="w-full rounded-xl border border-border bg-canvas px-4 py-2"
          >
            <option value="all">All categories</option>
            {categories.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filteredCreators.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-sm text-ink/75">
          No creators match your search yet.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCreators.map((creator) => (
            <CreatorCard
              key={creator.id}
              id={creator.id}
              name={creator.name}
              username={creator.username}
              description={creator.description}
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

