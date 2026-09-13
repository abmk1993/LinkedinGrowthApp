"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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

const CATEGORY_LABELS: Record<ResearchItem["category"], string> = {
  update: "Industry update",
  trend: "Trend",
  post_opportunity: "Post opportunity",
};

export default function ResearchListPage() {
  const [items, setItems] = useState<ResearchItem[] | null>(null);

  useEffect(() => {
    fetch("/api/research/latest")
      .then((res) => res.json())
      .then((data) => setItems(data.items ?? []));
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-display text-3xl text-ink-900">Today&apos;s research</h1>

      {items === null ? (
        <p className="mt-6 text-ink-500">Loading…</p>
      ) : items.length === 0 ? (
        <p className="mt-6 text-ink-500">
          No research yet — run it from the{" "}
          <Link href="/dashboard" className="text-brass-600 hover:underline">
            dashboard
          </Link>
          .
        </p>
      ) : (
        <div className="mt-8 space-y-4">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/research/${item.id}`}
              className="block rounded-card border border-ink-100 p-5 transition-colors hover:border-brass-500"
            >
              <span className="text-xs font-medium uppercase tracking-wide text-brass-600">
                {CATEGORY_LABELS[item.category]}
              </span>
              <h2 className="mt-1 font-display text-lg text-ink-900">{item.topic}</h2>
              <p className="mt-2 text-sm text-ink-700">{item.why_it_matters}</p>
              <p className="mt-2 text-xs text-ink-500">Source: {item.source_name}</p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
