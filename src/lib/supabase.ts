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

export async function createContentSignedUrl(storagePath: string, expiresIn = 90) {
  if (!supabaseAdmin) {
    throw new Error("Supabase admin client is not configured.");
  }

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
