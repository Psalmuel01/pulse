"use client";

import { useEffect, useState } from "react";
import { CreatorDashboardClient } from "@/components/creator-dashboard-client";
import { CreatorOnboardingCard } from "@/components/creator-onboarding-card";
import { useAuthedFetch } from "@/hooks/use-authed-fetch";

type MePayload = {
  user: {
    id: string;
    walletAddress?: string | null;
  };
  creator: {
    id: string;
  } | null;
};

export function DashboardPageClient() {
  const authedFetch = useAuthedFetch();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [hasCreatorProfile, setHasCreatorProfile] = useState(false);

  useEffect(() => {
    let active = true;

    authedFetch("/api/me")
      .then(async (response) => {
        const payload = (await response.json()) as MePayload & { error?: string };
        if (!response.ok) {
          throw new Error(payload.error ?? "Could not load account.");
        }

        if (!active) {
          return;
        }

        setWalletAddress(payload.user.walletAddress ?? null);
        setHasCreatorProfile(Boolean(payload.creator));
      })
      .catch((err: unknown) => {
        if (!active) {
          return;
        }

        setError(err instanceof Error ? err.message : "Could not load account.");
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [authedFetch]);

  if (loading) {
    return <p className="text-sm text-muted">Loading dashboard...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  }

  if (!hasCreatorProfile) {
    return <CreatorOnboardingCard walletAddress={walletAddress} onCreated={() => setHasCreatorProfile(true)} />;
  }

  return <CreatorDashboardClient />;
}
