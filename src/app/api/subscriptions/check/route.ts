import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { userHasActiveSubscription } from "@/lib/access";

export async function GET(request: Request) {
  const user = await getCurrentUserFromRequest(request);
  const { searchParams } = new URL(request.url);
  const creatorId = searchParams.get("creatorId");

  if (!creatorId) {
    return NextResponse.json({ error: "creatorId is required." }, { status: 400 });
  }

  const isActive = await userHasActiveSubscription(user.id, creatorId);

  return NextResponse.json({
    creatorId,
    userId: user.id,
    isActiveSubscriber: isActive
  });
}
