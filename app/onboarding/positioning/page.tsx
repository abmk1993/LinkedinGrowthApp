"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, inputClassName } from "@/components/ui/Field";
import { TagInput } from "@/components/ui/TagInput";

export default function PositioningPage() {
  const router = useRouter();

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pillars, setPillars] = useState<string[]>([]);
  const [contentStyle, setContentStyle] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [hasGenerated, setHasGenerated] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasExistingGrowthPlan, setHasExistingGrowthPlan] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/positioning").then((res) => (res.ok ? res.json() : null)),
      fetch("/api/growth-plan").then((res) => (res.ok ? res.json() : null)),
    ]).then(([positioningBody, growthPlanBody]) => {
      const existing = positioningBody?.positioning;
      if (existing) {
        setPillars(existing.pillars ?? []);
        setContentStyle(existing.content_style ?? "");
        setTargetAudience(existing.target_audience ?? "");
        setHasGenerated(true);
      }
      setHasExistingGrowthPlan(Boolean(growthPlanBody?.plan));
      setIsLoaded(true);
    });
  }, []);

  async function handleGenerate() {
    setError(null);
    setIsGenerating(true);

    const res = await fetch("/api/positioning/generate", { method: "POST" });
    setIsGenerating(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: "Something went wrong." }));
      setError(body.error ?? "Something went wrong generating your positioning.");
      return;
    }

    const body = await res.json();
    setPillars(body.pillars);
    setContentStyle(body.content_style);
    setTargetAudience(body.target_audience);
    setHasGenerated(true);
  }

  async function handleSaveAndContinue() {
    setError(null);

    if (pillars.length < 3 || pillars.length > 5) {
      setError("Add 3 to 5 pillars — they guide what the research agent looks for.");
      return;
    }
    if (!contentStyle.trim() || !targetAudience.trim()) {
      setError("Content style and target audience can't be empty.");
      return;
    }

    setIsSaving(true);
    const res = await fetch("/api/positioning", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pillars, contentStyle, targetAudience }),
    });
    setIsSaving(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: "Something went wrong." }));
      setError(body.error ?? "Something went wrong saving your positioning.");
      return;
    }

    // Fresh onboarding still needs the growth-plan step; a revisit from
    // Settings (growth plan already set) should go straight back to
    // where research can actually be run.
    router.push(hasExistingGrowthPlan ? "/dashboard" : "/onboarding/growth-plan");
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/onboarding/photo" className="text-sm font-medium text-ink-500 hover:text-ink-900">
        ← Back
      </Link>
      <p className="mt-4 text-sm font-medium text-brass-600">Phase 1 · Step 4 of 5</p>
      <h1 className="mt-2 font-display text-3xl text-ink-900">Your content pillars</h1>
      <p className="mt-2 max-w-prose text-ink-700">
        A few themes to anchor what you post about — specific enough to guide the
        research agent, not just &quot;testing&quot; or &quot;tech.&quot;
      </p>

      {!isLoaded ? (
        <p className="mt-8 text-ink-500">Loading…</p>
      ) : !hasGenerated ? (
        <Button className="mt-8" isLoading={isGenerating} onClick={handleGenerate}>
          Generate my pillars
        </Button>
      ) : (
        <div className="mt-8 space-y-6">
          <Field label="Content pillars" htmlFor="pillars" hint="3 to 5 pillars">
            <TagInput value={pillars} onChange={setPillars} maxTags={5} />
          </Field>

          <Field
            label="Content style"
            htmlFor="contentStyle"
            hint='How your posts should sound — e.g. "practical, first-person, example-driven"'
          >
            <input
              id="contentStyle"
              value={contentStyle}
              onChange={(e) => setContentStyle(e.target.value)}
              placeholder="practical, first-person, example-driven"
              className={inputClassName}
            />
          </Field>

          <Field
            label="Target audience"
            htmlFor="targetAudience"
            hint='Who you want reading these posts — e.g. "Mid-level QA engineers exploring AI-assisted testing"'
          >
            <input
              id="targetAudience"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="Mid-level QA engineers exploring AI-assisted testing"
              className={inputClassName}
            />
          </Field>

          {error && <p className="text-sm text-signal-bad">{error}</p>}

          <div className="flex items-center gap-3">
            <Button isLoading={isSaving} onClick={handleSaveAndContinue}>
              Save and continue
            </Button>
            <Button variant="secondary" isLoading={isGenerating} onClick={handleGenerate}>
              Regenerate from scratch
            </Button>
          </div>
        </div>
      )}

      {error && !hasGenerated && <p className="mt-3 text-sm text-signal-bad">{error}</p>}
    </main>
  );
}
