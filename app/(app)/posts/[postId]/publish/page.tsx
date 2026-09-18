"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { LinkedInPreview } from "@/components/posts/LinkedInPreview";
import { PlaceholderWarning } from "@/components/posts/PlaceholderWarning";
import { composePostText } from "@/lib/posts/composePost";

interface Post {
  id: string;
  hooks: string[] | null;
  selected_hook: string | null;
  body: string | null;
  cta: string | null;
  hashtags: string[] | null;
  status: "draft" | "approved" | "published";
}

const CAROUSEL_THEME_OPTIONS = [
  { value: "ink", label: "Ink" },
  { value: "paper", label: "Paper" },
  { value: "brass", label: "Brass" },
] as const;

export default function PublishPage() {
  const params = useParams<{ postId: string }>();
  const router = useRouter();

  const [post, setPost] = useState<Post | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [carouselTheme, setCarouselTheme] = useState<(typeof CAROUSEL_THEME_OPTIONS)[number]["value"]>(
    "ink"
  );
  const [isGeneratingCarousel, setIsGeneratingCarousel] = useState(false);
  const [carouselError, setCarouselError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/posts/${params.postId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then(setPost);
  }, [params.postId]);

  if (!post) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <p className="text-ink-500">Loading…</p>
      </main>
    );
  }

  const fullText = composePostText({
    hook: post.selected_hook ?? post.hooks?.[0],
    body: post.body,
    cta: post.cta,
    hashtags: post.hashtags,
  });

  async function handleCopy() {
    await navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDownloadCarousel() {
    setCarouselError(null);
    setIsGeneratingCarousel(true);

    const res = await fetch(`/api/posts/${params.postId}/carousel`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ theme: carouselTheme }),
    });
    setIsGeneratingCarousel(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: "Something went wrong." }));
      setCarouselError(body.error ?? "Something went wrong generating the carousel.");
      return;
    }

    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = "linkedin-carousel.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  }

  async function handleMarkPublished() {
    setError(null);
    setIsPublishing(true);

    const res = await fetch(`/api/posts/${params.postId}/publish`, { method: "POST" });
    setIsPublishing(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: "Something went wrong." }));
      setError(body.error ?? "Something went wrong marking this published.");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-display text-3xl text-ink-900">Ready to publish</h1>
      <p className="mt-2 text-ink-700">
        Copy this to LinkedIn yourself, then come back and mark it published.
      </p>

      <PlaceholderWarning text={fullText} className="mt-6" />

      <div
        data-testid="post-text"
        className="mt-6 whitespace-pre-wrap rounded-card border border-ink-100 bg-paper-raised p-5 text-sm text-ink-900">
        {fullText}
      </div>

      <div className="mt-6">
        <p className="text-sm font-medium text-ink-900">Preview</p>
        <p className="mt-1 text-xs text-ink-500">Approximately how this will look in the feed.</p>
        <div className="mt-3">
          <LinkedInPreview text={fullText} />
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-signal-bad">{error}</p>}

      <div className="mt-6 flex gap-3">
        <Button variant="secondary" onClick={handleCopy}>
          {copied ? "Copied" : "Copy to clipboard"}
        </Button>
        {post.status === "approved" ? (
          <Button isLoading={isPublishing} onClick={handleMarkPublished}>
            Mark as published
          </Button>
        ) : (
          <p className="self-center text-sm font-medium text-signal-good">
            Already marked published
          </p>
        )}
      </div>

      <div className="mt-10 border-t border-ink-100 pt-8">
        <h2 className="font-display text-xl text-ink-900">Turn this into a carousel</h2>
        <p className="mt-2 text-ink-700">
          Native document posts (swipeable slides) get meaningfully more dwell
          time than plain text — this breaks your post into slides and gives
          you a PDF ready to upload as a LinkedIn document post.
        </p>

        <div className="mt-4 flex gap-2">
          {CAROUSEL_THEME_OPTIONS.map((theme) => (
            <button
              key={theme.value}
              type="button"
              onClick={() => setCarouselTheme(theme.value)}
              className={`rounded-card border px-4 py-2 text-sm font-medium transition-colors ${
                carouselTheme === theme.value
                  ? "border-brass-500 bg-brass-100 text-ink-900"
                  : "border-ink-100 text-ink-700 hover:text-ink-900"
              }`}
            >
              {theme.label}
            </button>
          ))}
        </div>

        {carouselError && <p className="mt-3 text-sm text-signal-bad">{carouselError}</p>}

        <Button
          className="mt-4"
          variant="secondary"
          isLoading={isGeneratingCarousel}
          onClick={handleDownloadCarousel}
        >
          Download as carousel (PDF)
        </Button>
      </div>
    </main>
  );
}
