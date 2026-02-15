import { NextResponse } from "next/server";
import { userHasActiveSubscription } from "@/lib/access";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { db, isDatabaseConfigured } from "@/lib/db";
import { createContentSignedUrl } from "@/lib/supabase";

const ACCESS_RETRY_WINDOW_MS = 2 * 60 * 1000;

export async function POST(
  request: Request,
  { params }: { params: { contentId: string } }
) {
  if (!isDatabaseConfigured) {
    return NextResponse.json({
      contentId: params.contentId,
      signedUrl: "https://example.com/demo-content",
      expiresIn: 120,
      accessMode: "payPerView",
      content: {
        id: params.contentId,
        title: "Demo Content",
        description: "Preview content in demo mode.",
        type: "ARTICLE"
      }
    });
  }

  const user = await getCurrentUserFromRequest(request);

  const content = await db.content.findUnique({
    where: { id: params.contentId },
    include: { creator: true }
  });

  if (!content) {
    return NextResponse.json({ error: "Content not found." }, { status: 404 });
  }

  const hasSubscription = await userHasActiveSubscription(user.id, content.creatorId);
  const retryWindowStart = new Date(Date.now() - ACCESS_RETRY_WINDOW_MS);
  let unlockToConsumeId: string | null = null;

  if (content.onlyForSubscribers && !hasSubscription) {
    return NextResponse.json(
      { error: "Subscriber-only content requires an active subscription." },
      { status: 403 }
    );
  }

  if (!hasSubscription) {
    const unlock = await db.unlock.findFirst({
      where: {
        userId: user.id,
        contentId: content.id,
        viewsRemaining: { gt: 0 }
      },
      orderBy: { createdAt: "desc" }
    });

    if (!unlock) {
      // Allow a short retry window so duplicate requests (e.g. dev-mode double invokes)
      // do not fail immediately after a successful unlock consumption.
      const recentView = await db.contentView.findFirst({
        where: {
          userId: user.id,
          contentId: content.id,
          viewedAt: { gte: retryWindowStart }
        },
        orderBy: { viewedAt: "desc" }
      });

      if (!recentView) {
        return NextResponse.json(
          { error: "No active unlock found. Please unlock this content." },
          { status: 402 }
        );
      }
    } else {
      unlockToConsumeId = unlock.id;
    }
  }

  try {
    const signedUrl = await createContentSignedUrl(content.storagePath, 120);

    await db.$transaction(async (tx) => {
      if (unlockToConsumeId) {
        const updated = await tx.unlock.updateMany({
          where: {
            id: unlockToConsumeId,
            userId: user.id,
            contentId: content.id,
            viewsRemaining: { gt: 0 }
          },
          data: {
            viewsRemaining: {
              decrement: 1
            }
          }
        });

        if (updated.count === 0) {
          const recentView = await tx.contentView.findFirst({
            where: {
              userId: user.id,
              contentId: content.id,
              viewedAt: { gte: retryWindowStart }
            },
            orderBy: { viewedAt: "desc" }
          });

          if (!recentView) {
            throw new Error("NO_ACTIVE_UNLOCK");
          }
        }
      }

      await tx.contentView.create({
        data: {
          userId: user.id,
          contentId: content.id
        }
      });
    });

    return NextResponse.json({
      contentId: content.id,
      signedUrl,
      expiresIn: 120,
      accessMode: hasSubscription ? "subscription" : "payPerView",
      content: {
        id: content.id,
        title: content.title,
        description: content.description,
        type: content.type
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NO_ACTIVE_UNLOCK") {
      return NextResponse.json(
        { error: "No active unlock found. Please unlock this content." },
        { status: 402 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not generate content access URL" },
      { status: 500 }
    );
  }
}
