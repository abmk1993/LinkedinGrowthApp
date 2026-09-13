import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { UpsertProfileRequestSchema } from "@/lib/validation/requests";

export async function GET(_req: NextRequest) {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const [{ data: profile }, { data: skills }, { data: interests }] = await Promise.all([
    supabase
      .from("profiles")
      .select("profession, industry, experience_level, career_goal")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("skills").select("name").eq("profile_id", user.id),
    supabase.from("interests").select("name").eq("profile_id", user.id),
  ]);

  return NextResponse.json(
    {
      profession: profile?.profession ?? "",
      industry: profile?.industry ?? "",
      experienceLevel: profile?.experience_level ?? "",
      careerGoal: profile?.career_goal ?? "",
      skills: (skills ?? []).map((s) => s.name),
      interests: (interests ?? []).map((i) => i.name),
    },
    { status: 200 }
  );
}

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = UpsertProfileRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { profession, industry, experienceLevel, careerGoal, skills, interests } =
    parsed.data;

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: user.id,
    email: user.email ?? "",
    profession,
    industry,
    experience_level: experienceLevel,
    career_goal: careerGoal,
  });
  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  // Replace skills/interests wholesale — simpler and safer than diffing
  // for an MVP where these lists are short.
  const { error: deleteSkillsError } = await supabase
    .from("skills")
    .delete()
    .eq("profile_id", user.id);
  if (deleteSkillsError) {
    return NextResponse.json({ error: deleteSkillsError.message }, { status: 500 });
  }
  if (skills.length > 0) {
    const { error } = await supabase
      .from("skills")
      .insert(skills.map((name) => ({ profile_id: user.id, name })));
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { error: deleteInterestsError } = await supabase
    .from("interests")
    .delete()
    .eq("profile_id", user.id);
  if (deleteInterestsError) {
    return NextResponse.json({ error: deleteInterestsError.message }, { status: 500 });
  }
  if (interests.length > 0) {
    const { error } = await supabase
      .from("interests")
      .insert(interests.map((name) => ({ profile_id: user.id, name })));
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
