"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

interface Post {
  id: string;
  body: string | null;
  cta: string | null;
  hashtags: string[] | null;
  status: "draft" | "approved" | "published";
}

export default function PublishPage() {
  const params = useParams<{ postId: string }>();
  const router = useRouter();

  const [post, setPost] = useState<Post | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const fullText = [post.body, post.cta, post.hashtags?.join(" ")]
    .filter(Boolean)
    .join("\n\n");

  async function handleCopy() {
    await navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

      <div className="mt-6 whitespace-pre-wrap rounded-card border border-ink-100 bg-paper-raised p-5 text-sm text-ink-900">
        {fullText}
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
    </main>
  );
}
