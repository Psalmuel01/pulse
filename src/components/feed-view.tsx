"use client";

import { useEffect, useState } from "react";
import { toUsd } from "@/lib/utils";

type Tab = "all" | "subscriptions" | "history";

export function FeedView() {
  const [tab, setTab] = useState<Tab>("all");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    fetch(`/api/feed?tab=${tab}`)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "Could not load feed.");
        }
        if (active) {
          setRows(payload.data ?? []);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Could not load feed.");
          setRows([]);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [tab]);

  return (
    <section className="space-y-5">
      <div className="inline-flex rounded-full border border-border bg-card p-1">
        {(["all", "subscriptions", "history"] as Tab[]).map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setTab(name)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              tab === name ? "bg-accent text-white" : "text-ink/75 hover:text-ink"
            }`}
          >
            {name === "all" ? "All Viewed/Unlocked" : name[0].toUpperCase() + name.slice(1)}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-muted">Loading feed...</p>}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {!loading && !error && rows.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-sm text-ink/75">
          No feed activity yet.
        </div>
      )}

      <div className="grid gap-4">
        {rows.map((row) => {
          if (tab === "subscriptions") {
            return (
              <article key={row.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-semibold">@{row.creator.username}</h3>
                  <span className="text-xs text-muted">Expires {new Date(row.expiresAt).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-ink/75">{row.creator.contents.length} recent drops</p>
              </article>
            );
          }

          if (tab === "history") {
            return (
              <article key={row.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="mb-2 flex items-center justify-between gap-4">
                  <h3 className="font-semibold">{row.type.replaceAll("_", " ")}</h3>
                  <span className="text-sm">{toUsd(row.amount)}</span>
                </div>
                <p className="text-sm text-ink/75">
                  {row.creator?.username ? `Creator: @${row.creator.username}` : ""}
                  {row.content?.title ? ` | Content: ${row.content.title}` : ""}
                </p>
                <p className="mt-1 text-xs text-muted">{new Date(row.timestamp).toLocaleString()}</p>
              </article>
            );
          }

          return (
            <article key={row.contentId} className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-2 flex items-center justify-between gap-4">
                <h3 className="font-semibold">{row.title}</h3>
                <span className="text-sm">{toUsd(row.price)}</span>
              </div>
              <p className="text-sm text-ink/75">
                {row.type.toLowerCase()} by @{row.creator.username}
              </p>
              <p className="mt-1 text-xs text-muted">Last activity: {new Date(row.lastActivityAt).toLocaleString()}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
