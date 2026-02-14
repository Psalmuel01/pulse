import Link from "next/link";
import { toUsd } from "@/lib/utils";

type CreatorCardProps = {
  id: string;
  username: string;
  category: string;
  subscriptionFee: string;
  subscriberCount: number;
};

export function CreatorCard({
  id,
  username,
  category,
  subscriptionFee,
  subscriberCount
}: CreatorCardProps) {
  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-glow">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted">{category}</p>
          <h3 className="font-serif text-xl">@{username}</h3>
        </div>
        <div className="rounded-full border border-border px-3 py-1 text-sm text-ink/80">
          {subscriberCount} subs
        </div>
      </div>
      <p className="mb-5 text-sm text-ink/75">Monthly: {toUsd(subscriptionFee)}</p>
      <Link
        href={`/creator/${encodeURIComponent(username)}`}
        className="inline-flex rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
      >
        View Profile
      </Link>
      <p className="mt-2 text-[11px] text-muted">Creator ID: {id}</p>
    </article>
  );
}
