import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

  // research_items has no profile_id directly (it belongs to a
  // research_run, which belongs to a profile) — RLS enforces
  // ownership at the DB level via that join, same pattern as
  // profile_audit_items.
  const { data: item, error } = await supabase
    .from("research_items")
    .select("*")
    .eq("id", params.id)
    .single();
  if (error || !item) {
    return NextResponse.json({ error: "Research item not found" }, { status: 404 });
  }

  return NextResponse.json(item, { status: 200 });
}
