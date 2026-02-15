"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";

const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

function LandingPrivyMissingConfig() {
  return (
    <section className="space-y-8">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-glow">
        <div className="pointer-events-none absolute -left-12 -top-16 h-56 w-56 rounded-full bg-teal-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 bottom-0 h-52 w-52 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="relative max-w-2xl space-y-4">
          <p className="text-xs uppercase tracking-[0.24em] text-muted">Pulse</p>
          <h1 className="font-serif text-4xl leading-tight sm:text-5xl">
            Stablecoin-powered creator subscriptions on Tempo.
          </h1>
          <p className="text-sm text-ink/75 sm:text-base">
            Configure Privy to enable account creation, wallet provisioning, and dashboard access flow.
          </p>
          <p className="rounded-xl border border-dashed border-border bg-canvas/60 px-4 py-3 text-sm text-ink/80">
            Missing <code>NEXT_PUBLIC_PRIVY_APP_ID</code> in <code>.env.local</code>.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/explore"
              className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Explore Creators
            </Link>
            <Link
              href="/dashboard"
              className="rounded-xl border border-border px-5 py-3 text-sm font-semibold text-ink/85 transition hover:bg-canvas/70"
            >
              View Dashboard
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function LandingPrivyEnabled() {
  const router = useRouter();
  const { ready, authenticated, login } = usePrivy();

  useEffect(() => {
    if (ready && authenticated) {
      router.replace("/dashboard");
    }
  }, [authenticated, ready, router]);

  return (
    <section className="space-y-8">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-glow sm:p-10">
        <div className="pointer-events-none absolute -left-14 -top-16 h-60 w-60 rounded-full bg-teal-400/20 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-0 h-44 w-44 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-14 right-16 h-52 w-52 rounded-full bg-sky-500/15 blur-3xl" />

        <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <p className="text-xs uppercase tracking-[0.24em] text-muted">Pulse</p>
            <h1 className="font-serif text-4xl leading-tight sm:text-5xl">
              Monetize premium drops with subscriptions and one-tap unlocks.
            </h1>
            <p className="max-w-xl text-sm text-ink/75 sm:text-base">
              Creators publish articles, videos, and music. Fans subscribe or pay per view with Tempo pathUSD rails.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => login()}
                disabled={!ready}
                className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {ready ? "Create Account with Privy" : "Loading Auth..."}
              </button>
              <Link
                href="/explore"
                className="rounded-xl border border-border px-5 py-3 text-sm font-semibold text-ink/85 transition hover:bg-canvas/70"
              >
                Browse Creators
              </Link>
            </div>
          </div>

          <div className="grid gap-3 text-sm">
            <article className="rounded-2xl border border-border bg-canvas/70 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted">Step 1</p>
              <p className="mt-1 font-semibold">Create account with email or phone</p>
            </article>
            <article className="rounded-2xl border border-border bg-canvas/70 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted">Step 2</p>
              <p className="mt-1 font-semibold">Privy provisions your wallet automatically</p>
            </article>
            <article className="rounded-2xl border border-border bg-canvas/70 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted">Step 3</p>
              <p className="mt-1 font-semibold">Go straight to your creator or fan dashboard</p>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LandingPageClient() {
  if (!privyAppId) {
    return <LandingPrivyMissingConfig />;
  }

  return <LandingPrivyEnabled />;
}
