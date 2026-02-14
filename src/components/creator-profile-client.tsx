"use client";

import { useMemo, useState } from "react";
import { ContentCard } from "@/components/content-card";
import { toUsd } from "@/lib/utils";

type ContentItem = {
  id: string;
  title: string;
  type: string;
  price: string;
  onlyForSubscribers: boolean;
};

type CreatorProfileClientProps = {
  creator: {
    id: string;
    username: string;
    category: string;
    subscriptionFee: string;
    subscriberCount: number;
  };
  contents: ContentItem[];
  initialSubscribed: boolean;
  initialUnlockedIds: string[];
};

export function CreatorProfileClient({
  creator,
  contents,
  initialSubscribed,
  initialUnlockedIds
}: CreatorProfileClientProps) {
  const [isSubscribed, setIsSubscribed] = useState(initialSubscribed);
  const [unlockedIds, setUnlockedIds] = useState(new Set(initialUnlockedIds));
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const renderedUnlocked = useMemo(() => {
    if (isSubscribed) {
      return new Set(contents.map((content) => content.id));
    }
    return unlockedIds;
  }, [contents, isSubscribed, unlockedIds]);

  async function handleSubscribe() {
    setBusyKey("subscribe");
    setStatusMessage(null);

    const txHash = `demo_sub_${Date.now()}`;

    const response = await fetch("/api/subscriptions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ creatorId: creator.id, txHash })
    });

    const payload = await response.json();

    if (!response.ok) {
      setStatusMessage(payload.error ?? "Subscription failed.");
      setBusyKey(null);
      return;
    }

    setIsSubscribed(true);
    setStatusMessage(`Subscribed through ${payload.subscription.expiresAt}.`);
    setBusyKey(null);
  }

  async function handleUnlock(contentId: string) {
    setBusyKey(contentId);
    setStatusMessage(null);

    const txHash = `demo_unlock_${Date.now()}`;

    const response = await fetch("/api/unlocks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ contentId, txHash })
    });

    const payload = await response.json();

    if (!response.ok) {
      setStatusMessage(payload.error ?? "Unlock failed.");
      setBusyKey(null);
      return;
    }

    setUnlockedIds((current) => new Set([...current, contentId]));
    setStatusMessage("Content unlocked. Click View Content to open it.");
    setBusyKey(null);
  }

  async function handleView(contentId: string) {
    setBusyKey(`view-${contentId}`);
    setStatusMessage(null);

    const response = await fetch(`/api/contents/${contentId}/access`, {
      method: "POST"
    });

    const payload = await response.json();

    if (!response.ok) {
      setStatusMessage(payload.error ?? "Unable to access content.");
      setBusyKey(null);
      return;
    }

    window.open(payload.signedUrl, "_blank", "noopener,noreferrer");

    if (payload.accessMode === "payPerView") {
      setUnlockedIds((current) => {
        const next = new Set(current);
        next.delete(contentId);
        return next;
      });
    }

    setStatusMessage("Signed URL issued. It expires shortly.");
    setBusyKey(null);
  }

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted">{creator.category}</p>
            <h1 className="font-serif text-4xl">@{creator.username}</h1>
            <p className="mt-1 text-sm text-ink/75">{creator.subscriberCount} active subscribers</p>
          </div>
          <button
            type="button"
            onClick={handleSubscribe}
            disabled={isSubscribed || busyKey === "subscribe"}
            className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubscribed ? "Subscribed" : `Subscribe ${toUsd(creator.subscriptionFee)}/mo`}
          </button>
        </div>
      </header>

      {statusMessage && (
        <p className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-ink/80">{statusMessage}</p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {contents.map((content) => (
          <div key={content.id} className={busyKey === content.id || busyKey === `view-${content.id}` ? "opacity-70" : ""}>
            <ContentCard
              id={content.id}
              title={content.title}
              type={content.type}
              price={content.price}
              onlyForSubscribers={content.onlyForSubscribers}
              unlocked={renderedUnlocked.has(content.id)}
              onUnlock={handleUnlock}
              onView={handleView}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
