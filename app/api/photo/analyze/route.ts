import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAIProvider } from "@/lib/ai/getProvider";
import { auditPhoto } from "@/lib/ai/agents/photoAuditAgent";
import { uploadPhoto } from "@/lib/supabase/storage";
import { AIProviderError } from "@/lib/ai/provider";

const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("photo");
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "Missing 'photo' file in form data" },
      { status: 400 }
    );
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: `Unsupported file type: ${file.type}. Use JPEG, PNG, or WebP.` },
      { status: 400 }
    );
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File too large (max 8MB)" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("industry")
    .eq("id", user.id)
    .single();

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const mediaType = file.type as "image/jpeg" | "image/png" | "image/webp";

  try {
    const audit = await auditPhoto(
      getAIProvider(),
      { base64: buffer.toString("base64"), mediaType },
      profile?.industry ?? "general"
    );

    const originalPath = await uploadPhoto(supabase, user.id, "original", buffer, file.type);

    const { data: photoRow, error: insertError } = await supabase
      .from("profile_photos")
      .insert({
        profile_id: user.id,
        original_url: originalPath,
        score: audit.score,
        critique: audit.critique,
        issues: audit.issues,
        status: "pending",
      })
      .select()
      .single();
    if (insertError || !photoRow) {
      return NextResponse.json(
        { error: insertError?.message ?? "Failed to save photo record" },
        { status: 500 }
      );
    }

    return NextResponse.json(photoRow, { status: 201 });
  } catch (err) {
    if (err instanceof AIProviderError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    throw err;
  }
}
