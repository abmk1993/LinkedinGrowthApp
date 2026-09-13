import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(_req: NextRequest) {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: posts, error } = await supabase
    .from("posts")
    .select("status")
    .eq("profile_id", user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = posts ?? [];
  const summary = {
    postsCreated: rows.length,
    postsPublished: rows.filter((p) => p.status === "published").length,
    postsApproved: rows.filter((p) => p.status === "approved").length,
    postsDraft: rows.filter((p) => p.status === "draft").length,
  };

  return NextResponse.json(summary, { status: 200 });
}
