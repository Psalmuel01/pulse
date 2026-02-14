import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { createContentUploadUrl } from "@/lib/supabase";
import { db } from "@/lib/db";
import { createUploadUrlSchema } from "@/lib/validators";

function sanitize(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export async function POST(request: Request) {
  const user = await getCurrentUserFromRequest(request);
  const payload = await request.json().catch(() => null);
  const parsed = createUploadUrlSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const creator = await db.creator.findUnique({ where: { userId: user.id } });
  if (!creator) {
    return NextResponse.json({ error: "Only creators can upload content." }, { status: 403 });
  }

  const storagePath = `${creator.id}/${Date.now()}-${sanitize(parsed.data.fileName)}`;

  try {
    const upload = await createContentUploadUrl(storagePath);

    return NextResponse.json({
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
