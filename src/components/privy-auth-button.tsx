"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";

const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

function PrivyMissingConfigButton() {
  return (
    <Link
      href="/"
      className="rounded-xl border border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/75 transition hover:text-ink"
    >
      Configure Privy
    </Link>
  );
}

function PrivyConfiguredAuthButton() {
  const router = useRouter();
  const { ready, authenticated, login, logout } = usePrivy();
  const [busy, setBusy] = useState(false);

  if (!ready) {
    return <span className="text-xs text-muted">Auth...</span>;
  }

  if (!authenticated) {
    return (
      <button
        type="button"
        onClick={() => login()}
        className="rounded-xl bg-accent px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:opacity-90"
      >
        Create Account
      </button>
    );
  }

  async function handleLogout() {
    setBusy(true);
    try {
      await logout();
      router.push("/");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => router.push("/dashboard")}
        className="rounded-xl border border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/80 transition hover:bg-canvas/70 hover:text-ink"
      >
        Dashboard
      </button>
      <button
        type="button"
        onClick={handleLogout}
        disabled={busy}
        className="rounded-xl bg-accent px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Signing Out..." : "Sign Out"}
      </button>
    </div>
  );
}

export function PrivyAuthButton() {
  if (!privyAppId) {
    return <PrivyMissingConfigButton />;
  }

  return <PrivyConfiguredAuthButton />;
}
