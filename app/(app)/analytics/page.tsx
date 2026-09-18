"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { inputClassName } from "@/components/ui/Field";

interface Post {
  id: string;
  selected_hook: string | null;
  body: string | null;
  published_at: string | null;
}

const METRIC_FIELDS = [
  { key: "impressions", label: "Impressions" },
  { key: "reactions", label: "Reactions" },
  { key: "comments", label: "Comments" },
  { key: "shares", label: "Shares" },
] as const;

type MetricKey = (typeof METRIC_FIELDS)[number]["key"];
type MetricValues = Record<MetricKey, string>;

const EMPTY_VALUES: MetricValues = { impressions: "", reactions: "", comments: "", shares: "" };

function MetricsForm({ postId }: { postId: string }) {
  const [hasExisting, setHasExisting] = useState(false);
  const [values, setValues] = useState<MetricValues>(EMPTY_VALUES);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/posts/${postId}/metrics`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.metrics) return;
        setHasExisting(true);
        setValues({
          impressions: String(data.metrics.impressions ?? ""),
          reactions: String(data.metrics.reactions ?? ""),
          comments: String(data.metrics.comments ?? ""),
          shares: String(data.metrics.shares ?? ""),
        });
      });
  }, [postId]);

  async function handleSave() {
    setSaved(false);
    setError(null);

    const invalid = METRIC_FIELDS.filter(({ key }) => values[key] !== "" && !/^\d+$/.test(values[key].trim()));
    if (invalid.length > 0) {
      setError(
        `${invalid.map((f) => f.label).join(", ")} ${invalid.length === 1 ? "needs" : "need"} to be a whole number, 0 or more.`
      );
      return;
    }

    const toNumber = (v: string) => (v.trim() === "" ? undefined : Number(v.trim()));

    setIsSaving(true);
    const res = await fetch(`/api/posts/${postId}/metrics`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        impressions: toNumber(values.impressions),
        reactions: toNumber(values.reactions),
        comments: toNumber(values.comments),
        shares: toNumber(values.shares),
      }),
    }).catch(() => null);
    setIsSaving(false);

    if (!res?.ok) {
      const body = await res?.json().catch(() => null);
      setError(body?.error ?? "Couldn't save these metrics — please try again.");
      return;
    }
    setHasExisting(true);
    setSaved(true);
  }

  return (
    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {METRIC_FIELDS.map(({ key, label }) => (
        <label key={key} className="block">
          <span className="text-xs font-medium text-ink-500">{label}</span>
          <input
            value={values[key]}
            onChange={(e) => {
              const value = e.target.value;
              setValues((prev) => ({ ...prev, [key]: value }));
            }}
            className={`${inputClassName} mt-1 text-sm`}
            inputMode="numeric"
          />
        </label>
      ))}
      <div className="col-span-2 flex flex-wrap items-center gap-3 sm:col-span-4">
        <Button variant="secondary" isLoading={isSaving} onClick={handleSave}>
          {hasExisting ? "Update metrics" : "Save metrics"}
        </Button>
        {saved && <span className="text-sm text-signal-good">Saved</span>}
        {error && (
          <span className="text-sm text-signal-bad" role="alert">
            {error}
          </span>
        )}
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
              <p className="line-clamp-2 text-sm text-ink-900">
                {post.selected_hook ?? post.body}
              </p>
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
