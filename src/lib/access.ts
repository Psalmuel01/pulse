import { db } from "@/lib/db";

export async function userHasActiveSubscription(userId: string, creatorId: string) {
  const now = new Date();

  const subscription = await db.subscription.findFirst({
    where: {
      userId,
      creatorId,
      status: "ACTIVE",
      expiresAt: { gt: now }
    },
    orderBy: { expiresAt: "desc" }
  });

  return Boolean(subscription);
}

export async function consumeSingleUnlock(userId: string, contentId: string) {
  const unlock = await db.unlock.findFirst({
    where: {
      userId,
      contentId,
      viewsRemaining: { gt: 0 }
    },
    orderBy: { createdAt: "desc" }
  });

  if (!unlock) {
    return null;
  }

  const updated = await db.unlock.update({
    where: { id: unlock.id },
    data: {
      viewsRemaining: {
        decrement: 1
      }
    }
  });

  return updated;
}
