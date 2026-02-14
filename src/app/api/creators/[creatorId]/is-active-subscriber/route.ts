import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { userHasActiveSubscription } from "@/lib/access";
import { isActiveSubscriberContractRead } from "@/lib/contract";
import { db } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: { creatorId: string } }
) {
  const requester = await getCurrentUserFromRequest(request);
  const { searchParams } = new URL(request.url);
  const requestedUserId = searchParams.get("userId") ?? requester.id;

  const [creator, user] = await Promise.all([
    db.creator.findUnique({ where: { id: params.creatorId } }),
    db.user.findUnique({ where: { id: requestedUserId } })
  ]);

  if (!creator || !user) {
    return NextResponse.json({ error: "Creator or user not found." }, { status: 404 });
  }

  const localStatus = await userHasActiveSubscription(user.id, creator.id);
  const chainStatus = await isActiveSubscriberContractRead({
    subscriberWallet: user.walletAddress ?? "",
    creatorWallet: creator.walletAddress
  });

  return NextResponse.json({
    creatorId: creator.id,
    userId: user.id,
    isActiveSubscriber: chainStatus ?? localStatus,
    source: chainStatus === null ? "db" : "chain"
  });
}
