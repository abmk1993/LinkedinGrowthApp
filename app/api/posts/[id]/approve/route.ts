import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(
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

  const { data: updated, error } = await supabase
    .from("posts")
    .update({ status: "approved", updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("profile_id", user.id)
    .eq("status", "draft")
    .select()
    .single();
  if (error || !updated) {
    return NextResponse.json(
      { error: error?.message ?? "Post not found or not in draft status" },
      { status: error ? 500 : 404 }
    );
  }

  return NextResponse.json(updated, { status: 200 });
}
