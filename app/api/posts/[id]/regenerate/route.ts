import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAIProvider } from "@/lib/ai/getProvider";
import { generatePost } from "@/lib/ai/agents/contentAgent";
import { RegeneratePostRequestSchema } from "@/lib/validation/requests";
import { AIProviderError } from "@/lib/ai/provider";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = RegeneratePostRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { data: existingPost, error: postError } = await supabase
    .from("posts")
    .select("research_item_id")
    .eq("id", params.id)
    .eq("profile_id", user.id)
    .single();
  if (postError || !existingPost?.research_item_id) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
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
        .eq("id", existingPost.research_item_id)
        .single(),
    ]);

  if (!profile?.profession || !profile.career_goal || !positioning?.pillars || !researchItem) {
    return NextResponse.json(
      { error: "Missing profile, positioning, or research context for this post" },
      { status: 400 }
    );
  }

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
      modifier: parsed.data.modifier,
    });

    const { data: updated, error: updateError } = await supabase
      .from("posts")
      .update({
        hooks: generated.hooks,
        selected_hook: generated.hooks[0],
        body: generated.body,
        cta: generated.cta,
        hashtags: generated.hashtags,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id)
      .select()
      .single();
    if (updateError || !updated) {
      return NextResponse.json(
        { error: updateError?.message ?? "Failed to save regenerated post" },
        { status: 500 }
      );
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (err) {
    if (err instanceof AIProviderError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    throw err;
  }
}
