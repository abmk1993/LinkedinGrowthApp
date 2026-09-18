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

interface PresenceScore {
  overall: number | null;
  profileScore: number | null;
  photoScore: number | null;
}

const CADENCE_LABELS: Record<string, string> = {
  daily: "Daily",
  few_times_week: "A few times a week",
  weekly: "Weekly",
};

const HEALTHY_SCORE = 70;

function scoreColor(score: number | null): string {
  if (score == null) return "text-ink-300";
  if (score >= HEALTHY_SCORE) return "text-signal-good";
  if (score >= 40) return "text-signal-warn";
  return "text-signal-bad";
}

export default function DashboardPage() {
  const router = useRouter();

  const [summary, setSummary] = useState<Summary | null>(null);
  const [presence, setPresence] = useState<PresenceScore | null>(null);
  const [presenceLoaded, setPresenceLoaded] = useState(false);
  const [hasResearch, setHasResearch] = useState<boolean | null>(null);
  // undefined while loading, null once loaded with no plan — so a slow
  // request doesn't briefly read as "not set".
  const [currentCadence, setCurrentCadence] = useState<string | null | undefined>(undefined);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/analytics/summary")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setSummary(data));

    fetch("/api/presence-score")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setPresence(data))
      .finally(() => setPresenceLoaded(true));

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

      <div className="mt-8 rounded-card border border-ink-100 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl text-ink-900">Presence score</h2>
            <p className="mt-1 max-w-prose text-sm text-ink-700">
              How your headline, About, experience, and photo scored at your last
              profile and photo checks. Accepted rewrites count once they&apos;re live —
              update LinkedIn, then re-run the audit to see your new score.
            </p>
          </div>
          <div className="text-right">
            <p className={`font-display text-4xl leading-none ${scoreColor(presence?.overall ?? null)}`}>
              {presence?.overall ?? "—"}
              {presence?.overall != null && (
                <span className="text-lg text-ink-300">/100</span>
              )}
            </p>
            <p className="mt-1 text-xs text-ink-500">Overall</p>
          </div>
        </div>

        {!presenceLoaded ? (
          <p className="mt-4 text-sm text-ink-500">Loading…</p>
        ) : presence?.overall == null ? (
          <p className="mt-4 text-sm text-ink-500">
            Run your{" "}
            <Link href="/onboarding/profile-audit" className="font-medium text-brass-600 hover:underline">
              profile audit
            </Link>{" "}
            and{" "}
            <Link href="/onboarding/photo" className="font-medium text-brass-600 hover:underline">
              photo check
            </Link>{" "}
            to get a score.
          </p>
        ) : (
          <div className="mt-4 border-t border-ink-100 pt-4">
            <p className="text-xs text-ink-500">Overall is the average of these two:</p>
            <div className="mt-3 flex flex-wrap gap-6">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
                  Profile text
                </p>
                <p className={`mt-1 text-lg font-semibold ${scoreColor(presence.profileScore)}`}>
                  {presence.profileScore != null ? `${presence.profileScore}/100` : "Not checked yet"}
                </p>
                {(presence.profileScore == null || presence.profileScore < HEALTHY_SCORE) && (
                  <Link
                    href="/onboarding/profile-audit?rerun=1"
                    className="text-xs font-medium text-brass-600 hover:underline"
                  >
                    Re-run profile audit
                  </Link>
                )}
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Photo</p>
                <p className={`mt-1 text-lg font-semibold ${scoreColor(presence.photoScore)}`}>
                  {presence.photoScore != null ? `${presence.photoScore}/100` : "Not checked yet"}
                </p>
                {(presence.photoScore == null || presence.photoScore < HEALTHY_SCORE) && (
                  <Link
                    href="/onboarding/photo?rerun=1"
                    className="text-xs font-medium text-brass-600 hover:underline"
                  >
                    Re-run photo check
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

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
        {isRunning && (
          <p className="mt-3 text-sm text-ink-500" role="status">
            Searching what&apos;s new for each of your content pillars and picking out
            post-worthy angles — this usually takes about a minute. You&apos;ll be taken to
            the results when it&apos;s done.
          </p>
        )}
      </div>

      <div className="mt-8 rounded-card border border-ink-100 p-6">
        <h2 className="font-display text-xl text-ink-900">Posting cadence</h2>
        <p className="mt-2 text-ink-700">
          Currently posting:{" "}
          <strong>
            {currentCadence === undefined
              ? "…"
              : currentCadence
                ? CADENCE_LABELS[currentCadence]
                : "not set"}
          </strong>
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
