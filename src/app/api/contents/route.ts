import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { db, isDatabaseConfigured } from "@/lib/db";
import { uploadTextContent } from "@/lib/supabase";
import { createContentSchema } from "@/lib/validators";

function sanitize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50);
}

export async function GET(request: Request) {
  if (!isDatabaseConfigured) {
    return NextResponse.json({ contents: [] });
  }

  const { searchParams } = new URL(request.url);
  const creatorId = searchParams.get("creatorId") ?? undefined;

  const contents = await db.content.findMany({
    where: creatorId ? { creatorId } : undefined,
    include: {
      creator: {
        select: {
          id: true,
          username: true,
          category: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({
    contents: contents.map((content) => ({
      id: content.id,
      title: content.title,
      description: content.description,
      type: content.type,
      creator: content.creator,
      price: content.price.toString(),
      onlyForSubscribers: content.onlyForSubscribers,
      thumbnailPath: content.thumbnailPath,
      createdAt: content.createdAt
    }))
  });
}

export async function POST(request: Request) {
  if (!isDatabaseConfigured) {
    return NextResponse.json(
      { error: "Database is not configured. Set DATABASE_URL to publish content." },
      { status: 503 }
    );
  }

  const user = await getCurrentUserFromRequest(request);
  const payload = await request.json().catch(() => null);
  const parsed = createContentSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const creator = await db.creator.findUnique({ where: { userId: user.id } });
  if (!creator) {
    return NextResponse.json({ error: "Only creators can upload content." }, { status: 403 });
  }

  let storagePath = parsed.data.storagePath ?? "";

  if (parsed.data.type === "ARTICLE" && !storagePath) {
    const articleBody = parsed.data.articleBody?.trim();
    if (!articleBody) {
      return NextResponse.json({ error: "Article text is required." }, { status: 400 });
    }

    const slug = sanitize(parsed.data.title) || "article";
    storagePath = `${creator.id}/article-${Date.now()}-${slug}.txt`;

    try {
      await uploadTextContent(storagePath, articleBody);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Could not store article text content." },
        { status: 500 }
      );
    }
  }

  const content = await db.content.create({
    data: {
      creatorId: creator.id,
      title: parsed.data.title,
      description: parsed.data.description,
      type: parsed.data.type,
      price: new Prisma.Decimal(parsed.data.price),
      onlyForSubscribers: parsed.data.onlyForSubscribers,
      storagePath,
      thumbnailPath: parsed.data.thumbnailPath
    }
  });

  return NextResponse.json(
    {
      content: {
        id: content.id,
        title: content.title,
        type: content.type,
        price: content.price.toString(),
        onlyForSubscribers: content.onlyForSubscribers,
        storagePath: content.storagePath,
        createdAt: content.createdAt
      }
    },
    { status: 201 }
  );
}
