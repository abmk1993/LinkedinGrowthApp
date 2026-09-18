import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GrowthPlanRequestSchema } from "@/lib/validation/requests";

export async function GET(_req: NextRequest) {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: plan, error } = await supabase
    .from("growth_plans")
    .select("cadence, created_at")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ plan: plan ?? null }, { status: 200 });
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
  const parsed = GrowthPlanRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("growth_plans").insert({
    profile_id: user.id,
    cadence: parsed.data.cadence,
  });
  if (error) {
    // 23514 = check violation: the database predates the 'none' cadence.
    if (error.code === "23514" && parsed.data.cadence === "none") {
      return NextResponse.json(
        {
          error:
            "\"No fixed schedule\" needs a one-time database update — run the growth_plans constraint change from supabase/schema.sql.",
        },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
