import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAIProvider } from "@/lib/ai/getProvider";
import {
  auditProfileFromImages,
  auditProfileFromText,
  ProfileAudit,
  ProfileAuditImage,
} from "@/lib/ai/agents/profileAuditAgent";
import { ProfileAuditTextRequestSchema } from "@/lib/validation/requests";
import { deleteScreenshots, uploadScreenshot } from "@/lib/supabase/storage";
import { AIProviderError } from "@/lib/ai/provider";

const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8MB
const MAX_SCREENSHOTS = 6;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // One endpoint, two input modes — a single multipart form carries
  // either screenshot files or pasted text fields, never both, so the
  // client doesn't need to know two different URLs for one action.
  const formData = await req.formData().catch(() => null);
  const files = (formData?.getAll("screenshots") ?? []).filter(
    (f): f is File => f instanceof File
  );
  const textFields = {
    headline: formData?.get("headline")?.toString().trim() || undefined,
    about: formData?.get("about")?.toString().trim() || undefined,
    experience: formData?.get("experience")?.toString().trim() || undefined,
  };
  const hasText = Boolean(textFields.headline || textFields.about || textFields.experience);
  const hasFiles = files.length > 0;

  if (hasFiles && hasText) {
    return NextResponse.json(
      { error: "Use either screenshots or pasted text, not both" },
      { status: 400 }
    );
  }
  if (!hasFiles && !hasText) {
    return NextResponse.json(
      { error: "Upload at least one screenshot or paste at least one section" },
      { status: 400 }
    );
  }
  if (files.length > MAX_SCREENSHOTS) {
    return NextResponse.json(
      { error: `Too many screenshots — max ${MAX_SCREENSHOTS}` },
      { status: 400 }
    );
  }
  for (const file of files) {
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}. Use JPEG, PNG, or WebP.` },
        { status: 400 }
      );
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: "Each screenshot must be 8MB or smaller" },
        { status: 400 }
      );
    }
  }
  if (hasText) {
    const parsed = ProfileAuditTextRequestSchema.safeParse(textFields);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("profession, industry, career_goal")
    .eq("id", user.id)
    .single();
  if (profileError || !profile?.profession || !profile.industry || !profile.career_goal) {
    return NextResponse.json(
      { error: "Complete /onboarding/profile before running the profile audit" },
      { status: 400 }
    );
  }

  const { data: skills } = await supabase
    .from("skills")
    .select("name")
    .eq("profile_id", user.id);

  const baseInput = {
    profession: profile.profession,
    industry: profile.industry,
    careerGoal: profile.career_goal,
    skills: (skills ?? []).map((s) => s.name),
  };

  // Read each screenshot's bytes exactly once, up front — both the AI
  // call and the storage upload need them.
  const screenshots = hasFiles
    ? await Promise.all(
        files.map(async (file) => ({
          file,
          buffer: Buffer.from(await file.arrayBuffer()),
        }))
      )
    : [];

  try {
    let audit: ProfileAudit;
    if (hasText) {
      audit = await auditProfileFromText(getAIProvider(), { ...baseInput, ...textFields });
    } else {
      const images: ProfileAuditImage[] = screenshots.map(({ file, buffer }) => ({
        base64: buffer.toString("base64"),
        mediaType: file.type as ProfileAuditImage["mediaType"],
      }));
      audit = await auditProfileFromImages(getAIProvider(), { ...baseInput, images });
    }

    const screenshotUrls = await Promise.all(
      screenshots.map(({ file, buffer }, i) =>
        uploadScreenshot(supabase, user.id, i, buffer, file.type)
      )
    );

    const bySection = new Map(audit.sections.map((s) => [s.section, s.original_text]));

    const { data: snapshot, error: snapshotError } = await supabase
      .from("profile_snapshots")
      .insert({
        profile_id: user.id,
        headline_raw: textFields.headline ?? bySection.get("headline") ?? null,
        about_raw: textFields.about ?? bySection.get("about") ?? null,
        experience_raw: textFields.experience ?? bySection.get("experience") ?? null,
        screenshot_urls: screenshotUrls,
      })
      .select("id")
      .single();
    if (snapshotError || !snapshot) {
      await deleteScreenshots(supabase, screenshotUrls);
      return NextResponse.json(
        { error: snapshotError?.message ?? "Failed to save profile snapshot" },
        { status: 500 }
      );
    }

    const rows = audit.sections.map((s) => ({
      profile_snapshot_id: snapshot.id,
      section: s.section,
      critique: s.critique,
      suggested_rewrite: s.suggested_rewrite,
      score: s.score,
      status: "pending" as const,
    }));

    const { data: inserted, error: insertError } = await supabase
      .from("profile_audit_items")
      .insert(rows)
      .select("id, section, critique, suggested_rewrite, score, status");
    if (insertError) {
      await deleteScreenshots(supabase, screenshotUrls);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ snapshotId: snapshot.id, items: inserted }, { status: 200 });
  } catch (err) {
    if (err instanceof AIProviderError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    throw err;
  }
}
