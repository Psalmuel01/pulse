"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";

const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

function LandingPrivyMissingConfig() {
  return (
    <section className="space-y-8">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-glow sm:p-10">
        <div className="pointer-events-none absolute -left-12 -top-16 h-56 w-56 rounded-full bg-teal-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 bottom-0 h-52 w-52 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="relative max-w-3xl space-y-5">
          <p className="text-xs uppercase tracking-[0.24em] text-muted">Pulse</p>
          <h1 className="font-serif text-4xl leading-tight sm:text-5xl">
            Stablecoin subscriptions and pay-per-view rails for modern creators.
          </h1>
          <p className="text-sm text-ink/75 sm:text-base">
            Pulse runs on Tempo with Privy-based onboarding. Users create accounts with email or phone, receive a
            wallet, and then pay creators with `pathUSD`.
          </p>
          <p className="rounded-xl border border-dashed border-border bg-canvas/60 px-4 py-3 text-sm text-ink/80">
            Missing <code>NEXT_PUBLIC_PRIVY_APP_ID</code> in <code>.env.local</code>. Add it to enable account
            creation and wallet flows.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/explore"
              className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Explore Creators
            </Link>
            <Link
              href="/creator"
              className="rounded-xl border border-border px-5 py-3 text-sm font-semibold text-ink/85 transition hover:bg-canvas/70"
            >
              Open Creator Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Auth</p>
          <p className="mt-2 text-sm text-ink/80">Privy email/phone onboarding with embedded wallet creation.</p>
        </article>
        <article className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Payments</p>
          <p className="mt-2 text-sm text-ink/80">Tempo transfers in `pathUSD` with on-chain verification.</p>
        </article>
        <article className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Content</p>
          <p className="mt-2 text-sm text-ink/80">Subscriber-only and pay-per-view access via signed URLs.</p>
        </article>
      </div>
    </section>
  );
}

function LandingPrivyEnabled() {
  const router = useRouter();
  const { ready, authenticated, login } = usePrivy();
  const [pendingLoginRedirect, setPendingLoginRedirect] = useState(false);

  useEffect(() => {
    if (pendingLoginRedirect && ready && authenticated) {
      router.replace("/explore");
      setPendingLoginRedirect(false);
    }
  }, [authenticated, pendingLoginRedirect, ready, router]);

  return (
    <section className="space-y-8 pb-16">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-glow sm:p-10">
        <div className="pointer-events-none absolute -left-14 -top-16 h-60 w-60 rounded-full bg-teal-400/20 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-0 h-44 w-44 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-14 right-16 h-52 w-52 rounded-full bg-sky-500/15 blur-3xl" />

        <div className="relative grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-5">
            <p className="text-xs uppercase tracking-[0.24em] text-muted">Pulse</p>
            <h1 className="font-serif text-4xl leading-tight sm:text-5xl">
              Own your audience. Monetize instantly.
            </h1>
            <p className="max-w-2xl text-sm text-ink/75 sm:text-base">
              Pulse combines creator subscriptions, one-time unlocks, and secure content delivery. Fans pay in
              `pathUSD`, creators monitor earnings in real time, and wallet onboarding is handled by Privy.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={async () => {
                  setPendingLoginRedirect(true);
                  try {
                    await login();
                  } catch {
                    setPendingLoginRedirect(false);
                  }
                }}
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
            <div className="rounded-2xl border border-border bg-canvas/70 p-4 text-sm text-ink/80">
              <p className="font-semibold">Before you transact</p>
              <p className="mt-1">
                Fund your wallet with `aUSD` for gas and `pathUSD` for payments. The app header shows both balances
                once you sign in.
              </p>
            </div>
          </div>

          <div className="grid gap-3 text-sm">
            <article className="rounded-2xl border border-border bg-canvas/70 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted">Step 1</p>
              <p className="mt-1 font-semibold">Sign up with email, phone or wallet</p>
            </article>
            <article className="rounded-2xl border border-border bg-canvas/70 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted">Step 2</p>
              <p className="mt-1 font-semibold">Privy creates your Tempo wallet</p>
            </article>
            <article className="rounded-2xl border border-border bg-canvas/70 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted">Step 3</p>
              <p className="mt-1 font-semibold">Subscribe or unlock with `pathUSD`</p>
            </article>
            <article className="rounded-2xl border border-border bg-canvas/70 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted">Step 4</p>
              <p className="mt-1 font-semibold">View content through short-lived signed URLs</p>
            </article>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Subscriptions</p>
          <p className="mt-2 text-sm text-ink/80">
            Monthly access on a rolling 30-day expiry. Resubscribes stack from active expiry windows.
          </p>
        </article>
        <article className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Pay Per View</p>
          <p className="mt-2 text-sm text-ink/80">
            Unlock single drops with one payment and one content access. Subsequent views require a new unlock.
          </p>
        </article>
        <article className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Creator Earnings</p>
          <p className="mt-2 text-sm text-ink/80">
            Revenue updates in dashboard analytics, with on-chain withdraw support for available balances.
          </p>
        </article>
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-border bg-card p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">For Creators</p>
          <h2 className="mt-2 font-serif text-3xl">Own your pricing and distribution</h2>
          <ul className="mt-4 space-y-2 text-sm text-ink/80">
            <li>Set and update monthly subscription fee.</li>
            <li>Publish article, video, and music content.</li>
            <li>Mark items subscriber-only or pay-per-view.</li>
            <li>Track revenue, subscribers, and top-performing content.</li>
          </ul>
        </article>
        <article className="rounded-2xl border border-border bg-card p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">For Fans</p>
          <h2 className="mt-2 font-serif text-3xl">Simple access and transparent payments</h2>
          <ul className="mt-4 space-y-2 text-sm text-ink/80">
            <li>Create an account in one flow without a seed phrase.</li>
            <li>Subscribe once for full creator access.</li>
            <li>Unlock individual pieces when you only want one drop.</li>
            <li>Review feed history across subscriptions, unlocks, and views.</li>
          </ul>
        </article>
      </section>

      <section className="rounded-3xl border border-border bg-card p-8">
        <p className="text-xs uppercase tracking-[0.24em] text-muted">Frequently Asked</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-border bg-canvas/70 p-4">
            <p className="font-semibold">Do I need funds before subscribing?</p>
            <p className="mt-1 text-sm text-ink/75">
              Yes. You need `pathUSD` for content payments and `aUSD` to cover transaction gas.
            </p>
          </article>
          <article className="rounded-2xl border border-border bg-canvas/70 p-4">
            <p className="font-semibold">How is premium content protected?</p>
            <p className="mt-1 text-sm text-ink/75">
              Access is through signed Supabase URLs with short expiry windows and backend entitlement checks.
            </p>
          </article>
          <article className="rounded-2xl border border-border bg-canvas/70 p-4">
            <p className="font-semibold">Can creators have multiple profiles?</p>
            <p className="mt-1 text-sm text-ink/75">
              No. Each authenticated account can create one creator profile and manage it from one dashboard.
            </p>
          </article>
          <article className="rounded-2xl border border-border bg-canvas/70 p-4">
            <p className="font-semibold">What content types are supported?</p>
            <p className="mt-1 text-sm text-ink/75">
              Article text, video, and audio uploads. PDFs are disabled to keep the pipeline simple and consistent.
            </p>
          </article>
        </div>
      </section>
    </section>
  );
}

export function LandingPageClient() {
  if (!privyAppId) {
    return <LandingPrivyMissingConfig />;
  }

  return <LandingPrivyEnabled />;
}
