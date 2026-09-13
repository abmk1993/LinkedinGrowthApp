import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAIProvider } from "@/lib/ai/getProvider";
import { auditProfile } from "@/lib/ai/agents/profileAuditAgent";
import { ProfileAuditRequestSchema } from "@/lib/validation/requests";
import { AIProviderError } from "@/lib/ai/provider";

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = ProfileAuditRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("profession, industry, career_goal")
    .eq("id", user.id)
    .single();
  if (profileError || !profile?.profession || !profile.industry || !profile.career_goal) {
    return NextResponse.json(
      { error: "Complete /onboarding/profile before running the profile audit" },
      { status: 400 }
    );
  }

  const { data: skills } = await supabase
    .from("skills")
    .select("name")
    .eq("profile_id", user.id);

  const { data: snapshot, error: snapshotError } = await supabase
    .from("profile_snapshots")
    .insert({
      profile_id: user.id,
      headline_raw: parsed.data.headline ?? null,
      about_raw: parsed.data.about ?? null,
      experience_raw: parsed.data.experience ?? null,
    })
    .select("id")
    .single();
  if (snapshotError || !snapshot) {
    return NextResponse.json(
      { error: snapshotError?.message ?? "Failed to save profile snapshot" },
      { status: 500 }
    );
  }

  try {
    const audit = await auditProfile(getAIProvider(), {
      profession: profile.profession,
      industry: profile.industry,
      careerGoal: profile.career_goal,
      skills: (skills ?? []).map((s) => s.name),
      headline: parsed.data.headline,
      about: parsed.data.about,
      experience: parsed.data.experience,
    });

    const rows = audit.sections.map((s) => ({
      profile_snapshot_id: snapshot.id,
      section: s.section,
      critique: s.critique,
      suggested_rewrite: s.suggested_rewrite,
      score: s.score,
      status: "pending" as const,
    }));

    const { data: inserted, error: insertError } = await supabase
      .from("profile_audit_items")
      .insert(rows)
      .select("id, section, critique, suggested_rewrite, score, status");
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ snapshotId: snapshot.id, items: inserted }, { status: 200 });
  } catch (err) {
    if (err instanceof AIProviderError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    throw err;
  }
}
