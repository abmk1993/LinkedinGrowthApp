import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * The most recent audit's items, so the audit page can show them again
 * after a reload or a Back navigation instead of asking for a new (paid)
 * analysis.
 *
 * One page visit can produce two kinds of snapshot: an analysis (pasted
 * text or screenshots) and a "Generate About for me" draft (neither).
 * Walking newest-first, this collects snapshots until it would reach a
 * second analysis — i.e. the latest analysis plus any drafts made
 * alongside it, before or after.
 */
export async function GET() {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: snapshots, error } = await supabase
    .from("profile_snapshots")
    .select("id, headline_raw, about_raw, experience_raw, screenshot_urls")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const snapshotIds: string[] = [];
  let hasAnalysis = false;
  for (const snapshot of snapshots ?? []) {
    const isAnalysis =
      Boolean(snapshot.headline_raw || snapshot.about_raw || snapshot.experience_raw) ||
      ((snapshot.screenshot_urls as string[] | null)?.length ?? 0) > 0;
    if (isAnalysis && hasAnalysis) break;
    hasAnalysis ||= isAnalysis;
    snapshotIds.push(snapshot.id);
  }

  if (snapshotIds.length === 0) {
    return NextResponse.json({ hasAnalysis, items: [] });
  }

  const { data: items, error: itemsError } = await supabase
    .from("profile_audit_items")
    .select("id, section, critique, suggested_rewrite, score, status, final_text")
    .in("profile_snapshot_id", snapshotIds)
    .order("created_at", { ascending: true });
  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  return NextResponse.json({ hasAnalysis, items: items ?? [] });
}
