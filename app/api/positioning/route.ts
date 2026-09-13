import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const UpdatePositioningSchema = z.object({
  pillars: z.array(z.string().min(1)).min(3).max(5),
  contentStyle: z.string().min(1),
  targetAudience: z.string().min(1),
});

export async function GET(_req: NextRequest) {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: positioning, error } = await supabase
    .from("positioning")
    .select("pillars, content_style, target_audience")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ positioning: positioning ?? null }, { status: 200 });
}

export async function PUT(req: NextRequest) {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = UpdatePositioningSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("positioning")
    .upsert(
      {
        profile_id: user.id,
        pillars: parsed.data.pillars,
        content_style: parsed.data.contentStyle,
        target_audience: parsed.data.targetAudience,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "profile_id" }
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true }, { status: 200 });
}
