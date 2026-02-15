import { DashboardPageClient } from "@/components/dashboard-page-client";
import { PrivyAuthGate } from "@/components/privy-auth-gate";
import { isDatabaseConfigured } from "@/lib/db";

export default async function CreatorDashboardPage() {
  if (!isDatabaseConfigured) {
    return (
      <PrivyAuthGate
        title="Creator Dashboard"
        description="Create an account to open your dashboard and manage creator analytics."
      >
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
      </PrivyAuthGate>
    );
  }

  return (
    <PrivyAuthGate
      title="Creator Dashboard"
      description="Create an account to open your dashboard and manage creator analytics."
    >
      <DashboardPageClient />
    </PrivyAuthGate>
  );
}
