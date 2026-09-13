"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { inputClassName } from "@/components/ui/Field";

interface Post {
  id: string;
  hooks: string[] | null;
  selected_hook: string | null;
  body: string | null;
  cta: string | null;
  hashtags: string[] | null;
  status: "draft" | "approved" | "published";
}

const MODIFIERS = [
  { value: "shorten", label: "Shorten" },
  { value: "more_technical", label: "More technical" },
  { value: "more_personal", label: "More personal" },
  { value: "more_educational", label: "More educational" },
] as const;

export default function PostEditorPage() {
  const params = useParams<{ postId: string }>();
  const router = useRouter();

  const [post, setPost] = useState<Post | null>(null);
  const [body, setBody] = useState("");
  const [cta, setCta] = useState("");
  const [selectedHook, setSelectedHook] = useState("");

  const [isRegenerating, setIsRegenerating] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/posts/${params.postId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Post | null) => {
        if (!data) return;
        setPost(data);
        setBody(data.body ?? "");
        setCta(data.cta ?? "");
        setSelectedHook(data.selected_hook ?? data.hooks?.[0] ?? "");
      });
  }, [params.postId]);

  async function saveEdits() {
    setError(null);
    setIsSaving(true);

    const res = await fetch(`/api/posts/${params.postId}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body, cta, selectedHook }),
    });
    setIsSaving(false);

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ error: "Something went wrong." }));
      setError(errBody.error ?? "Something went wrong saving your edits.");
      return false;
    }
    return true;
  }

  async function handleRegenerate(modifier: (typeof MODIFIERS)[number]["value"]) {
    setError(null);
    setIsRegenerating(modifier);

    const res = await fetch(`/api/posts/${params.postId}/regenerate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ modifier }),
    });
    setIsRegenerating(null);

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ error: "Something went wrong." }));
      setError(errBody.error ?? "Something went wrong regenerating.");
      return;
    }

    const updated: Post = await res.json();
    setPost(updated);
    setBody(updated.body ?? "");
    setCta(updated.cta ?? "");
    setSelectedHook(updated.selected_hook ?? updated.hooks?.[0] ?? "");
  }

  async function handleApproveAndContinue() {
    const saved = await saveEdits();
    if (!saved) return;

    setIsApproving(true);
    const res = await fetch(`/api/posts/${params.postId}/approve`, { method: "POST" });
    setIsApproving(false);

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ error: "Something went wrong." }));
      setError(errBody.error ?? "Something went wrong approving this post.");
      return;
    }

    router.push(`/posts/${params.postId}/publish`);
  }

  if (!post) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <p className="text-ink-500">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-display text-3xl text-ink-900">Edit your post</h1>

      {post.hooks && post.hooks.length > 0 && (
        <div className="mt-6">
          <p className="text-sm font-medium text-ink-900">Hook</p>
          <div className="mt-2 space-y-2">
            {post.hooks.map((hook) => (
              <button
                key={hook}
                type="button"
                onClick={() => setSelectedHook(hook)}
                className={`block w-full rounded-card border p-3 text-left text-sm transition-colors ${
                  selectedHook === hook
                    ? "border-brass-500 bg-brass-100"
                    : "border-ink-100 hover:border-ink-300"
                }`}
              >
                {hook}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        <p className="text-sm font-medium text-ink-900">Post body</p>
        <textarea
          rows={10}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className={`${inputClassName} mt-2`}
        />
      </div>

      <div className="mt-4">
        <p className="text-sm font-medium text-ink-900">Call to action</p>
        <input
          value={cta}
          onChange={(e) => setCta(e.target.value)}
          className={`${inputClassName} mt-2`}
        />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {MODIFIERS.map((m) => (
          <Button
            key={m.value}
            type="button"
            variant="secondary"
            isLoading={isRegenerating === m.value}
            disabled={isRegenerating !== null}
            onClick={() => handleRegenerate(m.value)}
          >
            {m.label}
          </Button>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-signal-bad">{error}</p>}

      <div className="mt-8 flex gap-3">
        <Button variant="ghost" isLoading={isSaving} onClick={saveEdits}>
          Save draft
        </Button>
        <Button isLoading={isApproving} onClick={handleApproveAndContinue}>
          Approve and continue
        </Button>
      </div>
    </main>
  );
}
