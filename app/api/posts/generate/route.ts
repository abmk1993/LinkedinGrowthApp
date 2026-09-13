import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAIProvider } from "@/lib/ai/getProvider";
import { generatePost } from "@/lib/ai/agents/contentAgent";
import { GeneratePostRequestSchema } from "@/lib/validation/requests";
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
  const parsed = GeneratePostRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const [{ data: profile }, { data: positioning }, { data: researchItem }] =
    await Promise.all([
      supabase.from("profiles").select("profession, career_goal").eq("id", user.id).single(),
      supabase
        .from("positioning")
        .select("pillars, content_style")
        .eq("profile_id", user.id)
        .single(),
      supabase
        .from("research_items")
        .select("topic, why_it_matters, why_you, suggested_angle")
        .eq("id", parsed.data.researchItemId)
        .single(),
    ]);

  if (!profile?.profession || !profile.career_goal) {
    return NextResponse.json(
      { error: "Complete /onboarding/profile first" },
      { status: 400 }
    );
  }
  if (!positioning?.pillars) {
    return NextResponse.json(
      { error: "Complete positioning before generating posts" },
      { status: 400 }
    );
  }
  if (!researchItem) {
    return NextResponse.json({ error: "Research item not found" }, { status: 404 });
  }

  // Give the model up to 3 of the user's own previously-approved posts
  // to match voice — see AI Prompts doc.
  const { data: previousPosts } = await supabase
    .from("posts")
    .select("body")
    .eq("profile_id", user.id)
    .in("status", ["approved", "published"])
    .order("updated_at", { ascending: false })
    .limit(3);

  try {
    const generated = await generatePost(getAIProvider(), {
      profession: profile.profession,
      pillars: positioning.pillars as string[],
      contentStyle: positioning.content_style ?? "practical, first-person",
      careerGoal: profile.career_goal,
      topic: researchItem.topic,
      whyItMatters: researchItem.why_it_matters ?? "",
      whyYou: researchItem.why_you ?? "",
      suggestedAngle: researchItem.suggested_angle ?? "",
      previousApprovedPosts: (previousPosts ?? [])
        .map((p) => p.body)
        .filter((b): b is string => Boolean(b)),
    });

    const { data: post, error: insertError } = await supabase
      .from("posts")
      .insert({
        profile_id: user.id,
        research_item_id: parsed.data.researchItemId,
        hooks: generated.hooks,
        selected_hook: generated.hooks[0],
        body: generated.body,
        cta: generated.cta,
        hashtags: generated.hashtags,
        status: "draft",
      })
      .select()
      .single();
    if (insertError || !post) {
      return NextResponse.json(
        { error: insertError?.message ?? "Failed to save post" },
        { status: 500 }
      );
    }

    return NextResponse.json(post, { status: 201 });
  } catch (err) {
    if (err instanceof AIProviderError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    throw err;
  }
}
