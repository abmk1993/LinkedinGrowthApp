"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { inputClassName } from "@/components/ui/Field";
import { TagInput } from "@/components/ui/TagInput";
import { LinkedInPreview } from "@/components/posts/LinkedInPreview";

interface Post {
  id: string;
  hooks: string[] | null;
  selected_hook: string | null;
  body: string | null;
  cta: string | null;
  hashtags: string[] | null;
  status: "draft" | "approved" | "published";
}

interface EditableState {
  body: string;
  cta: string;
  hashtags: string[];
  selectedHook: string;
  hooks: string[] | null;
}

const MODIFIERS = [
  { value: "shorten", label: "Shorten" },
  { value: "more_technical", label: "More technical" },
  { value: "more_personal", label: "More personal" },
  { value: "more_educational", label: "More educational" },
] as const;

const MAX_BODY_LENGTH = 3000;

function toState(post: Post): EditableState {
  return {
    body: post.body ?? "",
    cta: post.cta ?? "",
    hashtags: post.hashtags ?? [],
    selectedHook: post.selected_hook ?? post.hooks?.[0] ?? "",
    hooks: post.hooks,
  };
}

export default function PostEditorPage() {
  const params = useParams<{ postId: string }>();
  const router = useRouter();

  const [post, setPost] = useState<Post | null>(null);
  const [state, setState] = useState<EditableState | null>(null);
  const [history, setHistory] = useState<EditableState[]>([]);

  const [isRegenerating, setIsRegenerating] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/posts/${params.postId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Post | null) => {
        if (!data) return;
        setPost(data);
        setState(toState(data));
      });
  }, [params.postId]);

  async function persist(next: EditableState) {
    const res = await fetch(`/api/posts/${params.postId}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        body: next.body,
        cta: next.cta,
        hashtags: next.hashtags,
        selectedHook: next.selectedHook,
        hooks: next.hooks ?? undefined,
      }),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ error: "Something went wrong." }));
      throw new Error(errBody.error ?? "Something went wrong saving your edits.");
    }
    return (await res.json()) as Post;
  }

  async function saveEdits() {
    if (!state) return false;
    setError(null);
    setIsSaving(true);
    try {
      const updated = await persist(state);
      setPost(updated);
      setIsSaving(false);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong saving your edits.");
      setIsSaving(false);
      return false;
    }
  }

  async function handleRegenerate(modifier: (typeof MODIFIERS)[number]["value"]) {
    if (!state) return;
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
    // Keep the version being replaced so it can be restored — regenerate
    // overwrites body/cta/hooks/hashtags entirely, with no other way back
    // to a version the user liked better.
    setHistory((prev) => [...prev, state].slice(-5));
    setPost(updated);
    setState(toState(updated));
  }

  async function handleUndo() {
    const previous = history[history.length - 1];
    if (!previous) return;

    setError(null);
    setIsUndoing(true);
    try {
      const updated = await persist(previous);
      setPost(updated);
      setState(toState(updated));
      setHistory((prev) => prev.slice(0, -1));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong restoring that version.");
    } finally {
      setIsUndoing(false);
    }
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

  if (!post || !state) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <p className="text-ink-500">Loading…</p>
      </main>
    );
  }

  const bodyLength = state.body.length;
  const overLimit = bodyLength > MAX_BODY_LENGTH;

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-display text-3xl text-ink-900">Edit your post</h1>

      {state.hooks && state.hooks.length > 0 && (
        <div className="mt-6">
          <p className="text-sm font-medium text-ink-900">Hook</p>
          <div className="mt-2 space-y-2">
            {state.hooks.map((hook) => (
              <button
                key={hook}
                type="button"
                onClick={() => setState((prev) => (prev ? { ...prev, selectedHook: hook } : prev))}
                className={`block w-full rounded-card border p-3 text-left text-sm transition-colors ${
                  state.selectedHook === hook
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
          value={state.body}
          onChange={(e) => setState((prev) => (prev ? { ...prev, body: e.target.value } : prev))}
          className={`${inputClassName} mt-2`}
        />
        <p className={`mt-1 text-xs ${overLimit ? "text-signal-bad" : "text-ink-500"}`}>
          {bodyLength.toLocaleString()} / {MAX_BODY_LENGTH.toLocaleString()} characters
          {overLimit && " — over LinkedIn's limit"}
        </p>
      </div>

      <div className="mt-4">
        <p className="text-sm font-medium text-ink-900">Call to action</p>
        <input
          value={state.cta}
          onChange={(e) => setState((prev) => (prev ? { ...prev, cta: e.target.value } : prev))}
          className={`${inputClassName} mt-2`}
        />
      </div>

      <div className="mt-4">
        <p className="text-sm font-medium text-ink-900">Hashtags</p>
        <div className="mt-2">
          <TagInput
            value={state.hashtags}
            onChange={(next) => setState((prev) => (prev ? { ...prev, hashtags: next } : prev))}
            placeholder="Add a hashtag"
            maxTags={8}
          />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
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
        {history.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            isLoading={isUndoing}
            disabled={isRegenerating !== null}
            onClick={handleUndo}
          >
            Undo last regenerate
          </Button>
        )}
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

      <div className="mt-10 border-t border-ink-100 pt-8">
        <p className="text-sm font-medium text-ink-900">Preview</p>
        <p className="mt-1 text-xs text-ink-500">Approximately how this will look in the feed.</p>
        <div className="mt-3">
          <LinkedInPreview body={state.body} cta={state.cta} hashtags={state.hashtags} />
        </div>
      </div>
    </main>
  );
}
