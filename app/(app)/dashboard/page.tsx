"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

interface Summary {
  postsCreated: number;
  postsPublished: number;
  postsApproved: number;
  postsDraft: number;
}

const CADENCE_LABELS: Record<string, string> = {
  daily: "Daily",
  few_times_week: "A few times a week",
  weekly: "Weekly",
};

export default function DashboardPage() {
  const router = useRouter();

  const [summary, setSummary] = useState<Summary | null>(null);
  const [hasResearch, setHasResearch] = useState<boolean | null>(null);
  const [currentCadence, setCurrentCadence] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/analytics/summary")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setSummary(data));

    fetch("/api/research/latest")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setHasResearch(Boolean(data?.run)));

    fetch("/api/growth-plan")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setCurrentCadence(data?.plan?.cadence ?? null));
  }, []);

  async function handleRunResearch() {
    setError(null);
    setIsRunning(true);

    const res = await fetch("/api/research/run", { method: "POST" });
    setIsRunning(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: "Something went wrong." }));
      setError(body.error ?? "Something went wrong running research.");
      return;
    }

    router.push("/research");
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-display text-3xl text-ink-900">Posting</h1>
      <p className="mt-2 max-w-prose text-ink-700">
        Research, drafts, and what&apos;s gone out — everything about keeping a
        steady posting rhythm.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Posts created", value: summary?.postsCreated },
          { label: "Drafts", value: summary?.postsDraft },
          { label: "Approved", value: summary?.postsApproved },
          { label: "Published", value: summary?.postsPublished },
        ].map((stat) => (
          <div key={stat.label} className="rounded-card border border-ink-100 p-4">
            <p className="text-2xl font-semibold text-ink-900">
              {stat.value ?? "—"}
            </p>
            <p className="mt-1 text-sm text-ink-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-card border border-ink-100 p-6">
        <h2 className="font-display text-xl text-ink-900">
          {hasResearch ? "Ready for more research" : "Run your first research"}
        </h2>
        <p className="mt-2 max-w-prose text-ink-700">
          Pulls current developments in your field and turns them into post
          opportunities you can act on.
        </p>

        {error && (
          <p className="mt-3 text-sm text-signal-bad">
            {error}
            {error.includes("positioning") && (
              <>
                {" — "}
                <Link href="/onboarding/positioning" className="underline">
                  set it up here
                </Link>
              </>
            )}
            {error.includes("/onboarding/profile") && (
              <>
                {" — "}
                <Link href="/onboarding/profile" className="underline">
                  set it up here
                </Link>
              </>
            )}
          </p>
        )}

        <div className="mt-4 flex gap-3">
          <Button isLoading={isRunning} onClick={handleRunResearch}>
            Run research
          </Button>
          {hasResearch && (
            <Button variant="secondary" onClick={() => router.push("/research")}>
              View latest research
            </Button>
          )}
        </div>
      </div>

      <div className="mt-8 rounded-card border border-ink-100 p-6">
        <h2 className="font-display text-xl text-ink-900">Posting cadence</h2>
        <p className="mt-2 text-ink-700">
          Currently posting:{" "}
          <strong>{currentCadence ? CADENCE_LABELS[currentCadence] : "not set"}</strong>
        </p>
        <Link
          href="/onboarding/growth-plan"
          className="mt-2 inline-block text-sm font-medium text-brass-600 hover:underline"
        >
          Change cadence
        </Link>
      </div>

      <div className="mt-8 rounded-card border border-ink-100 p-6">
        <h2 className="font-display text-xl text-ink-900">Analytics</h2>
        <p className="mt-2 text-ink-700">
          Log how published posts performed.
        </p>
        <Link
          href="/analytics"
          className="mt-2 inline-block text-sm font-medium text-brass-600 hover:underline"
        >
          View analytics
        </Link>
      </div>
    </main>
  );
}
