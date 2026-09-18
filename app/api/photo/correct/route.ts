import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { downloadPhoto, uploadPhoto } from "@/lib/supabase/storage";
import { correctPhoto, SHARP_CORRECTABLE_ISSUES } from "@/lib/photo/correct";
import { replaceAttire } from "@/lib/photo/attire";
import { getGeminiImageProvider } from "@/lib/ai/geminiImageProvider";
import { NOT_A_PHOTO_ISSUE, PHOTO_ISSUES } from "@/lib/ai/agents/photoAuditAgent";
import { AIProviderError } from "@/lib/ai/provider";

const RequestSchema = z.object({ photoId: z.string().uuid() });

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = RequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { data: photoRow, error: fetchError } = await supabase
    .from("profile_photos")
    .select("id, original_url, issues, profile_id")
    .eq("id", parsed.data.photoId)
    .single();
  if (fetchError || !photoRow) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  if ((photoRow.issues as string[]).includes(NOT_A_PHOTO_ISSUE)) {
    return NextResponse.json(
      {
        error:
          "This doesn't look like a real photo of you, so it can't be corrected — upload an actual photo instead.",
      },
      { status: 400 }
    );
  }

  const issues = (photoRow.issues as string[]).filter(
    (i): i is (typeof PHOTO_ISSUES)[number] =>
      (PHOTO_ISSUES as readonly string[]).includes(i)
  );

  const sharpIssues = issues.filter((i) =>
    (SHARP_CORRECTABLE_ISSUES as readonly string[]).includes(i)
  );
  const imageEditor = issues.includes("attire") ? getGeminiImageProvider() : null;

  if (sharpIssues.length === 0 && !imageEditor) {
    return NextResponse.json(
      {
        error: issues.includes("attire")
          ? "Attire is the only issue flagged, and attire correction needs GEMINI_API_KEY configured."
          : "This photo has no correctable issues — nothing to do",
      },
      { status: 400 }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("industry")
    .eq("id", user.id)
    .single();

  const originalBuffer = await downloadPhoto(supabase, photoRow.original_url);
  const originalMediaType = photoRow.original_url.endsWith(".png")
    ? ("image/png" as const)
    : ("image/jpeg" as const);

  try {
    // Attire first: the generative edit gets the untouched original,
    // and the cheap sharp passes then apply cleanly on top of its result.
    const attireCorrected = imageEditor
      ? await replaceAttire(
          imageEditor,
          originalBuffer,
          originalMediaType,
          profile?.industry ?? "general"
        )
      : originalBuffer;

    const correctedBuffer = await correctPhoto(attireCorrected, sharpIssues);
    const correctedPath = await uploadPhoto(
      supabase,
      user.id,
      "corrected",
      correctedBuffer,
      "image/jpeg"
    );

    const { data: updated, error: updateError } = await supabase
      .from("profile_photos")
      .update({ corrected_url: correctedPath, status: "corrected" })
      .eq("id", photoRow.id)
      .select()
      .single();
    if (updateError || !updated) {
      return NextResponse.json(
        { error: updateError?.message ?? "Failed to save corrected photo" },
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
