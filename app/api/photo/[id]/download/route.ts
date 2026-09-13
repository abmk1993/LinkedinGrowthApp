import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: photoRow, error } = await supabase
    .from("profile_photos")
    .select("original_url, corrected_url")
    .eq("id", params.id)
    .single();
  if (error || !photoRow) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  const path = photoRow.corrected_url ?? photoRow.original_url;
  const signedUrl = await getSignedPhotoUrl(supabase, path);

  return NextResponse.json({ url: signedUrl }, { status: 200 });
}
