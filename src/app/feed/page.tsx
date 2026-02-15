import { FeedView } from "@/components/feed-view";
import { PrivyAuthGate } from "@/components/privy-auth-gate";

export default function FeedPage() {
  return (
    <PrivyAuthGate title="Personal Feed" description="Create an account to view your subscriptions, unlocks, and history.">
      <section className="space-y-4">
        <header>
          <p className="text-xs uppercase tracking-[0.22em] text-muted">Personal Feed</p>
          <h1 className="font-serif text-4xl">Your unlocked content and transaction history.</h1>
        </header>
        <FeedView />
      </section>
    </PrivyAuthGate>
  );
}
