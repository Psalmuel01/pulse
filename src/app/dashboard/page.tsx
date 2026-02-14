import Link from "next/link";
import { CreatorDashboardClient } from "@/components/creator-dashboard-client";
import { getCurrentUserFromServerContext } from "@/lib/auth";
import { db, isDatabaseConfigured } from "@/lib/db";

export default async function DashboardPage() {
  if (!isDatabaseConfigured) {
    return (
      <section className="rounded-2xl border border-border bg-card p-6">
        <p className="text-xs uppercase tracking-[0.22em] text-muted">Creator Dashboard</p>
        <h1 className="mt-2 font-serif text-3xl">Demo Mode</h1>
        <p className="mt-2 text-sm text-ink/75">
          `DATABASE_URL` is not configured, so dashboard analytics are disabled.
        </p>
        <p className="mt-1 text-sm text-ink/75">
          Add a Postgres connection string in `.env.local` to enable live creator data.
        </p>
      </section>
    );
  }

  const user = await getCurrentUserFromServerContext();
  const creator = await db.creator.findUnique({ where: { userId: user.id }, select: { id: true } });

  if (!creator) {
    return (
      <section className="rounded-2xl border border-border bg-card p-6">
        <p className="text-xs uppercase tracking-[0.22em] text-muted">Creator Dashboard</p>
        <h1 className="mt-2 font-serif text-3xl">You are not a creator yet.</h1>
        <p className="mt-2 text-sm text-ink/75">
          Create your profile to publish premium content and manage subscriptions.
        </p>
        <Link
          href="/become-creator"
          className="mt-4 inline-flex rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white"
        >
          Become a Creator
        </Link>
      </section>
    );
  }

  return <CreatorDashboardClient />;
}
