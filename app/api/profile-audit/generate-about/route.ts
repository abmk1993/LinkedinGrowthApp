import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAIProvider } from "@/lib/ai/getProvider";
import { generateAboutSection } from "@/lib/ai/agents/aboutGeneratorAgent";
import { AIProviderError } from "@/lib/ai/provider";

export async function POST() {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("profession, industry, experience_level, career_goal")
    .eq("id", user.id)
    .single();

  if (!profile?.profession || !profile?.industry) {
    return NextResponse.json(
      { error: "Complete /onboarding/profile before generating an About section" },
      { status: 400 }
    );
  }

  const [{ data: skillRows }, { data: interestRows }, { data: positioning }] = await Promise.all([
    supabase.from("skills").select("name").eq("profile_id", user.id),
    supabase.from("interests").select("name").eq("profile_id", user.id),
    supabase
      .from("positioning")
      .select("pillars, content_style")
      .eq("profile_id", user.id)
      .maybeSingle(),
  ]);

  try {
    const draft = await generateAboutSection(getAIProvider(), {
      profession: profile.profession,
      industry: profile.industry,
      experienceLevel: profile.experience_level ?? "",
      skills: (skillRows ?? []).map((s) => s.name),
      interests: (interestRows ?? []).map((i) => i.name),
      careerGoal: profile.career_goal ?? "",
      pillars: positioning?.pillars ?? undefined,
      contentStyle: positioning?.content_style ?? undefined,
    });

    const { data: snapshot, error: snapshotError } = await supabase
      .from("profile_snapshots")
      .insert({ profile_id: user.id, screenshot_urls: [] })
      .select("id")
      .single();
    if (snapshotError || !snapshot) {
      return NextResponse.json(
        { error: snapshotError?.message ?? "Failed to save generated draft" },
        { status: 500 }
      );
    }

    const { data: item, error: itemError } = await supabase
      .from("profile_audit_items")
      .insert({
        profile_snapshot_id: snapshot.id,
        section: "about",
        critique:
          "Drafted from your profile — read it over, edit anything that doesn't sound like you, then accept.",
        suggested_rewrite: draft.about,
        status: "pending",
      })
      .select()
      .single();
    if (itemError || !item) {
      return NextResponse.json(
        { error: itemError?.message ?? "Failed to save generated draft" },
        { status: 500 }
      );
    }

    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    if (err instanceof AIProviderError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    throw err;
  }
}
