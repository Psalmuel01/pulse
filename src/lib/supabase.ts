import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

const url = env.supabaseUrl;
const anonKey = env.supabaseAnonKey;
const serviceRoleKey = env.supabaseServiceRoleKey;

export const supabaseClient =
  url && anonKey
    ? createClient(url, anonKey)
    : null;

export const supabaseAdmin =
  url && serviceRoleKey
    ? createClient(url, serviceRoleKey, {
        auth: { persistSession: false }
      })
    : null;

let ensureBucketPromise: Promise<void> | null = null;

async function ensureStorageBucket() {
  if (!supabaseAdmin) {
    throw new Error("Supabase admin client is not configured.");
  }

  if (ensureBucketPromise) {
    return ensureBucketPromise;
  }

  ensureBucketPromise = (async () => {
    const { data: buckets, error } = await supabaseAdmin.storage.listBuckets();
    if (error) {
      throw new Error(error.message ?? "Could not list Supabase storage buckets.");
    }

    const exists = buckets.some((bucket) => bucket.name === env.supabaseStorageBucket);
    if (exists) {
      return;
    }

    const { error: createError } = await supabaseAdmin.storage.createBucket(env.supabaseStorageBucket, {
      public: false
    });

    if (createError && !createError.message.toLowerCase().includes("already exists")) {
      throw new Error(createError.message ?? "Could not create Supabase storage bucket.");
    }
  })();

  return ensureBucketPromise;
}

export async function createContentSignedUrl(storagePath: string, expiresIn = 90) {
  if (!supabaseAdmin) {
    throw new Error("Supabase admin client is not configured.");
  }

  await ensureStorageBucket();

  const { data, error } = await supabaseAdmin.storage
    .from(env.supabaseStorageBucket)
    .createSignedUrl(storagePath, expiresIn);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "Could not create signed URL.");
  }

  return data.signedUrl;
}

export async function createContentUploadUrl(storagePath: string) {
  if (!supabaseAdmin) {
    throw new Error("Supabase admin client is not configured.");
  }

  await ensureStorageBucket();

  const { data, error } = await supabaseAdmin.storage
    .from(env.supabaseStorageBucket)
    .createSignedUploadUrl(storagePath);

  if (error || !data) {
    throw new Error(error?.message ?? "Could not create signed upload URL.");
  }

  const signedUrl =
    "signedUrl" in data && typeof data.signedUrl === "string"
      ? data.signedUrl
      : `${url}/storage/v1/object/upload/sign/${env.supabaseStorageBucket}/${data.path}?token=${data.token}`;

  return {
    ...data,
    signedUrl
  };
}

export async function uploadTextContent(storagePath: string, content: string) {
  if (!supabaseAdmin) {
    throw new Error("Supabase admin client is not configured.");
  }

  await ensureStorageBucket();

  const { error } = await supabaseAdmin.storage
    .from(env.supabaseStorageBucket)
    .upload(storagePath, content, {
      upsert: false,
      contentType: "text/plain; charset=utf-8"
    });

  if (error) {
    throw new Error(error.message ?? "Could not upload article text content.");
  }
}
