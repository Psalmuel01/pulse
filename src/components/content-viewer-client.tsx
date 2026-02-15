"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthedFetch } from "@/hooks/use-authed-fetch";

type ContentAccessPayload = {
  contentId: string;
  signedUrl: string;
  expiresIn: number;
  accessMode: "subscription" | "payPerView";
  content: {
    id: string;
    title: string;
    description: string | null;
    type: "ARTICLE" | "VIDEO" | "MUSIC";
  };
};

type ContentViewerClientProps = {
  contentId: string;
};

export function ContentViewerClient({ contentId }: ContentViewerClientProps) {
  const authedFetch = useAuthedFetch();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<ContentAccessPayload | null>(null);
  const [articleText, setArticleText] = useState<string>("");

  const loadContent = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPayload(null);
    setArticleText("");

    const response = await authedFetch(`/api/contents/${encodeURIComponent(contentId)}/access`, {
      method: "POST"
    });
    const data = (await response.json()) as ContentAccessPayload & { error?: string };

    if (!response.ok) {
      setError(data.error ?? "Unable to load content.");
      setLoading(false);
      return;
    }

    setPayload(data);

    if (data.content.type === "ARTICLE") {
      const textResponse = await fetch(data.signedUrl);
      if (!textResponse.ok) {
        setError("Could not load article body.");
        setLoading(false);
        return;
      }
      const text = await textResponse.text();
      setArticleText(text);
    }

    setLoading(false);
  }, [authedFetch, contentId]);

  useEffect(() => {
    loadContent().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "Unable to load content.");
      setLoading(false);
    });
  }, [loadContent]);

  if (loading) {
    return <p className="text-sm text-muted">Loading content...</p>;
  }

  if (error) {
    return (
      <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        <button
          type="button"
          onClick={() => {
            loadContent().catch((err: unknown) => {
              setError(err instanceof Error ? err.message : "Unable to load content.");
              setLoading(false);
            });
          }}
          className="rounded-xl border border-border px-4 py-2 text-sm font-semibold"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!payload) {
    return null;
  }

  return (
    <section className="space-y-4">
      <header className="rounded-2xl border border-border bg-card p-6">
        <p className="text-xs uppercase tracking-[0.22em] text-muted">{payload.content.type.toLowerCase()}</p>
        <h1 className="mt-1 font-serif text-3xl">{payload.content.title}</h1>
        {payload.content.description ? (
          <p className="mt-2 text-sm text-ink/80">{payload.content.description}</p>
        ) : null}
        <p className="mt-2 text-xs text-muted">
          Access via {payload.accessMode} | Link expires in {payload.expiresIn}s
        </p>
      </header>

      {payload.content.type === "ARTICLE" ? (
        <article className="rounded-2xl border border-border bg-card p-6">
          <div className="mx-auto max-w-3xl whitespace-pre-wrap text-[15px] leading-7 text-ink/90">
            {articleText || "Article text is empty."}
          </div>
        </article>
      ) : null}

      {payload.content.type === "VIDEO" ? (
        <div className="rounded-2xl border border-border bg-card p-4">
          <video
            src={payload.signedUrl}
            controls
            playsInline
            className="h-auto max-h-[70vh] w-full rounded-xl bg-black"
          />
        </div>
      ) : null}

      {payload.content.type === "MUSIC" ? (
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mx-auto max-w-2xl space-y-4">
            <div className="rounded-2xl bg-gradient-to-r from-accent/20 via-accent/10 to-transparent p-6">
              <p className="text-sm text-ink/80">Now playing</p>
              <p className="mt-1 font-serif text-2xl">{payload.content.title}</p>
            </div>
            <audio src={payload.signedUrl} controls className="w-full" />
          </div>
        </div>
      ) : null}
    </section>
  );
}

