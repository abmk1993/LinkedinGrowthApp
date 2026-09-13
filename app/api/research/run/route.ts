import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAIProvider } from "@/lib/ai/getProvider";
import { getSearchProvider } from "@/lib/search/getProvider";
import { runResearchPipeline } from "@/lib/research/pipeline";
import { AIProviderError } from "@/lib/ai/provider";
import { SearchProviderError } from "@/lib/search/provider";

export async function POST(_req: NextRequest) {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const [{ data: profile }, { data: positioning }, { data: skills }] = await Promise.all([
    supabase.from("profiles").select("profession, industry").eq("id", user.id).single(),
    supabase.from("positioning").select("pillars").eq("profile_id", user.id).single(),
    supabase.from("skills").select("name").eq("profile_id", user.id),
  ]);

  if (!profile?.profession || !profile.industry) {
    return NextResponse.json(
      { error: "Complete /onboarding/profile before running research" },
      { status: 400 }
    );
  }
  if (!positioning?.pillars?.length) {
    return NextResponse.json(
      { error: "Complete positioning before running research" },
      { status: 400 }
    );
  }

  const { data: run, error: runError } = await supabase
    .from("research_runs")
    .insert({ profile_id: user.id, status: "pending" })
    .select("id")
    .single();
  if (runError || !run) {
    return NextResponse.json(
      { error: runError?.message ?? "Failed to start research run" },
      { status: 500 }
    );
  }

  try {
    const items = await runResearchPipeline(getAIProvider(), getSearchProvider(), {
      profession: profile.profession,
      industry: profile.industry,
      pillars: positioning.pillars as string[],
      skills: (skills ?? []).map((s) => s.name),
    });

    if (items.length > 0) {
      const { error: itemsError } = await supabase.from("research_items").insert(
        items.map((item) => ({
          research_run_id: run.id,
          topic: item.topic,
          why_it_matters: item.why_it_matters,
          why_you: item.why_you,
          suggested_angle: item.suggested_angle,
          source_url: item.source_url,
          source_name: item.source_name,
          category: item.category,
        }))
      );
      if (itemsError) {
        await supabase
          .from("research_runs")
          .update({ status: "failed" })
          .eq("id", run.id);
        return NextResponse.json({ error: itemsError.message }, { status: 500 });
      }
    }

    await supabase.from("research_runs").update({ status: "completed" }).eq("id", run.id);

    return NextResponse.json({ runId: run.id, itemCount: items.length }, { status: 201 });
  } catch (err) {
    await supabase.from("research_runs").update({ status: "failed" }).eq("id", run.id);

    if (err instanceof AIProviderError || err instanceof SearchProviderError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    throw err;
  }
}
