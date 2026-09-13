"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

interface ResearchItem {
  id: string;
  topic: string;
  why_it_matters: string;
  why_you: string;
  suggested_angle: string;
  source_name: string;
  source_url: string;
  category: "update" | "trend" | "post_opportunity";
}

export default function ResearchItemDetailPage() {
  const params = useParams<{ itemId: string }>();
  const router = useRouter();

  const [item, setItem] = useState<ResearchItem | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/research/items/${params.itemId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then(setItem);
  }, [params.itemId]);

  async function handleGeneratePost() {
    setError(null);
    setIsGenerating(true);

    const res = await fetch("/api/posts/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ researchItemId: params.itemId }),
    });
    setIsGenerating(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: "Something went wrong." }));
      setError(body.error ?? "Something went wrong generating a post.");
      return;
    }

    const post = await res.json();
    router.push(`/posts/${post.id}/edit`);
  }

  if (!item) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <p className="text-ink-500">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-display text-3xl text-ink-900">{item.topic}</h1>

      <div className="mt-6 space-y-4 text-ink-700">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
            Why it matters
          </p>
          <p className="mt-1">{item.why_it_matters}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
            Why you
          </p>
          <p className="mt-1">{item.why_you}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
            Suggested angle
          </p>
          <p className="mt-1">{item.suggested_angle}</p>
        </div>
        <a
          href={item.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-sm text-brass-600 hover:underline"
        >
          Source: {item.source_name}
        </a>
      </div>

      {error && <p className="mt-4 text-sm text-signal-bad">{error}</p>}

      <Button className="mt-8" isLoading={isGenerating} onClick={handleGeneratePost}>
        Generate post
      </Button>
    </main>
  );
}
