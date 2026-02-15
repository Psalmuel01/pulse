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

function getFileAcceptForType(type: ContentType) {
  if (type === "VIDEO") {
    return "video/*";
  }
  if (type === "MUSIC") {
    return "audio/*";
  }
  return "";
}

function isFileTypeValidForContent(type: ContentType, file: File) {
  const mime = file.type.toLowerCase();
  if (type === "VIDEO") {
    return mime.startsWith("video/");
  }
  if (type === "MUSIC") {
    return mime.startsWith("audio/");
  }
  return false;
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
  const [contentType, setContentType] = useState<ContentType>("ARTICLE");
  const [price, setPrice] = useState("0");
  const [onlyForSubscribers, setOnlyForSubscribers] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [articleBody, setArticleBody] = useState("");
  const [publishing, setPublishing] = useState(false);
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

  async function handleCreateContent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (publishing) {
      return;
    }

    setStatus(null);

    if (contentType === "ARTICLE" && !articleBody.trim()) {
      setStatus("Enter article text before publishing.");
      return;
    }

    if (contentType !== "ARTICLE" && !selectedFile) {
      setStatus(`Choose a ${contentType.toLowerCase()} file before publishing.`);
      return;
    }

    try {
      setPublishing(true);
      let resolvedStoragePath: string | undefined;

      if (contentType !== "ARTICLE" && selectedFile) {
        if (!isFileTypeValidForContent(contentType, selectedFile)) {
          setStatus(`Selected file does not match content type ${contentType.toLowerCase()}.`);
          return;
        }

        setStatus("Preparing upload...");
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

        setStatus("Uploading media...");
        const uploadResult = await fetch(urlPayload.signedUrl, {
          method: "PUT",
          headers: {
            "Content-Type": selectedFile.type
          },
          body: selectedFile
        });

        if (!uploadResult.ok) {
          setStatus("Media upload failed.");
          return;
        }

        resolvedStoragePath = urlPayload.storagePath;
      }

      setStatus("Publishing content...");
      const response = await authedFetch("/api/contents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title,
          description,
          type: contentType,
          price: Number(price),
          onlyForSubscribers,
          storagePath: resolvedStoragePath,
          articleBody: contentType === "ARTICLE" ? articleBody : undefined
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
      setSelectedFile(null);
      setArticleBody("");
      setFileInputKey((current) => current + 1);
      setContentType("ARTICLE");
      await loadDashboard();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not publish content.");
    } finally {
      setPublishing(false);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    if (file && !isFileTypeValidForContent(contentType, file)) {
      setStatus(`Selected file does not match content type ${contentType.toLowerCase()}.`);
      setSelectedFile(null);
      event.target.value = "";
      return;
    }
    setStatus(file ? `${file.name} selected.` : null);
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

	          <form onSubmit={handleCreateContent} className="space-y-3 rounded-2xl border border-border bg-card p-5">
	            <h3 className="font-semibold">Upload New Content</h3>

	            <label className="block text-sm">
	              <span className="mb-1 block text-ink/80">Content type</span>
	              <select
	                value={contentType}
	                onChange={(event) => {
	                  const nextType = event.target.value as ContentType;
	                  setContentType(nextType);
	                  setSelectedFile(null);
	                  setFileInputKey((current) => current + 1);
	                  if (nextType !== "ARTICLE") {
	                    setArticleBody("");
	                  }
	                }}
	                className="w-full rounded-xl border border-border bg-canvas px-4 py-2"
	              >
	                <option value="ARTICLE">Article</option>
	                <option value="MUSIC">Music</option>
	                <option value="VIDEO">Video</option>
	              </select>
	            </label>

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

	            {contentType === "ARTICLE" ? (
	              <label className="block text-sm">
	                <span className="mb-1 block text-ink/80">Article Text</span>
	                <textarea
	                  required
	                  value={articleBody}
	                  onChange={(event) => setArticleBody(event.target.value)}
	                  rows={10}
	                  className="w-full rounded-xl border border-border bg-canvas px-4 py-2"
	                  placeholder="Write or paste your article text here."
	                />
	              </label>
	            ) : (
	              <label className="block text-sm">
	                <span className="mb-1 block text-ink/80">
	                  {contentType === "VIDEO" ? "Video file" : "Music file"}
	                </span>
	                <input
	                  key={fileInputKey}
	                  required
	                  type="file"
	                  accept={getFileAcceptForType(contentType)}
	                  onChange={handleFileChange}
	                  className="w-full rounded-xl border border-border bg-canvas px-3 py-2"
	                />
	                <span className="mt-1 block text-xs text-muted">
	                  File uploads happen automatically when you click Publish Content.
	                </span>
	              </label>
	            )}

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
                disabled={publishing}
	              className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
	            >
	              {publishing ? "Publishing..." : "Publish Content"}
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
