"use client";

import { ChangeEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, inputClassName } from "@/components/ui/Field";

interface AuditItem {
  id: string;
  section: "headline" | "about" | "experience";
  score: number | null;
  critique: string;
  suggested_rewrite: string;
  status: "pending" | "accepted" | "edited" | "rejected";
  final_text?: string | null;
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
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [items, setItems] = useState<AuditItem[]>([]);
  const [editedText, setEditedText] = useState<Record<string, string>>({});
  // A set, not a single id: decisions on several items can be in flight at once.
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({});
  const [reopenedIds, setReopenedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [isGeneratingAbout, setIsGeneratingAbout] = useState(false);
  const [generateAboutError, setGenerateAboutError] = useState<string | null>(null);

  // Restore the last audit so a reload or Back doesn't lose it (and
  // doesn't cost another analysis). "Re-run" links ask for a fresh form.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("rerun")) return;
    fetch("/api/profile-audit/latest")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { hasAnalysis: boolean; items: AuditItem[] } | null) => {
        if (!data || data.items.length === 0) return;
        setItems((current) => (current.length > 0 ? current : data.items));
        setHasAnalyzed((current) => current || data.hasAnalysis);
        setEditedText((current) => {
          const restored: Record<string, string> = {};
          for (const item of data.items) {
            if (item.status === "edited" && item.final_text) restored[item.id] = item.final_text;
          }
          return { ...restored, ...current };
        });
      });
  }, []);

  function startNewAudit() {
    setItems([]);
    setEditedText({});
    setReopenedIds(new Set());
    setSaveErrors({});
    setHasAnalyzed(false);
  }

  // Derives preview URLs from `files` and revokes them whenever `files`
  // changes or this form unmounts (e.g. analysis succeeds and this form
  // is replaced by the review list) — object URLs always match what's
  // actually in `files`, whether it came from the file picker or a paste.
  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviewUrls(urls);
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  function addFiles(newFiles: File[]) {
    if (newFiles.length === 0) return;
    setAnalyzeError(null);
    setFiles((prev) => [...prev, ...newFiles].slice(0, MAX_SCREENSHOTS));
  }

  function handleFilesChange(e: ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(e.target.files ?? []));
    e.target.value = "";
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  // Lets users paste a copied screenshot directly (Ctrl/Cmd+V) instead of
  // saving it to disk first and uploading it — the file-picker upload
  // stays available alongside this, addFiles() just merges either source.
  useEffect(() => {
    if (mode !== "screenshot" || hasAnalyzed) return;

    function handlePaste(e: ClipboardEvent) {
      const pastedImages = Array.from(e.clipboardData?.items ?? [])
        .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
        .map((item) => item.getAsFile())
        .filter((f): f is File => f !== null);

      if (pastedImages.length > 0) {
        e.preventDefault();
        addFiles(pastedImages);
      }
    }

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [mode, hasAnalyzed]);

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
    // Append rather than replace — an AI-drafted About item (from the
    // "Generate About for me" shortcut) may already be sitting in `items`,
    // and this shouldn't discard it.
    setItems((prev) => [...prev, ...(body.items as AuditItem[])]);
    setHasAnalyzed(true);
  }

  async function saveDecision(
    item: AuditItem,
    status: "accepted" | "edited" | "rejected"
  ) {
    setSavingIds((prev) => new Set(prev).add(item.id));
    setSaveErrors((prev) => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });

    const res = await fetch(`/api/profile-audit/${item.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        status,
        finalText: status === "edited" ? editedText[item.id] : undefined,
      }),
    }).catch(() => null);

    setSavingIds((prev) => {
      const next = new Set(prev);
      next.delete(item.id);
      return next;
    });

    if (!res?.ok) {
      const body = await res?.json().catch(() => null);
      setSaveErrors((prev) => ({
        ...prev,
        [item.id]: body?.error ?? "Couldn't save that — please try again.",
      }));
      return;
    }

    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status } : i))
    );
    setReopenedIds((prev) => {
      const next = new Set(prev);
      next.delete(item.id);
      return next;
    });
  }

  function reopenItem(id: string) {
    setReopenedIds((prev) => new Set(prev).add(id));
  }

  async function handleCopyItem(item: AuditItem) {
    const finalText = editedText[item.id] ?? item.suggested_rewrite;
    await navigator.clipboard.writeText(finalText);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId((current) => (current === item.id ? null : current)), 2000);
  }

  async function handleGenerateAbout() {
    setGenerateAboutError(null);
    setIsGeneratingAbout(true);

    const res = await fetch("/api/profile-audit/generate-about", { method: "POST" });
    setIsGeneratingAbout(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: "Something went wrong." }));
      setGenerateAboutError(
        body.error ?? "Something went wrong generating your About section."
      );
      return;
    }

    const item = await res.json();
    setItems((prev) => [...prev, item as AuditItem]);
  }

  const hasAboutItem = items.some((i) => i.section === "about");

  const allDecided =
    items.length > 0 &&
    reopenedIds.size === 0 &&
    items.every((i) => i.status !== "pending");

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/onboarding/profile" className="text-sm font-medium text-ink-500 hover:text-ink-900">
        ← Back
      </Link>
      <p className="mt-4 text-sm font-medium text-brass-600">Phase 1 · Step 2 of 5</p>
      <h1 className="mt-2 font-display text-3xl text-ink-900">
        Review your current profile
      </h1>

      {!hasAnalyzed && (
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

      {!hasAboutItem && (
        <div className="mt-6 flex items-center justify-between gap-4 rounded-card border border-ink-100 bg-paper-raised p-4">
          <div>
            <p className="text-sm font-medium text-ink-900">
              {hasAnalyzed
                ? "No About section in what you provided?"
                : "Don't have an About section yet?"}
            </p>
            <p className="mt-1 text-sm text-ink-700">
              Skip pasting or screenshotting — let AI draft one from your profile info.
            </p>
            {generateAboutError && (
              <p className="mt-2 text-sm text-signal-bad">{generateAboutError}</p>
            )}
          </div>
          <Button
            type="button"
            variant="secondary"
            isLoading={isGeneratingAbout}
            onClick={handleGenerateAbout}
          >
            Generate About for me
          </Button>
        </div>
      )}

      {!hasAnalyzed && mode === "screenshot" && (
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

      {!hasAnalyzed &&
        (mode === "screenshot" ? (
          <div className="mt-8 space-y-6">
            <div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleFilesChange}
                className="block text-sm text-ink-700 file:mr-4 file:rounded-card file:border-0 file:bg-brass-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-ink-900"
              />
              <p className="mt-1 text-xs text-ink-500">
                Up to {MAX_SCREENSHOTS} screenshots — or just copy a screenshot and paste it
                here (Ctrl/Cmd+V), no need to save it first
              </p>
            </div>

            {previewUrls.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {previewUrls.map((url, i) => (
                  <div key={url} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview, not a remote asset */}
                    <img
                      src={url}
                      alt={`Screenshot ${i + 1} preview`}
                      className="h-32 w-auto rounded-card border border-ink-100 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      aria-label={`Remove screenshot ${i + 1}`}
                      className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-ink-900 text-xs font-medium text-white shadow-sm hover:bg-ink-700"
                    >
                      ×
                    </button>
                  </div>
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
        ))}

      {items.length > 0 && (
        <div className="mt-8 space-y-6">
          {!hasAnalyzed && (
            <p className="text-sm font-medium text-ink-900">Drafted so far</p>
          )}
          {items.map((item) => {
            const isEditable = item.status === "pending" || reopenedIds.has(item.id);
            return (
              <div key={item.id} className="rounded-card border border-ink-100 p-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg text-ink-900">
                    {SECTION_LABELS[item.section]}
                  </h2>
                  <span className="text-sm text-ink-500">
                    {item.score != null ? `Score: ${item.score}/100` : "AI-drafted"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-ink-700">{item.critique}</p>

                <div className="mt-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
                    Suggested rewrite
                  </p>
                  <textarea
                    rows={item.section === "about" ? 18 : 6}
                    defaultValue={editedText[item.id] ?? item.suggested_rewrite}
                    onChange={(e) =>
                      setEditedText((prev) => ({ ...prev, [item.id]: e.target.value }))
                    }
                    disabled={!isEditable}
                    className={`${inputClassName} mt-1 resize-y disabled:bg-ink-100 disabled:text-ink-500`}
                  />
                </div>

                {isEditable ? (
                  <div className="mt-3 flex gap-2">
                    <Button
                      type="button"
                      isLoading={savingIds.has(item.id)}
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
                      isLoading={savingIds.has(item.id)}
                      onClick={() => saveDecision(item, "rejected")}
                    >
                      Reject
                    </Button>
                  </div>
                ) : (
                  <div className="mt-3 flex items-center gap-3">
                    <p className="text-sm font-medium text-signal-good">
                      {item.status === "rejected" ? "Rejected — kept as-is" : "Saved"}
                    </p>
                    {item.status !== "rejected" && (
                      <button
                        type="button"
                        onClick={() => handleCopyItem(item)}
                        className="text-sm font-medium text-brass-600 hover:underline"
                      >
                        {copiedId === item.id ? "Copied" : "Copy"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => reopenItem(item.id)}
                      className="text-sm font-medium text-brass-600 hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                )}
                {saveErrors[item.id] && (
                  <p className="mt-2 text-sm text-signal-bad">{saveErrors[item.id]}</p>
                )}
              </div>
            );
          })}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              disabled={!allDecided}
              onClick={() => router.push("/onboarding/photo")}
            >
              Continue to photo check
            </Button>
            {hasAnalyzed && (
              <Button type="button" variant="ghost" onClick={startNewAudit}>
                Start a new audit
              </Button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
