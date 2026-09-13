import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type PostUpdate = Database["public"]["Tables"]["posts"]["Update"];

const UpdatePostSchema = z.object({
  body: z.string().min(1).optional(),
  selectedHook: z.string().min(1).optional(),
  cta: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
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

  const { data: post, error } = await supabase
    .from("posts")
    .select("*")
    .eq("id", params.id)
    .eq("profile_id", user.id)
    .single();
  if (error || !post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  return NextResponse.json(post, { status: 200 });
}

export async function PUT(
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
  const parsed = UpdatePostSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const update: PostUpdate = { updated_at: new Date().toISOString() };
  if (parsed.data.body !== undefined) update.body = parsed.data.body;
  if (parsed.data.selectedHook !== undefined) update.selected_hook = parsed.data.selectedHook;
  if (parsed.data.cta !== undefined) update.cta = parsed.data.cta;
  if (parsed.data.hashtags !== undefined) update.hashtags = parsed.data.hashtags;

  const { data: updated, error } = await supabase
    .from("posts")
    .update(update)
    .eq("id", params.id)
    .eq("profile_id", user.id)
    .select()
    .single();
  if (error || !updated) {
    return NextResponse.json(
      { error: error?.message ?? "Post not found" },
      { status: error ? 500 : 404 }
    );
  }

  return NextResponse.json(updated, { status: 200 });
}
