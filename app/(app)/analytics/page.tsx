"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { inputClassName } from "@/components/ui/Field";

interface Post {
  id: string;
  body: string | null;
  published_at: string | null;
}

interface Metrics {
  impressions: number | null;
  reactions: number | null;
  comments: number | null;
  shares: number | null;
}

function MetricsForm({ postId }: { postId: string }) {
  const [existing, setExisting] = useState<Metrics | null>(null);
  const [impressions, setImpressions] = useState("");
  const [reactions, setReactions] = useState("");
  const [comments, setComments] = useState("");
  const [shares, setShares] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/posts/${postId}/metrics`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.metrics) {
          setExisting(data.metrics);
          setImpressions(String(data.metrics.impressions ?? ""));
          setReactions(String(data.metrics.reactions ?? ""));
          setComments(String(data.metrics.comments ?? ""));
          setShares(String(data.metrics.shares ?? ""));
        }
      });
  }, [postId]);

  async function handleSave() {
    setIsSaving(true);
    setSaved(false);

    const toNumber = (v: string) => (v === "" ? undefined : Number(v));

    const res = await fetch(`/api/posts/${postId}/metrics`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        impressions: toNumber(impressions),
        reactions: toNumber(reactions),
        comments: toNumber(comments),
        shares: toNumber(shares),
      }),
    });
    setIsSaving(false);

    if (res.ok) setSaved(true);
  }

  return (
    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <input
        placeholder="Impressions"
        value={impressions}
        onChange={(e) => setImpressions(e.target.value)}
        className={`${inputClassName} text-sm`}
        inputMode="numeric"
      />
      <input
        placeholder="Reactions"
        value={reactions}
        onChange={(e) => setReactions(e.target.value)}
        className={`${inputClassName} text-sm`}
        inputMode="numeric"
      />
      <input
        placeholder="Comments"
        value={comments}
        onChange={(e) => setComments(e.target.value)}
        className={`${inputClassName} text-sm`}
        inputMode="numeric"
      />
      <input
        placeholder="Shares"
        value={shares}
        onChange={(e) => setShares(e.target.value)}
        className={`${inputClassName} text-sm`}
        inputMode="numeric"
      />
      <div className="col-span-2 flex items-center gap-3 sm:col-span-4">
        <Button variant="secondary" isLoading={isSaving} onClick={handleSave}>
          {existing ? "Update metrics" : "Save metrics"}
        </Button>
        {saved && <span className="text-sm text-signal-good">Saved</span>}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [posts, setPosts] = useState<Post[] | null>(null);

  useEffect(() => {
    fetch("/api/posts?status=published")
      .then((res) => res.json())
      .then((data) => setPosts(data.posts ?? []));
  }, []);

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-display text-3xl text-ink-900">Analytics</h1>
      <p className="mt-2 text-ink-700">
        Log how each published post performed — this feeds what the dashboard
        eventually learns about what works for you.
      </p>

      {posts === null ? (
        <p className="mt-6 text-ink-500">Loading…</p>
      ) : posts.length === 0 ? (
        <p className="mt-6 text-ink-500">No published posts yet.</p>
      ) : (
        <div className="mt-8 space-y-6">
          {posts.map((post) => (
            <div key={post.id} className="rounded-card border border-ink-100 p-5">
              <p className="line-clamp-2 text-sm text-ink-900">{post.body}</p>
              <p className="mt-1 text-xs text-ink-500">
                Published{" "}
                {post.published_at
                  ? new Date(post.published_at).toLocaleDateString()
                  : ""}
              </p>
              <MetricsForm postId={post.id} />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
