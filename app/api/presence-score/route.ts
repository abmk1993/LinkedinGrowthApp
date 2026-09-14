import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Combines the profile-audit and photo-audit scores this app already
 * computes into one number — no new AI call, just aggregation of data
 * that's already sitting in the database from the makeover flow.
 */
export async function GET() {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const [{ data: latestPhoto }, { data: snapshots }] = await Promise.all([
    supabase
      .from("profile_photos")
      .select("score")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("profile_snapshots").select("id").eq("profile_id", user.id),
  ]);

  // Per-section score, not "whatever's in the newest snapshot" — a snapshot
  // can be partial (e.g. generate-about creates a snapshot with only an
  // "about" item), so taking the latest snapshot wholesale would silently
  // drop headline/experience scores that are still current. Instead, take
  // the most recent score for each section across every snapshot.
  let profileScore: number | null = null;
  const snapshotIds = (snapshots ?? []).map((s) => s.id);
  if (snapshotIds.length > 0) {
    const { data: items } = await supabase
      .from("profile_audit_items")
      .select("section, score, created_at")
      .in("profile_snapshot_id", snapshotIds)
      .order("created_at", { ascending: false });

    const latestBySection = new Map<string, number>();
    for (const item of items ?? []) {
      if (item.score == null || latestBySection.has(item.section)) continue;
      latestBySection.set(item.section, item.score);
    }

    const scores = [...latestBySection.values()];
    if (scores.length > 0) {
      profileScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    }
  }

  const photoScore = latestPhoto?.score ?? null;

  const parts = [profileScore, photoScore].filter((s): s is number => s != null);
  const overall =
    parts.length > 0 ? Math.round(parts.reduce((a, b) => a + b, 0) / parts.length) : null;

  return NextResponse.json({ overall, profileScore, photoScore }, { status: 200 });
}
