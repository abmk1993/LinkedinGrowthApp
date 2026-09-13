"use client";

import { ChangeEvent, useEffect, useState } from "react";
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

const MAX_SCREENSHOTS = 6;

export default function ProfileAuditPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"screenshot" | "text">("screenshot");

  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const [headline, setHeadline] = useState("");
  const [about, setAbout] = useState("");
  const [experience, setExperience] = useState("");

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [items, setItems] = useState<AuditItem[]>([]);
  const [editedText, setEditedText] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  // Revokes the current preview URLs whenever they're replaced, and
  // also on unmount (e.g. analysis succeeds and this form is replaced
  // by the review list, or the user navigates away) — a cleanup tied to
  // this effect's own dependency always sees the latest previewUrls,
  // unlike one written directly in handleFilesChange would after the
  // next replacement.
  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  function handleFilesChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length === 0) return;

    setAnalyzeError(null);
    setFiles(selected.slice(0, MAX_SCREENSHOTS));
    setPreviewUrls(selected.slice(0, MAX_SCREENSHOTS).map((f) => URL.createObjectURL(f)));
  }

  async function handleAnalyze() {
    setAnalyzeError(null);

    if (mode === "screenshot" && files.length === 0) {
      setAnalyzeError("Upload at least one screenshot to get a critique.");
      return;
    }
    if (mode === "text" && !headline && !about && !experience) {
      setAnalyzeError("Paste at least one section to get a critique.");
      return;
    }

    setIsAnalyzing(true);
    const formData = new FormData();
    if (mode === "screenshot") {
      files.forEach((file) => formData.append("screenshots", file));
    } else {
      if (headline) formData.append("headline", headline);
      if (about) formData.append("about", about);
      if (experience) formData.append("experience", experience);
    }

    const res = await fetch("/api/profile-audit/analyze", {
      method: "POST",
      body: formData,
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

      {items.length === 0 && (
        <div className="mt-6 flex gap-2 rounded-card border border-ink-100 p-1">
          <button
            type="button"
            onClick={() => setMode("screenshot")}
            className={`flex-1 rounded-card px-4 py-2 text-sm font-medium transition-colors ${
              mode === "screenshot" ? "bg-brass-100 text-ink-900" : "text-ink-500 hover:text-ink-900"
            }`}
          >
            Upload screenshots
          </button>
          <button
            type="button"
            onClick={() => setMode("text")}
            className={`flex-1 rounded-card px-4 py-2 text-sm font-medium transition-colors ${
              mode === "text" ? "bg-brass-100 text-ink-900" : "text-ink-500 hover:text-ink-900"
            }`}
          >
            Paste text instead
          </button>
        </div>
      )}

      {items.length === 0 && mode === "screenshot" && (
        <div className="mt-6 rounded-card border border-ink-100 bg-paper-raised p-5">
          <p className="text-sm font-medium text-ink-900">Why screenshots?</p>
          <p className="mt-2 text-sm text-ink-700">
            We don&apos;t ask for your profile URL because automatically fetching
            (&quot;scraping&quot;) a LinkedIn page violates LinkedIn&apos;s Terms of Service and
            risks your account. A screenshot is just an image you choose to share —
            no scraping, no connecting your account, works the same whether your
            profile is public or connections-only.
          </p>

          <p className="mt-4 text-sm font-medium text-ink-900">What to capture</p>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-ink-700">
            <li>
              Open your own profile at linkedin.com/in/your-name in another tab.
            </li>
            <li>
              <strong>Headline</strong> — screenshot the area right under your
              name and photo (your title/tagline and current company).
            </li>
            <li>
              <strong>About</strong> — scroll to the &quot;About&quot; section below your
              banner and screenshot the whole paragraph (click &quot;see more&quot; first
              if it&apos;s truncated).
            </li>
            <li>
              <strong>Experience</strong> — scroll to one role under
              &quot;Experience&quot; and screenshot its description/bullet points.
            </li>
          </ol>
          <p className="mt-2 text-sm text-ink-500">
            Any section you don&apos;t capture is simply skipped — one screenshot per
            section is usually enough since they rarely fit on screen together.
          </p>
        </div>
      )}

      {items.length === 0 ? (
        mode === "screenshot" ? (
          <div className="mt-8 space-y-6">
            <div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleFilesChange}
                className="block text-sm text-ink-700 file:mr-4 file:rounded-card file:border-0 file:bg-brass-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-ink-900"
              />
              <p className="mt-1 text-xs text-ink-500">Up to {MAX_SCREENSHOTS} screenshots</p>
            </div>

            {previewUrls.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {previewUrls.map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element -- local object URL preview, not a remote asset
                  <img
                    key={url}
                    src={url}
                    alt={`Screenshot ${i + 1} preview`}
                    className="h-32 w-auto rounded-card border border-ink-100 object-cover"
                  />
                ))}
              </div>
            )}

            {analyzeError && <p className="text-sm text-signal-bad">{analyzeError}</p>}

            <Button type="button" isLoading={isAnalyzing} onClick={handleAnalyze}>
              Analyze my profile
            </Button>
          </div>
        ) : (
          <div className="mt-8 space-y-6">
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
            <Field
              label="Experience"
              htmlFor="experience"
              hint="One or two role descriptions is enough"
            >
              <textarea
                id="experience"
                rows={5}
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                className={inputClassName}
              />
            </Field>

            {analyzeError && <p className="text-sm text-signal-bad">{analyzeError}</p>}

            <Button type="button" isLoading={isAnalyzing} onClick={handleAnalyze}>
              Analyze my profile
            </Button>
          </div>
        )
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
