"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthedFetch } from "@/hooks/use-authed-fetch";
import { useTempoPayments } from "@/hooks/use-tempo-payments";
import { creatorCategories } from "@/lib/creator-categories";

type CreatorOnboardingCardProps = {
  walletAddress?: string | null;
  onCreated?: () => void;
};

function formatAddress(address?: string | null) {
  if (!address) {
    return null;
  }

  if (address.length <= 12) {
    return address;
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function CreatorOnboardingCard({ walletAddress, onCreated }: CreatorOnboardingCardProps) {
  const router = useRouter();
  const authedFetch = useAuthedFetch();
  const { registerCreator, isSubmitting } = useTempoPayments();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<(typeof creatorCategories)[number]["value"]>("music");
  const [subscriptionFee, setSubscriptionFee] = useState("9.99");
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatus(null);

    try {
      const txHash = await registerCreator(subscriptionFee);
      const response = await authedFetch("/api/creators", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name,
          username,
          description,
          category,
          subscriptionFee: Number(subscriptionFee),
          txHash
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        setStatus(payload.error ?? "Could not create creator profile.");
        setSaving(false);
        return;
      }

      setStatus("Creator profile created. Loading dashboard...");
      setSaving(false);

      if (onCreated) {
        onCreated();
      } else {
        router.refresh();
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not create creator profile.");
      setSaving(false);
    }
  }

  return (
    <section className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-6">
      <p className="text-xs uppercase tracking-[0.22em] text-muted">Creator Dashboard</p>
      <h1 className="mt-2 font-serif text-3xl">Become a creator</h1>
      <p className="mt-2 text-sm text-ink/75">
        Set up your profile once. This account can only have one creator profile.
      </p>
      <p className="mt-1 text-xs text-muted">
        Connected wallet: <span className="font-medium text-ink/80">{formatAddress(walletAddress) ?? "Not available"}</span>
      </p>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <label className="block text-sm">
          <span className="mb-1 block text-ink/80">Name</span>
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-xl border border-border bg-canvas px-4 py-2"
            placeholder="Psalm Uel"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-ink/80">Username</span>
          <input
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="w-full rounded-xl border border-border bg-canvas px-4 py-2"
            placeholder="dj_pulse"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-ink/80">Short description</span>
          <textarea
            required
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="min-h-24 w-full rounded-xl border border-border bg-canvas px-4 py-2"
            maxLength={220}
            placeholder="I share premium drops and behind-the-scenes process content."
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-ink/80">Category</span>
          <select
            required
            value={category}
            onChange={(event) => setCategory(event.target.value as (typeof creatorCategories)[number]["value"])}
            className="w-full rounded-xl border border-border bg-canvas px-4 py-2"
          >
            {creatorCategories.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-ink/80">Subscription fee (USD)</span>
          <input
            required
            type="number"
            step="0.01"
            min="0.01"
            value={subscriptionFee}
            onChange={(event) => setSubscriptionFee(event.target.value)}
            className="w-full rounded-xl border border-border bg-canvas px-4 py-2"
          />
        </label>

        <button
          type="submit"
          disabled={saving || isSubmitting}
          className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Creating..." : "Create Creator Profile"}
        </button>
      </form>

      {status && <p className="mt-4 text-sm text-ink/80">{status}</p>}
    </section>
  );
}
