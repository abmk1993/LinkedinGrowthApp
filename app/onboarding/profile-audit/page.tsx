"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, inputClassName } from "@/components/ui/Field";

interface AuditItem {
  id: string;
  section: "headline" | "about" | "experience";
  score: number;
  critique: string;
  suggested_rewrite: string;
  status: "pending" | "accepted" | "edited" | "rejected";
}

const SECTION_LABELS: Record<AuditItem["section"], string> = {
  headline: "Headline",
  about: "About",
  experience: "Experience",
};

export default function ProfileAuditPage() {
  const router = useRouter();

  const [headline, setHeadline] = useState("");
  const [about, setAbout] = useState("");
  const [experience, setExperience] = useState("");

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [items, setItems] = useState<AuditItem[]>([]);
  const [editedText, setEditedText] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  async function handleAnalyze(e: FormEvent) {
    e.preventDefault();
    setAnalyzeError(null);

    if (!headline && !about && !experience) {
      setAnalyzeError("Paste at least one section to get a critique.");
      return;
    }

    setIsAnalyzing(true);
    const res = await fetch("/api/profile-audit/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        headline: headline || undefined,
        about: about || undefined,
        experience: experience || undefined,
      }),
    });
    setIsAnalyzing(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: "Something went wrong." }));
      setAnalyzeError(body.error ?? "Something went wrong analyzing your profile.");
      return;
    }

    const body = await res.json();
    setItems(body.items as AuditItem[]);
  }

  async function saveDecision(
    item: AuditItem,
    status: "accepted" | "edited" | "rejected"
  ) {
    setSavingId(item.id);

    const res = await fetch(`/api/profile-audit/${item.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        status,
        finalText: status === "edited" ? editedText[item.id] : undefined,
      }),
    });

    setSavingId(null);

    if (res.ok) {
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status } : i))
      );
    }
  }

  const allDecided = items.length > 0 && items.every((i) => i.status !== "pending");

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-sm font-medium text-brass-600">Phase 1 · Step 2 of 5</p>
      <h1 className="mt-2 font-display text-3xl text-ink-900">
        Review your current profile
      </h1>

      <div className="mt-6 rounded-card border border-ink-100 bg-paper-raised p-5">
        <p className="text-sm font-medium text-ink-900">Where to find each section</p>
        <ul className="mt-2 space-y-1 text-sm text-ink-700">
          <li>
            <strong>Headline</strong> — the line under your name at the top of your
            profile.
          </li>
          <li>
            <strong>About</strong> — the summary section below your banner photo.
          </li>
          <li>
            <strong>Experience</strong> — the description text under any one role.
          </li>
        </ul>
        <p className="mt-2 text-sm text-ink-500">
          Open your LinkedIn profile in another tab, copy what you have, and paste it
          below. Any section can be left blank.
        </p>
      </div>

      {items.length === 0 ? (
        <form onSubmit={handleAnalyze} className="mt-8 space-y-6">
          <Field label="Headline" htmlFor="headline">
            <textarea
              id="headline"
              rows={2}
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className={inputClassName}
            />
          </Field>
          <Field label="About" htmlFor="about">
            <textarea
              id="about"
              rows={6}
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              className={inputClassName}
            />
          </Field>
          <Field label="Experience" htmlFor="experience" hint="One or two role descriptions is enough">
            <textarea
              id="experience"
              rows={5}
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              className={inputClassName}
            />
          </Field>

          {analyzeError && <p className="text-sm text-signal-bad">{analyzeError}</p>}

          <Button type="submit" isLoading={isAnalyzing}>
            Analyze my profile
          </Button>
        </form>
      ) : (
        <div className="mt-8 space-y-6">
          {items.map((item) => (
            <div key={item.id} className="rounded-card border border-ink-100 p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg text-ink-900">
                  {SECTION_LABELS[item.section]}
                </h2>
                <span className="text-sm text-ink-500">Score: {item.score}/100</span>
              </div>
              <p className="mt-2 text-sm text-ink-700">{item.critique}</p>

              <div className="mt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
                  Suggested rewrite
                </p>
                <textarea
                  rows={item.section === "about" ? 6 : 2}
                  defaultValue={item.suggested_rewrite}
                  onChange={(e) =>
                    setEditedText((prev) => ({ ...prev, [item.id]: e.target.value }))
                  }
                  disabled={item.status !== "pending"}
                  className={`${inputClassName} mt-1 disabled:bg-ink-100 disabled:text-ink-500`}
                />
              </div>

              {item.status === "pending" ? (
                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    isLoading={savingId === item.id}
                    onClick={() =>
                      saveDecision(
                        item,
                        editedText[item.id] && editedText[item.id] !== item.suggested_rewrite
                          ? "edited"
                          : "accepted"
                      )
                    }
                  >
                    Accept
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    isLoading={savingId === item.id}
                    onClick={() => saveDecision(item, "rejected")}
                  >
                    Reject
                  </Button>
                </div>
              ) : (
                <p className="mt-3 text-sm font-medium text-signal-good">
                  {item.status === "rejected" ? "Rejected — kept as-is" : "Saved"}
                </p>
              )}
            </div>
          ))}

          <Button
            type="button"
            disabled={!allDecided}
            onClick={() => router.push("/onboarding/photo")}
          >
            Continue to photo check
          </Button>
        </div>
      )}
    </main>
  );
}
