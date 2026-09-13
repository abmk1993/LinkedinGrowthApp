import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export const PHOTO_BUCKET = "profile-photos";

/**
 * Requires a "profile-photos" bucket to exist in Supabase Storage
 * (private, not public — access is via signed URLs only). Create it
 * once via the dashboard or `supabase storage create profile-photos`;
 * see README "Setup" for the exact step. This module doesn't create
 * the bucket itself since that's a one-time project-level operation,
 * not something that should happen on a request path.
 */

export async function uploadPhoto(
  supabase: SupabaseClient<Database>,
  userId: string,
  kind: "original" | "corrected",
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const extension = contentType === "image/png" ? "png" : "jpg";
  const path = `${userId}/${kind}-${Date.now()}.${extension}`;

  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, buffer, { contentType, upsert: false });

  if (error) {
    throw new Error(`Failed to upload ${kind} photo: ${error.message}`);
  }

  return path;
}

/** Signed URLs expire — generate short-lived, on-demand, not stored long-term. */
export async function getSignedPhotoUrl(
  supabase: SupabaseClient<Database>,
  path: string,
  expiresInSeconds = 3600
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data) {
    throw new Error(`Failed to sign photo URL: ${error?.message ?? "unknown error"}`);
  }

  return data.signedUrl;
}

export async function downloadPhoto(
  supabase: SupabaseClient<Database>,
  path: string
): Promise<Buffer> {
  const { data, error } = await supabase.storage.from(PHOTO_BUCKET).download(path);
  if (error || !data) {
    throw new Error(`Failed to download photo: ${error?.message ?? "unknown error"}`);
  }
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
