"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useTempoBalances } from "@/hooks/use-tempo-balances";

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
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { wallets } = useWallets();
  const [busy, setBusy] = useState(false);
  const [pendingLoginRedirect, setPendingLoginRedirect] = useState(false);
  const walletAddress =
    wallets.find((wallet) => wallet.walletClientType === "privy")?.address ??
    user?.wallet?.address;
  const balances = useTempoBalances(walletAddress);

  useEffect(() => {
    if (pendingLoginRedirect && ready && authenticated) {
      router.replace("/explore");
      setPendingLoginRedirect(false);
    }
  }, [authenticated, pendingLoginRedirect, ready, router]);

  if (!ready) {
    return <span className="text-xs text-muted">Auth...</span>;
  }

  if (!authenticated) {
    return (
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
      {walletAddress ? (
        <div className="hidden max-w-[32rem] rounded-xl border border-border bg-card px-3 py-2 lg:block">
          <p className="break-all font-mono text-[10px] text-ink/80">
            {walletAddress}
          </p>
          <p className="mt-1 text-[10px] text-muted">
            Wallet source: {wallets.find((wallet) => wallet.walletClientType === "privy")?.address ? "Privy embedded" : "Connected wallet"}{" "}
            |{" "}
            Payment (
            {balances.payment.symbol}): {balances.loading ? "Loading..." : balances.payment.value}
          </p>
        </div>
      ) : null}
      {walletAddress ? (
        <div className="rounded-xl border border-border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted lg:hidden">
          <p>{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</p>
          <p className="mt-1 normal-case tracking-normal">
            {balances.gas.symbol}: {balances.loading ? "..." : balances.gas.value} | {balances.payment.symbol}:{" "}
            {balances.loading ? "..." : balances.payment.value}
          </p>
        </div>
      ) : null}
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
