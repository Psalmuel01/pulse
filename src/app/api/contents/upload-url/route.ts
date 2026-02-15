import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { createContentUploadUrl } from "@/lib/supabase";
import { db, isDatabaseConfigured } from "@/lib/db";
import { createUploadUrlSchema } from "@/lib/validators";

function sanitize(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-");
}

function detectContentTypeFromMime(mimeType: string) {
  const normalized = mimeType.toLowerCase();
  if (normalized.startsWith("video/")) {
    return "VIDEO";
  }
  if (normalized.startsWith("audio/")) {
    return "MUSIC";
  }
  if (normalized.startsWith("text/")) {
    return "ARTICLE";
  }
  return null;
}

export async function POST(request: Request) {
  if (!isDatabaseConfigured) {
    return NextResponse.json(
      { error: "Database is not configured. Set DATABASE_URL before uploading content." },
      { status: 503 }
    );
  }

  const user = await getCurrentUserFromRequest(request);
  const payload = await request.json().catch(() => null);
  const parsed = createUploadUrlSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const normalizedMime = parsed.data.mimeType.toLowerCase();
  if (normalizedMime === "application/pdf") {
    return NextResponse.json(
      { error: "PDF uploads are disabled. For articles, paste text or upload a text file." },
      { status: 415 }
    );
  }

  const detectedType = detectContentTypeFromMime(parsed.data.mimeType);
  if (!detectedType) {
    return NextResponse.json(
      { error: "Unsupported file type. Upload video, audio, or text files only." },
      { status: 400 }
    );
  }

  const creator = await db.creator.findUnique({ where: { userId: user.id } });
  if (!creator) {
    return NextResponse.json({ error: "Only creators can upload content." }, { status: 403 });
  }

  const storagePath = `${creator.id}/${Date.now()}-${sanitize(parsed.data.fileName)}`;

  try {
    const upload = await createContentUploadUrl(storagePath);

    return NextResponse.json({
      detectedType,
      storagePath,
      token: upload.token,
      path: upload.path,
      signedUrl: upload.signedUrl
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to create upload URL"
      },
      { status: 500 }
    );
  }
}
