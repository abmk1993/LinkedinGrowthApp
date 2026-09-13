import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export const PHOTO_BUCKET = "profile-photos";
export const SCREENSHOT_BUCKET = "profile-screenshots";

/**
 * Requires "profile-photos" and "profile-screenshots" buckets to exist
 * in Supabase Storage (both private, not public — access is via signed
 * URLs only). Create them once via the dashboard; see README "Setup"
 * for the exact step. This module doesn't create buckets itself since
 * that's a one-time project-level operation, not something that should
 * happen on a request path.
 */

async function uploadToBucket(
  supabase: SupabaseClient<Database>,
  bucket: string,
  path: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, buffer, { contentType, upsert: false });

  if (error) {
    throw new Error(`Failed to upload to ${bucket}: ${error.message}`);
  }

  return path;
}

async function downloadFromBucket(
  supabase: SupabaseClient<Database>,
  bucket: string,
  path: string
): Promise<Buffer> {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) {
    throw new Error(`Failed to download from ${bucket}: ${error?.message ?? "unknown error"}`);
  }
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function uploadPhoto(
  supabase: SupabaseClient<Database>,
  userId: string,
  kind: "original" | "corrected",
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const extension = contentType === "image/png" ? "png" : "jpg";
  const path = `${userId}/${kind}-${Date.now()}.${extension}`;
  return uploadToBucket(supabase, PHOTO_BUCKET, path, buffer, contentType);
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
  return downloadFromBucket(supabase, PHOTO_BUCKET, path);
}

/**
 * Screenshots are uploaded for the record (and so a user could
 * eventually revisit what was analyzed) but are write-once — nothing
 * downloads or re-signs them today, so there's no corresponding
 * getSignedScreenshotUrl yet. Add one if/when that becomes a real need.
 */
export async function uploadScreenshot(
  supabase: SupabaseClient<Database>,
  userId: string,
  index: number,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const extension = contentType === "image/png" ? "png" : "jpg";
  const path = `${userId}/${Date.now()}-${index}.${extension}`;
  return uploadToBucket(supabase, SCREENSHOT_BUCKET, path, buffer, contentType);
}

/**
 * Best-effort cleanup for screenshots already uploaded when a later
 * step in the same request (saving the DB row) fails — otherwise
 * they're orphaned in Storage with nothing ever referencing or
 * deleting them. Deliberately swallows its own errors: this runs
 * inside an error path already reporting a different failure to the
 * caller, and a cleanup failure shouldn't mask or replace it.
 */
export async function deleteScreenshots(
  supabase: SupabaseClient<Database>,
  paths: string[]
): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(SCREENSHOT_BUCKET).remove(paths);
  if (error) {
    console.error(`Failed to clean up orphaned screenshots: ${error.message}`, paths);
  }
}
