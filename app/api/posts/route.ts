import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Lists the current user's posts, optionally filtered by status (?status=published). */
export async function GET(req: NextRequest) {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const status = req.nextUrl.searchParams.get("status");
  let query = supabase
    .from("posts")
    .select("id, selected_hook, body, status, published_at, created_at")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });

  if (status === "draft" || status === "approved" || status === "published") {
    query = query.eq("status", status);
  }

  const { data: posts, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ posts: posts ?? [] }, { status: 200 });
}
