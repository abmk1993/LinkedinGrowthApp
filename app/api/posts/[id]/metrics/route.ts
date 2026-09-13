import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const MetricsSchema = z.object({
  impressions: z.number().int().min(0).optional(),
  reactions: z.number().int().min(0).optional(),
  comments: z.number().int().min(0).optional(),
  shares: z.number().int().min(0).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id")
    .eq("id", params.id)
    .eq("profile_id", user.id)
    .single();
  if (postError || !post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const { data: metrics, error } = await supabase
    .from("post_metrics")
    .select("*")
    .eq("post_id", post.id)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ metrics: metrics ?? null }, { status: 200 });
}

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
  const parsed = MetricsSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Ownership check — post_metrics has no profile_id directly (RLS
  // enforces this via the posts join), but we verify explicitly here
  // too so a bad post id fails with a clear 404, not a confusing RLS
  // rejection surfaced as a generic insert error.
  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id")
    .eq("id", params.id)
    .eq("profile_id", user.id)
    .single();
  if (postError || !post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const { data: metrics, error: insertError } = await supabase
    .from("post_metrics")
    .insert({
      post_id: post.id,
      impressions: parsed.data.impressions ?? null,
      reactions: parsed.data.reactions ?? null,
      comments: parsed.data.comments ?? null,
      shares: parsed.data.shares ?? null,
    })
    .select()
    .single();
  if (insertError || !metrics) {
    return NextResponse.json(
      { error: insertError?.message ?? "Failed to save metrics" },
      { status: 500 }
    );
  }

  return NextResponse.json(metrics, { status: 201 });
}
