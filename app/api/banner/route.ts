import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateBanner, BANNER_THEMES } from "@/lib/banner/generate";
import { uploadBanner, getSignedBannerUrl, deleteBanners } from "@/lib/supabase/storage";

export async function GET() {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: banner } = await supabase
    .from("profile_banners")
    .select("*")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!banner) {
    return NextResponse.json({ banner: null }, { status: 200 });
  }

  try {
    const url = await getSignedBannerUrl(supabase, banner.storage_path);
    return NextResponse.json({ banner: { ...banner, url } }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load image" },
      { status: 500 }
    );
  }
}

const RequestSchema = z.object({ theme: z.enum(BANNER_THEMES) });

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("profession, industry")
    .eq("id", user.id)
    .single();

  if (!profile?.profession || !profile?.industry) {
    return NextResponse.json(
      { error: "Complete /onboarding/profile before generating a cover image" },
      { status: 400 }
    );
  }

  const { data: positioning } = await supabase
    .from("positioning")
    .select("pillars")
    .eq("profile_id", user.id)
    .maybeSingle();

  // Only the most recent banner is ever shown (see GET above) — capture
  // the old storage path so the orphaned file can be cleaned up once the
  // new one is safely saved. The DB row itself is upserted on the unique
  // profile_id constraint below (one row per profile), not inserted +
  // separately deleted — that used to be a read-old/insert-new/delete-old
  // sequence, which raced two concurrent generations into deleting each
  // other's rows; upsert makes the DB side atomic regardless.
  const { data: existingBanner } = await supabase
    .from("profile_banners")
    .select("storage_path")
    .eq("profile_id", user.id)
    .maybeSingle();

  try {
    const buffer = await generateBanner(
      {
        profession: profile.profession,
        industry: profile.industry,
        pillars: positioning?.pillars ?? [],
      },
      parsed.data.theme
    );

    const path = await uploadBanner(supabase, user.id, buffer);

    const { data: bannerRow, error: upsertError } = await supabase
      .from("profile_banners")
      .upsert(
        { profile_id: user.id, theme: parsed.data.theme, storage_path: path },
        { onConflict: "profile_id" }
      )
      .select()
      .single();
    if (upsertError || !bannerRow) {
      return NextResponse.json(
        { error: upsertError?.message ?? "Failed to save image" },
        { status: 500 }
      );
    }

    if (existingBanner && existingBanner.storage_path !== path) {
      await deleteBanners(supabase, [existingBanner.storage_path]);
    }

    const url = await getSignedBannerUrl(supabase, path);
    return NextResponse.json({ banner: { ...bannerRow, url } }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate image" },
      { status: 500 }
    );
  }
}
