import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const user = await getCurrentUserFromRequest(request);

  const creator = await db.creator.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      username: true,
      category: true,
      walletAddress: true,
      subscriptionFee: true,
      lifetimeEarnings: true,
      availableEarnings: true
    }
  });

  return NextResponse.json({
    user,
    creator: creator
      ? {
          ...creator,
          subscriptionFee: creator.subscriptionFee.toString(),
          lifetimeEarnings: creator.lifetimeEarnings.toString(),
          availableEarnings: creator.availableEarnings.toString()
        }
      : null
  });
}
