import { NextResponse } from "next/server";
import { consumeSingleUnlock, userHasActiveSubscription } from "@/lib/access";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { db, isDatabaseConfigured } from "@/lib/db";
import { createContentSignedUrl } from "@/lib/supabase";

export async function POST(
  request: Request,
  { params }: { params: { contentId: string } }
) {
  if (!isDatabaseConfigured) {
    return NextResponse.json({
      contentId: params.contentId,
      signedUrl: "https://example.com/demo-content",
      expiresIn: 120,
      accessMode: "payPerView"
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

  if (content.onlyForSubscribers && !hasSubscription) {
    return NextResponse.json(
      { error: "Subscriber-only content requires an active subscription." },
      { status: 403 }
    );
  }

  if (!hasSubscription) {
    const unlock = await consumeSingleUnlock(user.id, content.id);

    if (!unlock) {
      return NextResponse.json(
        { error: "No active unlock found. Please unlock this content." },
        { status: 402 }
      );
    }
  }

  try {
    const signedUrl = await createContentSignedUrl(content.storagePath, 120);

    await db.contentView.create({
      data: {
        userId: user.id,
        contentId: content.id
      }
    });

    return NextResponse.json({
      contentId: content.id,
      signedUrl,
      expiresIn: 120,
      accessMode: hasSubscription ? "subscription" : "payPerView"
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not generate content access URL" },
      { status: 500 }
    );
  }
}
