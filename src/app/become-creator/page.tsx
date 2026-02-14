"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function BecomeCreatorPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [category, setCategory] = useState("music");
  const [subscriptionFee, setSubscriptionFee] = useState("9.99");
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatus(null);

    const response = await fetch("/api/creators", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username,
        category,
        subscriptionFee: Number(subscriptionFee),
        txHash: `demo_register_${Date.now()}`
      })
    });

    const payload = await response.json();

    if (!response.ok) {
      setStatus(payload.error ?? "Could not create creator profile.");
      setSaving(false);
      return;
    }

    setStatus("Creator profile created. Redirecting to dashboard...");
    setTimeout(() => router.push("/dashboard"), 800);
  }

  return (
    <section className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-6">
      <p className="text-xs uppercase tracking-[0.22em] text-muted">Creator Onboarding</p>
      <h1 className="mt-2 font-serif text-3xl">Become a creator</h1>
      <p className="mt-2 text-sm text-ink/75">
        Privy wallet linkage is represented through the authenticated user wallet on the server.
      </p>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
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
          <span className="mb-1 block text-ink/80">Category</span>
          <input
            required
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="w-full rounded-xl border border-border bg-canvas px-4 py-2"
            placeholder="music"
          />
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
          disabled={saving}
          className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Creating..." : "Create Creator Profile"}
        </button>
      </form>

      {status && <p className="mt-4 text-sm text-ink/80">{status}</p>}
    </section>
  );
}
