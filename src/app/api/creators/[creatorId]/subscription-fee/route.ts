import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { updateSubscriptionFeeContractCall } from "@/lib/contract";
import { updateSubscriptionFeeSchema } from "@/lib/validators";

export async function PATCH(
  request: Request,
  { params }: { params: { creatorId: string } }
) {
  const user = await getCurrentUserFromRequest(request);
  const payload = await request.json().catch(() => null);
  const parsed = updateSubscriptionFeeSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const creator = await db.creator.findUnique({ where: { id: params.creatorId } });
  if (!creator) {
    return NextResponse.json({ error: "Creator not found." }, { status: 404 });
  }

  if (creator.userId !== user.id) {
    return NextResponse.json({ error: "Only the creator can update subscription fee." }, { status: 403 });
  }

  const contractOk = await updateSubscriptionFeeContractCall({
    txHash: parsed.data.txHash,
    creatorWallet: creator.walletAddress,
    newFeeUsd: parsed.data.subscriptionFee.toString()
  });

  if (!contractOk) {
    return NextResponse.json({ error: "updateSubscriptionFee contract call could not be verified." }, { status: 400 });
  }

  const updated = await db.creator.update({
    where: { id: creator.id },
    data: {
      subscriptionFee: new Prisma.Decimal(parsed.data.subscriptionFee)
    }
  });

  return NextResponse.json({
    creator: {
      id: updated.id,
      subscriptionFee: updated.subscriptionFee.toString()
    }
  });
}
