import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAIProvider } from "@/lib/ai/getProvider";
import { generatePositioning } from "@/lib/ai/agents/positioningAgent";
import { AIProviderError } from "@/lib/ai/provider";

export async function POST(_req: NextRequest) {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("profession, industry, experience_level, career_goal")
    .eq("id", user.id)
    .single();
  if (profileError || !profile) {
    return NextResponse.json(
      { error: "Profile not found — complete /onboarding/profile first" },
      { status: 400 }
    );
  }

  const [{ data: skills }, { data: interests }] = await Promise.all([
    supabase.from("skills").select("name").eq("profile_id", user.id),
    supabase.from("interests").select("name").eq("profile_id", user.id),
  ]);

  if (!profile.profession || !profile.industry || !profile.experience_level || !profile.career_goal) {
    return NextResponse.json(
      { error: "Profile is missing required fields" },
      { status: 400 }
    );
  }

  try {
    const positioning = await generatePositioning(getAIProvider(), {
      profession: profile.profession,
      industry: profile.industry,
      experienceLevel: profile.experience_level,
      careerGoal: profile.career_goal,
      skills: (skills ?? []).map((s) => s.name),
      interests: (interests ?? []).map((i) => i.name),
    });

    const { error: saveError } = await supabase.from("positioning").upsert({
      profile_id: user.id,
      pillars: positioning.pillars,
      content_style: positioning.content_style,
      target_audience: positioning.target_audience,
    });
    if (saveError) {
      return NextResponse.json({ error: saveError.message }, { status: 500 });
    }

    return NextResponse.json(positioning, { status: 200 });
  } catch (err) {
    if (err instanceof AIProviderError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    throw err;
  }
}
