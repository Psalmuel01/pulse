import { toUsd } from "@/lib/utils";

type ContentCardProps = {
  id: string;
  title: string;
  type: string;
  price: string;
  onlyForSubscribers: boolean;
  unlocked: boolean;
  onUnlock?: (contentId: string) => void;
  onView?: (contentId: string) => void;
};

export function ContentCard({
  id,
  title,
  type,
  price,
  onlyForSubscribers,
  unlocked,
  onUnlock,
  onView
}: ContentCardProps) {
  const canView = unlocked;

  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted">{type.toLowerCase()}</p>
          <h3 className="font-semibold">{title}</h3>
        </div>
        {onlyForSubscribers && (
          <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent">
            Subscribers only
          </span>
        )}
      </div>
      <p className="mb-4 text-sm text-ink/75">Pay-per-view: {toUsd(price)}</p>
      <div className="flex gap-2">
        {!canView ? (
          <button
            type="button"
            onClick={() => onUnlock?.(id)}
            className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Unlock
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onView?.(id)}
            className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-ink transition hover:bg-canvas"
          >
            View Content
          </button>
        )}
      </div>
    </article>
  );
}
