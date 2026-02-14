import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { createContentSchema } from "@/lib/validators";

export async function GET(request: Request) {
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

  const content = await db.content.create({
    data: {
      creatorId: creator.id,
      title: parsed.data.title,
      description: parsed.data.description,
      type: parsed.data.type,
      price: new Prisma.Decimal(parsed.data.price),
      onlyForSubscribers: parsed.data.onlyForSubscribers,
      storagePath: parsed.data.storagePath,
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
