import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";

/**
 * The most recent photo check, so the photo page can show it again after
 * a reload or a Back navigation instead of asking for a new (paid) one.
 */
export async function GET() {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: photo, error } = await supabase
    .from("profile_photos")
    .select("*")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!photo) {
    return NextResponse.json({ photo: null, originalUrl: null, correctedUrl: null });
  }

  // A missing storage object shouldn't hide the saved score and critique.
  const sign = (path: string | null) =>
    path ? getSignedPhotoUrl(supabase, path).catch(() => null) : Promise.resolve(null);
  const [originalUrl, correctedUrl] = await Promise.all([
    sign(photo.original_url),
    sign(photo.corrected_url),
  ]);

  return NextResponse.json({ photo, originalUrl, correctedUrl });
}
