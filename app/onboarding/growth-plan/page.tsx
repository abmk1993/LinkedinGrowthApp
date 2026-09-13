"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

const CADENCE_OPTIONS = [
  { value: "daily", label: "Daily", hint: "A new post opportunity every day" },
  {
    value: "few_times_week",
    label: "A few times a week",
    hint: "A steady pace without daily pressure",
  },
  { value: "weekly", label: "Weekly", hint: "One well-considered post a week" },
] as const;

export default function GrowthPlanPage() {
  const router = useRouter();

  const [selected, setSelected] = useState<(typeof CADENCE_OPTIONS)[number]["value"] | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinue() {
    if (!selected) return;
    setError(null);
    setIsSaving(true);

    const res = await fetch("/api/growth-plan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cadence: selected }),
    });
    setIsSaving(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: "Something went wrong." }));
      setError(body.error ?? "Something went wrong saving your growth plan.");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-sm font-medium text-brass-600">Phase 1 · Step 5 of 5</p>
      <h1 className="mt-2 font-display text-3xl text-ink-900">
        How often do you want to post?
      </h1>
      <p className="mt-2 max-w-prose text-ink-700">
        This just shapes how the dashboard nudges you — nothing posts
        automatically. You can change this any time from the Posting page.
      </p>

      <div className="mt-8 space-y-3">
        {CADENCE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setSelected(option.value)}
            className={`w-full rounded-card border p-4 text-left transition-colors ${
              selected === option.value
                ? "border-brass-500 bg-brass-100"
                : "border-ink-100 hover:border-ink-300"
            }`}
          >
            <p className="font-medium text-ink-900">{option.label}</p>
            <p className="mt-0.5 text-sm text-ink-500">{option.hint}</p>
          </button>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-signal-bad">{error}</p>}

      <Button className="mt-6" disabled={!selected} isLoading={isSaving} onClick={handleContinue}>
        Start growing
      </Button>
    </main>
  );
}
