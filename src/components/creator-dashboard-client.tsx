"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { DashboardCharts } from "@/components/dashboard-charts";
import { useAuthedFetch } from "@/hooks/use-authed-fetch";
import { useTempoBalances } from "@/hooks/use-tempo-balances";
import { useTempoPayments } from "@/hooks/use-tempo-payments";
import { toUsd } from "@/lib/utils";

type DashboardPayload = {
  creator: {
    id: string;
    name: string;
    username: string;
    description: string;
    category: string;
    walletAddress: string;
    subscriptionFee: string;
    lifetimeEarnings: string;
    availableEarnings: string;
  };
  analytics: {
    activeSubscribersCount: number;
    chartData: Array<{ date: string; revenue: number; subscribers: number }>;
    topContent: Array<{ id: string; title: string; type: string; revenue: number; unlocks: number }>;
  };
  contents: Array<{
    id: string;
    title: string;
    type: string;
    price: string;
    onlyForSubscribers: boolean;
    createdAt: string;
    storagePath: string;
  }>;
  subscribers: Array<{
    userId: string;
    email: string | null;
    phone: string | null;
    walletAddress: string | null;
    startsAt: string;
    expiresAt: string;
    amount: string;
  }>;
};

type Tab = "analytics" | "contents" | "subscribers";

type ContentType = "ARTICLE" | "VIDEO" | "MUSIC";

function detectContentTypeFromMime(mimeType: string): ContentType | null {
  const normalized = mimeType.toLowerCase();
  if (normalized === "application/pdf") {
    return null;
  }
  if (normalized.startsWith("video/")) {
    return "VIDEO";
  }
  if (normalized.startsWith("audio/")) {
    return "MUSIC";
  }
  if (normalized.startsWith("text/")) {
    return "ARTICLE";
  }
  return null;
}

export function CreatorDashboardClient() {
  const authedFetch = useAuthedFetch();
  const {
    updateSubscriptionFee,
    withdrawCreatorEarning,
    isSubmitting: chainTxSubmitting,
    error: chainTxError
  } = useTempoPayments();

  const [tab, setTab] = useState<Tab>("analytics");
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);

  const [newFee, setNewFee] = useState("0");
  const [withdrawAmount, setWithdrawAmount] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [detectedType, setDetectedType] = useState<ContentType>("ARTICLE");
  const [price, setPrice] = useState("0");
  const [onlyForSubscribers, setOnlyForSubscribers] = useState(false);
  const [storagePath, setStoragePath] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [articleBody, setArticleBody] = useState("");
  const balances = useTempoBalances(data?.creator.walletAddress);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    const response = await authedFetch("/api/dashboard");
    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "Could not load creator dashboard.");
      setData(null);
      setLoading(false);
      return;
    }

    setData(payload as DashboardPayload);
    setNewFee(payload.creator.subscriptionFee);
    setLoading(false);
  }, [authedFetch]);

  useEffect(() => {
    loadDashboard().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "Could not load creator dashboard.");
      setLoading(false);
    });
  }, [loadDashboard]);

  const tabs = useMemo(
    () => [
      { id: "analytics", label: "Analytics" },
      { id: "contents", label: "Contents" },
      { id: "subscribers", label: "Subscribers" }
    ] as Array<{ id: Tab; label: string }>,
    []
  );

  async function handleUpdateFee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data) {
      return;
    }

    setStatus(null);

    try {
      const txHash = await updateSubscriptionFee(newFee);
      const response = await authedFetch(`/api/creators/${data.creator.id}/subscription-fee`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          subscriptionFee: Number(newFee),
          txHash
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        setStatus(payload.error ?? "Could not update fee.");
        return;
      }

      setStatus("Subscription fee updated.");
      await loadDashboard();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not update fee.");
    }
  }

  async function handleWithdraw(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data) {
      return;
    }

    setStatus(null);

    const amount = withdrawAmount ? Number(withdrawAmount) : Number(data.creator.availableEarnings);
    if (!Number.isFinite(amount) || amount <= 0) {
      setStatus("No available earnings to withdraw.");
      return;
    }

    try {
      const txHash = await withdrawCreatorEarning(String(amount));
      const response = await authedFetch(`/api/creators/${data.creator.id}/withdraw`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          amount: withdrawAmount ? Number(withdrawAmount) : undefined,
          txHash
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        setStatus(payload.error ?? "Could not withdraw earnings.");
        return;
      }

      setStatus(`Withdrew ${toUsd(payload.withdrawnAmount)}.`);
      setWithdrawAmount("");
      await loadDashboard();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not withdraw earnings.");
    }
  }

  async function handleAssetUpload() {
    if (!selectedFile) {
      setStatus("Choose a file before uploading.");
      return;
    }

    if (detectedType === "ARTICLE") {
      setStatus("Article content is text-based. No file upload is needed.");
      return;
    }

    setStatus(null);

    const urlResponse = await authedFetch("/api/contents/upload-url", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        fileName: selectedFile.name,
        mimeType: selectedFile.type
      })
    });

    const urlPayload = await urlResponse.json();

    if (!urlResponse.ok) {
      setStatus(urlPayload.error ?? "Could not request upload URL.");
      return;
    }

    const uploadResult = await fetch(urlPayload.signedUrl, {
      method: "PUT",
      headers: {
        "Content-Type": selectedFile.type
      },
      body: selectedFile
    });

    if (!uploadResult.ok) {
      setStatus("Upload failed.");
      return;
    }

    setStoragePath(urlPayload.storagePath);
    setStatus(`File uploaded. Detected content type: ${detectedType.toLowerCase()}.`);
  }

  async function handleCreateContent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setStatus(null);

    if (detectedType !== "ARTICLE" && !storagePath) {
      setStatus("Upload your file first before publishing.");
      return;
    }

    if (detectedType === "ARTICLE" && !articleBody.trim() && !storagePath) {
      setStatus("Enter article text before publishing.");
      return;
    }

    const response = await authedFetch("/api/contents", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title,
        description,
        type: detectedType,
        price: Number(price),
        onlyForSubscribers,
        storagePath: storagePath || undefined,
        articleBody: detectedType === "ARTICLE" ? articleBody : undefined
      })
    });

    const payload = await response.json();

    if (!response.ok) {
      setStatus(payload.error ?? "Could not publish content.");
      return;
    }

    setStatus("Content published.");
    setTitle("");
    setDescription("");
    setPrice("0");
    setOnlyForSubscribers(false);
    setStoragePath("");
    setSelectedFile(null);
    setArticleBody("");
    setDetectedType("ARTICLE");
    await loadDashboard();
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setStoragePath("");

    if (!file) {
      setDetectedType("ARTICLE");
      return;
    }

    const nextType = detectContentTypeFromMime(file.type);
    if (!nextType) {
      setStatus("Unsupported file type. Upload video/audio/text files only. PDFs are disabled.");
      setSelectedFile(null);
      event.target.value = "";
      return;
    }

    setDetectedType(nextType);
    setStatus(`Detected ${nextType.toLowerCase()} file.`);

    if (nextType === "ARTICLE") {
      const text = await file.text().catch(() => "");
      if (!text.trim()) {
        setStatus("Text file is empty. Add article text before publishing.");
      } else {
        setArticleBody(text);
        setStatus("Text file loaded into article content.");
      }
    }
  }

  if (loading) {
    return <p className="text-sm text-muted">Loading dashboard...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  }

  if (!data) {
    return null;
  }

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Creator Dashboard</p>
            <h1 className="mt-1 font-serif text-4xl">{data.creator.name}</h1>
            <p className="text-sm text-muted">@{data.creator.username}</p>
            <p className="mt-2 max-w-2xl text-sm text-ink/80">{data.creator.description}</p>
          </div>
          <button
            type="button"
            onClick={() => setTab("contents")}
            className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Add Content
          </button>
        </div>
        <p className="mt-1 break-all font-mono text-xs text-muted">
          Wallet: <span className="font-medium text-ink/80">{data.creator.walletAddress}</span>
        </p>
        <p className="mt-1 text-xs text-muted">
          Gas ({balances.gas.symbol}): {balances.loading ? "Loading..." : balances.gas.value} | Payment (
          {balances.payment.symbol}): {balances.loading ? "Loading..." : balances.payment.value}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border p-4">
            <p className="text-xs uppercase tracking-wide text-muted">Revenue (lifetime)</p>
            <p className="mt-1 text-2xl font-semibold">{toUsd(data.creator.lifetimeEarnings)}</p>
          </div>
          <div className="rounded-xl border border-border p-4">
            <p className="text-xs uppercase tracking-wide text-muted">Available to Withdraw</p>
            <p className="mt-1 text-2xl font-semibold">{toUsd(data.creator.availableEarnings)}</p>
          </div>
          <div className="rounded-xl border border-border p-4">
            <p className="text-xs uppercase tracking-wide text-muted">Active Subscribers</p>
            <p className="mt-1 text-2xl font-semibold">{data.analytics.activeSubscribersCount}</p>
          </div>
        </div>
      </header>

      <div className="inline-flex rounded-full border border-border bg-card p-1">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              tab === item.id ? "bg-accent text-white" : "text-ink/80 hover:text-ink"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {status && <p className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-ink/80">{status}</p>}
      {!status && chainTxError && (
        <p className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-ink/80">{chainTxError}</p>
      )}

      {tab === "analytics" && (
        <div className="space-y-5">
          <DashboardCharts data={data.analytics.chartData} />

          <div className="grid gap-4 md:grid-cols-2">
            <form onSubmit={handleUpdateFee} className="rounded-2xl border border-border bg-card p-5">
              <h3 className="font-semibold">Update Subscription Fee</h3>
              <label className="mt-3 block text-sm">
                <span className="mb-1 block text-ink/80">Fee (USD)</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={newFee}
                  onChange={(event) => setNewFee(event.target.value)}
                  className="w-full rounded-xl border border-border bg-canvas px-4 py-2"
                />
              </label>
              <button
                type="submit"
                disabled={chainTxSubmitting}
                className="mt-4 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Update Fee
              </button>
            </form>

            <form onSubmit={handleWithdraw} className="rounded-2xl border border-border bg-card p-5">
              <h3 className="font-semibold">Withdraw Creator Earnings</h3>
              <label className="mt-3 block text-sm">
                <span className="mb-1 block text-ink/80">Amount (leave empty to withdraw all)</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={withdrawAmount}
                  onChange={(event) => setWithdrawAmount(event.target.value)}
                  className="w-full rounded-xl border border-border bg-canvas px-4 py-2"
                />
              </label>
              <button
                type="submit"
                disabled={chainTxSubmitting}
                className="mt-4 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Withdraw
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold">Top Content by Revenue</h3>
            <div className="mt-3 grid gap-3">
              {data.analytics.topContent.length === 0 && (
                <p className="text-sm text-ink/75">No pay-per-view revenue yet.</p>
              )}
              {data.analytics.topContent.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs uppercase tracking-wide text-muted">{item.type.toLowerCase()}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p>{toUsd(item.revenue)}</p>
                    <p className="text-xs text-muted">{item.unlocks} unlocks</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "contents" && (
        <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold">Published Content</h3>
            <div className="mt-3 grid gap-3">
              {data.contents.length === 0 && (
                <p className="text-sm text-ink/75">No content published yet.</p>
              )}
              {data.contents.map((content) => (
                <div key={content.id} className="rounded-xl border border-border p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="font-medium">{content.title}</p>
                    <p className="text-sm">{toUsd(content.price)}</p>
                  </div>
                  <p className="text-xs uppercase tracking-wide text-muted">
                    {content.type.toLowerCase()} {content.onlyForSubscribers ? "| subscribers only" : ""}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleCreateContent} className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <h3 className="font-semibold">Upload New Content</h3>

            <label className="block text-sm">
              <span className="mb-1 block text-ink/80">Media file</span>
              <input
                type="file"
                accept="video/*,audio/*,text/*"
                onChange={handleFileChange}
                className="w-full rounded-xl border border-border bg-canvas px-3 py-2"
              />
            </label>

            <button
              type="button"
              onClick={handleAssetUpload}
              disabled={!selectedFile || detectedType === "ARTICLE"}
              className="rounded-xl border border-border px-4 py-2 text-sm font-semibold"
            >
              Upload File to Supabase (Video/Music)
            </button>

            <div className="rounded-xl border border-dashed border-border bg-canvas/70 px-4 py-3 text-xs text-ink/80">
              <p>Detected type: {detectedType.toLowerCase()}</p>
              {storagePath ? <p className="mt-1 break-all">Storage path: {storagePath}</p> : null}
            </div>

            <label className="block text-sm">
              <span className="mb-1 block text-ink/80">Title</span>
              <input
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full rounded-xl border border-border bg-canvas px-4 py-2"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-ink/80">Description</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                className="w-full rounded-xl border border-border bg-canvas px-4 py-2"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-ink/80">Article Text (required for article posts)</span>
              <textarea
                value={articleBody}
                onChange={(event) => setArticleBody(event.target.value)}
                rows={6}
                className="w-full rounded-xl border border-border bg-canvas px-4 py-2"
                placeholder="Write or paste your article text here."
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="mb-1 block text-ink/80">Price (USD)</span>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  className="w-full rounded-xl border border-border bg-canvas px-4 py-2"
                />
              </label>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={onlyForSubscribers}
                onChange={(event) => setOnlyForSubscribers(event.target.checked)}
              />
              Only for subscribers
            </label>

            <button
              type="submit"
              className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Publish Content
            </button>
          </form>
        </div>
      )}

      {tab === "subscribers" && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-semibold">Active Subscribers</h3>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                  <th className="py-2">User</th>
                  <th className="py-2">Wallet</th>
                  <th className="py-2">Plan</th>
                  <th className="py-2">Expiry</th>
                </tr>
              </thead>
              <tbody>
                {data.subscribers.map((subscriber) => (
                  <tr key={`${subscriber.userId}-${subscriber.expiresAt}`} className="border-b border-border/70">
                    <td className="py-2">{subscriber.email ?? subscriber.phone ?? subscriber.userId}</td>
                    <td className="py-2">{subscriber.walletAddress ?? "-"}</td>
                    <td className="py-2">{toUsd(subscriber.amount)}</td>
                    <td className="py-2">{new Date(subscriber.expiresAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.subscribers.length === 0 && (
              <p className="py-4 text-sm text-ink/75">No active subscribers yet.</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
