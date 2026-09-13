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

  const { data: run, error: runError } = await supabase
    .from("research_runs")
    .select("id, status, created_at")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (runError) {
    return NextResponse.json({ error: runError.message }, { status: 500 });
  }
  if (!run) {
    return NextResponse.json({ run: null, items: [] }, { status: 200 });
  }

  const { data: items, error: itemsError } = await supabase
    .from("research_items")
    .select("*")
    .eq("research_run_id", run.id)
    .order("created_at", { ascending: true });
  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  return NextResponse.json({ run, items: items ?? [] }, { status: 200 });
}
