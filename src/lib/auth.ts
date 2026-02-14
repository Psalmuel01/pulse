import { headers } from "next/headers";
import { db } from "@/lib/db";

export type AuthenticatedUser = {
  id: string;
  walletAddress?: string | null;
  email?: string | null;
  phone?: string | null;
};

function withDemoFallback(value: string | null, fallback: string) {
  return value?.trim() ? value : fallback;
}

async function upsertUser(user: AuthenticatedUser): Promise<AuthenticatedUser> {
  const record = await db.user.upsert({
    where: { id: user.id },
    update: {
      walletAddress: user.walletAddress ?? undefined,
      email: user.email ?? undefined,
      phone: user.phone ?? undefined
    },
    create: {
      id: user.id,
      walletAddress: user.walletAddress ?? undefined,
      email: user.email ?? undefined,
      phone: user.phone ?? undefined
    }
  });

  return {
    id: record.id,
    walletAddress: record.walletAddress,
    email: record.email,
    phone: record.phone
  };
}

export async function getCurrentUserFromRequest(request: Request): Promise<AuthenticatedUser> {
  const requestHeaders = request.headers;

  // In production, replace this with Privy server-side JWT verification.
  const userId = withDemoFallback(requestHeaders.get("x-user-id"), "demo-user");
  const walletAddress = requestHeaders.get("x-wallet-address") ?? "0xDEMO000000000000000000000000000000000001";
  const email = requestHeaders.get("x-user-email");
  const phone = requestHeaders.get("x-user-phone");

  return upsertUser({
    id: userId,
    walletAddress,
    email,
    phone
  });
}

export async function getCurrentUserFromServerContext(): Promise<AuthenticatedUser> {
  const hdrs = headers();
  const userId = withDemoFallback(hdrs.get("x-user-id"), "demo-user");
  const walletAddress = hdrs.get("x-wallet-address") ?? "0xDEMO000000000000000000000000000000000001";
  const email = hdrs.get("x-user-email");
  const phone = hdrs.get("x-user-phone");

  return upsertUser({
    id: userId,
    walletAddress,
    email,
    phone
  });
}
