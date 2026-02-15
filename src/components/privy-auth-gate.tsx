"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";

const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

type PrivyAuthGateProps = {
  children: React.ReactNode;
  title?: string;
  description?: string;
};

function PrivyMissingConfig({ title, description }: Omit<PrivyAuthGateProps, "children">) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <p className="text-xs uppercase tracking-[0.22em] text-muted">{title ?? "Access Restricted"}</p>
      <h1 className="mt-2 font-serif text-3xl">Privy is not configured.</h1>
      <p className="mt-2 text-sm text-ink/75">
        Add <code>NEXT_PUBLIC_PRIVY_APP_ID</code> to your <code>.env.local</code> to enable account creation.
      </p>
      {description ? <p className="mt-1 text-sm text-ink/75">{description}</p> : null}
    </section>
  );
}

function PrivyConfiguredGate({ children, title, description }: PrivyAuthGateProps) {
  const router = useRouter();
  const { ready, authenticated, login } = usePrivy();
  const [pendingLoginRedirect, setPendingLoginRedirect] = useState(false);

  useEffect(() => {
    if (pendingLoginRedirect && ready && authenticated) {
      router.replace("/explore");
      setPendingLoginRedirect(false);
    }
  }, [authenticated, pendingLoginRedirect, ready, router]);

  if (!ready) {
    return (
      <section className="rounded-2xl border border-border bg-card p-6">
        <p className="text-sm text-ink/75">Checking account status...</p>
      </section>
    );
  }

  if (!authenticated) {
    return (
      <section className="rounded-2xl border border-border bg-card p-6">
        <p className="text-xs uppercase tracking-[0.22em] text-muted">{title ?? "Sign In Required"}</p>
        <h1 className="mt-2 font-serif text-3xl">Create your account to continue.</h1>
        <p className="mt-2 text-sm text-ink/75">{description ?? "Use Privy to authenticate and open your dashboard."}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
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
            className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Create Account
          </button>
          <Link
            href="/"
            className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-ink/85 transition hover:bg-canvas/70"
          >
            Back to Landing
          </Link>
        </div>
      </section>
    );
  }

  return <>{children}</>;
}

export function PrivyAuthGate({ children, title, description }: PrivyAuthGateProps) {
  if (!privyAppId) {
    return <PrivyMissingConfig title={title} description={description} />;
  }

  return (
    <PrivyConfiguredGate title={title} description={description}>
      {children}
    </PrivyConfiguredGate>
  );
}
