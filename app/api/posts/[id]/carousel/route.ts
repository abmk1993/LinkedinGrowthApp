import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAIProvider } from "@/lib/ai/getProvider";
import { generateCarousel } from "@/lib/ai/agents/carouselAgent";
import { generateCarouselPdf, CAROUSEL_THEMES } from "@/lib/carousel/generate";
import { AIProviderError } from "@/lib/ai/provider";

const RequestSchema = z.object({ theme: z.enum(CAROUSEL_THEMES).default("ink") });

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

  const json = await req.json().catch(() => ({}));
  const parsed = RequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("selected_hook, hooks, body, cta")
    .eq("id", params.id)
    .eq("profile_id", user.id)
    .single();
  if (postError || !post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const hook = post.selected_hook ?? post.hooks?.[0];
  if (!hook || !post.body) {
    return NextResponse.json(
      { error: "This post needs a hook and body before it can become a carousel" },
      { status: 400 }
    );
  }

  try {
    const carousel = await generateCarousel(getAIProvider(), {
      hook,
      body: post.body,
      cta: post.cta ?? "",
    });

    const pdfBuffer = await generateCarouselPdf(carousel, parsed.data.theme);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="linkedin-carousel-${params.id}.pdf"`,
      },
    });
  } catch (err) {
    if (err instanceof AIProviderError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    throw err;
  }
}
