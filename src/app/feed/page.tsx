import { FeedView } from "@/components/feed-view";

export default function FeedPage() {
  return (
    <section className="space-y-4">
      <header>
        <p className="text-xs uppercase tracking-[0.22em] text-muted">Personal Feed</p>
        <h1 className="font-serif text-4xl">Your unlocked content and transaction history.</h1>
      </header>
      <FeedView />
    </section>
  );
}
