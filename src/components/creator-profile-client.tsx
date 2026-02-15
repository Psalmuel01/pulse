"use client";

import { useEffect, useMemo, useState } from "react";
import { ContentCard } from "@/components/content-card";
import { useAuthedFetch } from "@/hooks/use-authed-fetch";
import { useTempoPayments } from "@/hooks/use-tempo-payments";
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
    name: string;
    username: string;
    description: string;
    category: string;
    walletAddress: string;
    subscriptionFee: string;
    subscriberCount: number;
    totalContent: number;
    memberSince: string;
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
  const authedFetch = useAuthedFetch();
  const { subscribe, unlockContent, isSubmitting } = useTempoPayments();
  const [isSubscribed, setIsSubscribed] = useState(initialSubscribed);
  const [unlockedIds, setUnlockedIds] = useState(new Set(initialUnlockedIds));
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [pendingUnlockTxByContent, setPendingUnlockTxByContent] = useState<Record<string, string>>({});
  const contentById = useMemo(
    () => new Map(contents.map((content) => [content.id, content])),
    [contents]
  );

  const renderedUnlocked = useMemo(() => {
    if (isSubscribed) {
      return new Set(contents.map((content) => content.id));
    }
    return unlockedIds;
  }, [contents, isSubscribed, unlockedIds]);

  useEffect(() => {
    let active = true;

    authedFetch(`/api/subscriptions/check?creatorId=${encodeURIComponent(creator.id)}`)
      .then(async (response) => {
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as { isActiveSubscriber?: boolean };
        if (active && typeof payload.isActiveSubscriber === "boolean") {
          setIsSubscribed(payload.isActiveSubscriber);
        }
      })
      .catch(() => {
        // Keep optimistic UI fallback.
      });

    return () => {
      active = false;
    };
  }, [authedFetch, creator.id]);

  async function handleSubscribe() {
    setBusyKey("subscribe");
    setStatusMessage(null);

    try {
      const txHash = await subscribe(creator.walletAddress, creator.subscriptionFee);
      const response = await authedFetch("/api/subscriptions", {
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
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Subscription failed.");
    } finally {
      setBusyKey(null);
    }
  }

  async function handleUnlock(contentId: string) {
    setBusyKey(contentId);
    setStatusMessage(null);

    const content = contentById.get(contentId);
    if (!content) {
      setStatusMessage("Content not found.");
      setBusyKey(null);
      return;
    }

    try {
      const pendingTxHash = pendingUnlockTxByContent[contentId];
      const txHash =
        pendingTxHash ??
        (await unlockContent(
          creator.walletAddress,
          content.price,
          `unlock:${content.id}`
        ));

      if (!pendingTxHash) {
        setPendingUnlockTxByContent((current) => ({ ...current, [contentId]: txHash }));
      }

      const response = await authedFetch("/api/unlocks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ contentId, txHash })
      });

      const payload = await response.json();

      if (!response.ok) {
        setStatusMessage(
          payload.error ??
            "Unlock verification failed. If payment already succeeded, click Unlock again to retry verification without a new payment."
        );
        setBusyKey(null);
        return;
      }

      setUnlockedIds((current) => new Set([...current, contentId]));
      setPendingUnlockTxByContent((current) => {
        const next = { ...current };
        delete next[contentId];
        return next;
      });
      setStatusMessage("Content unlocked. Click View Content to open it.");
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Unlock failed. If payment already succeeded, click Unlock again to retry verification without paying twice."
      );
    } finally {
      setBusyKey(null);
    }
  }

  async function handleView(contentId: string) {
    setBusyKey(`view-${contentId}`);
    setStatusMessage(null);

    const response = await authedFetch(`/api/contents/${contentId}/access`, {
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
            <h1 className="font-serif text-4xl">{creator.name}</h1>
            <p className="text-sm text-muted">@{creator.username}</p>
            <p className="mt-2 max-w-2xl text-sm text-ink/80">{creator.description}</p>
            <p className="mt-1 text-sm text-ink/75">{creator.subscriberCount} active subscribers</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted">
              <span className="rounded-full border border-border px-2 py-1">
                {creator.totalContent} premium drops
              </span>
              <span className="rounded-full border border-border px-2 py-1">
                Member since {new Date(creator.memberSince).toLocaleDateString()}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSubscribe}
            disabled={isSubscribed || busyKey === "subscribe" || isSubmitting}
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
