import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const UpdateAuditItemSchema = z.object({
  status: z.enum(["accepted", "edited", "rejected"]),
  // Required when status is "edited" — the user's own edited version.
  // For "accepted", finalText defaults to the AI's suggested_rewrite
  // (handled below, not required from the client).
  finalText: z.string().min(1).optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: { itemId: string } }
) {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = UpdateAuditItemSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (parsed.data.status === "edited" && !parsed.data.finalText) {
    return NextResponse.json(
      { error: "finalText is required when status is 'edited'" },
      { status: 400 }
    );
  }

  // Ownership check: profile_audit_items has no profile_id column
  // directly (it belongs to a profile_snapshot, which belongs to a
  // profile) — RLS enforces this at the DB level too, but we fetch
  // the current row first so we can default finalText to the AI's
  // own suggested_rewrite when the user accepts as-is.
  const { data: existing, error: fetchError } = await supabase
    .from("profile_audit_items")
    .select("id, suggested_rewrite")
    .eq("id", params.itemId)
    .single();
  if (fetchError || !existing) {
    return NextResponse.json({ error: "Audit item not found" }, { status: 404 });
  }

  const finalText =
    parsed.data.status === "rejected"
      ? null
      : (parsed.data.finalText ?? existing.suggested_rewrite);

  const { data: updated, error: updateError } = await supabase
    .from("profile_audit_items")
    .update({ status: parsed.data.status, final_text: finalText })
    .eq("id", params.itemId)
    .select()
    .single();
  if (updateError || !updated) {
    return NextResponse.json(
      { error: updateError?.message ?? "Failed to update audit item" },
      { status: 500 }
    );
  }

  return NextResponse.json(updated, { status: 200 });
}
