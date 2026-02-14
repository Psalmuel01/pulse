import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { withdrawCreatorEarningContractCall } from "@/lib/contract";
import { db } from "@/lib/db";
import { withdrawEarningsSchema } from "@/lib/validators";

export async function POST(
  request: Request,
  { params }: { params: { creatorId: string } }
) {
  const user = await getCurrentUserFromRequest(request);
  const payload = await request.json().catch(() => null);
  const parsed = withdrawEarningsSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const creator = await db.creator.findUnique({ where: { id: params.creatorId } });
  if (!creator) {
    return NextResponse.json({ error: "Creator not found." }, { status: 404 });
  }

  if (creator.userId !== user.id) {
    return NextResponse.json({ error: "Only the creator can withdraw earnings." }, { status: 403 });
  }

  const available = Number(creator.availableEarnings);
  const amountToWithdraw = parsed.data.amount ?? available;

  if (amountToWithdraw <= 0) {
    return NextResponse.json({ error: "No available earnings to withdraw." }, { status: 400 });
  }

  if (amountToWithdraw > available) {
    return NextResponse.json({ error: "Requested amount exceeds available earnings." }, { status: 400 });
  }

  const txHash = parsed.data.txHash ?? `demo_withdraw_${Date.now()}`;

  const contractOk = await withdrawCreatorEarningContractCall({
    txHash,
    creatorWallet: creator.walletAddress,
    amountUsd: amountToWithdraw.toString()
  });

  if (!contractOk) {
    return NextResponse.json({ error: "withdrawCreatorEarning contract call could not be verified." }, { status: 400 });
  }

  const result = await db.$transaction(async (tx) => {
    const updatedCreator = await tx.creator.update({
      where: { id: creator.id },
      data: {
        availableEarnings: {
          decrement: new Prisma.Decimal(amountToWithdraw)
        }
      }
    });

    await tx.transaction.create({
      data: {
        userId: user.id,
        creatorId: creator.id,
        type: "WITHDRAWAL",
        amount: new Prisma.Decimal(amountToWithdraw),
        status: "CONFIRMED",
        onChainTxHash: txHash
      }
    });

    return updatedCreator;
  });

  return NextResponse.json({
    creator: {
      id: result.id,
      availableEarnings: result.availableEarnings.toString(),
      lifetimeEarnings: result.lifetimeEarnings.toString()
    },
    withdrawnAmount: amountToWithdraw.toFixed(2),
    txHash
  });
}
