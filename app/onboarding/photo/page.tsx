"use client";

import { ChangeEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { NOT_A_PHOTO_ISSUE, PHOTO_SCORE_THRESHOLD } from "@/lib/ai/agents/photoAuditAgent";

interface PhotoRecord {
  id: string;
  score: number;
  critique: string;
  issues: string[];
  status: string;
  corrected_url: string | null;
}

export default function PhotoCheckPage() {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PhotoRecord | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [correctedLoaded, setCorrectedLoaded] = useState(false);

  // Restore the last check so a reload or Back doesn't lose it. "Re-run"
  // links ask for a fresh upload instead.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("rerun")) return;
    fetch("/api/photo/latest")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.photo) return;
        // Don't clobber a file the user picked while this was loading.
        setResult((current) => current ?? data.photo);
        setPreviewUrl((current) => current ?? data.originalUrl);
        setDownloadUrl((current) => current ?? data.correctedUrl);
      });
  }, []);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setResult(null);
    setDownloadUrl(null);
    setCorrectedLoaded(false);
    setError(null);
  }

  async function handleAnalyze() {
    if (!file) return;
    setError(null);
    setIsAnalyzing(true);

    const formData = new FormData();
    formData.append("photo", file);

    const res = await fetch("/api/photo/analyze", { method: "POST", body: formData });
    setIsAnalyzing(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: "Something went wrong." }));
      setError(body.error ?? "Something went wrong analyzing your photo.");
      return;
    }

    setResult(await res.json());
  }

  async function handleCorrect() {
    if (!result) return;
    setError(null);
    setIsCorrecting(true);

    const res = await fetch("/api/photo/correct", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ photoId: result.id }),
    });
    setIsCorrecting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: "Something went wrong." }));
      setError(body.error ?? "Something went wrong correcting your photo.");
      return;
    }

    const updated = await res.json();
    setResult(updated);

    const downloadRes = await fetch(`/api/photo/${updated.id}/download`);
    if (downloadRes.ok) {
      const { url } = await downloadRes.json();
      setDownloadUrl(url);
    }
  }

  async function handleDownload() {
    if (!downloadUrl) return;
    setIsDownloading(true);
    try {
      // The signed URL is on Supabase's origin — the `download` attribute
      // is ignored by browsers for cross-origin links, so fetch the bytes
      // ourselves and save a same-origin blob URL instead.
      const res = await fetch(downloadUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = "linkedin-profile-photo.jpg";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } finally {
      setIsDownloading(false);
    }
  }

  const looksGood = result && result.score >= PHOTO_SCORE_THRESHOLD;
  const notAPhoto = result?.issues.includes(NOT_A_PHOTO_ISSUE) ?? false;

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link
        href="/onboarding/profile-audit"
        className="text-sm font-medium text-ink-500 hover:text-ink-900"
      >
        ← Back
      </Link>
      <p className="mt-4 text-sm font-medium text-brass-600">Phase 1 · Step 3 of 5</p>
      <h1 className="mt-2 font-display text-3xl text-ink-900">Check your profile photo</h1>
      <p className="mt-2 max-w-prose text-ink-700">
        Upload what you&apos;re currently using on LinkedIn. If it needs work, you&apos;ll
        get a corrected version to download — crop, lighting, background, resolution,
        and a change of clothes. Your face is never altered.
      </p>

      <div className="mt-8">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="block text-sm text-ink-700 file:mr-4 file:rounded-card file:border-0 file:bg-brass-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-ink-900"
        />

        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- local object URL preview, not a remote asset
          <img
            src={previewUrl}
            alt="Selected profile photo preview"
            className="mt-4 h-40 w-40 rounded-card object-cover"
          />
        )}

        {file && !result && (
          <Button className="mt-4" isLoading={isAnalyzing} onClick={handleAnalyze}>
            Analyze this photo
          </Button>
        )}

        {error && <p className="mt-3 text-sm text-signal-bad">{error}</p>}

        {result && (
          <div className="mt-6 rounded-card border border-ink-100 p-5">
            <p className="text-sm text-ink-500">Score: {result.score}/100</p>
            <p className="mt-2 text-sm text-ink-700">{result.critique}</p>
            {result.issues.length > 0 && !notAPhoto && (
              <p className="mt-2 text-xs text-ink-500">
                Flagged: {result.issues.join(", ")}
              </p>
            )}

            {notAPhoto ? (
              <p className="mt-4 text-sm font-medium text-signal-warn">
                This doesn&apos;t look like a real photo of you, so there&apos;s nothing to
                correct without changing who&apos;s in it. Choose an actual photo above to
                get corrections.
              </p>
            ) : looksGood ? (
              <p className="mt-4 text-sm font-medium text-signal-good">
                Looks good — no changes needed.
              </p>
            ) : result.status !== "corrected" ? (
              <Button className="mt-4" isLoading={isCorrecting} onClick={handleCorrect}>
                Apply corrections
              </Button>
            ) : (
              downloadUrl && (
                <>
                  <div className="relative mt-4 h-40 w-40">
                    {!correctedLoaded && (
                      <div className="absolute inset-0 flex animate-pulse items-center justify-center rounded-card bg-ink-100 text-xs text-ink-500">
                        Loading photo…
                      </div>
                    )}
                    {/* eslint-disable-next-line @next/next/no-img-element -- remote signed URL, not a static asset next/image can optimize */}
                    <img
                      src={downloadUrl}
                      alt="Corrected profile photo preview"
                      onLoad={() => setCorrectedLoaded(true)}
                      className="h-40 w-40 rounded-card object-cover"
                    />
                  </div>
                  <Button
                    className="mt-4"
                    variant="secondary"
                    isLoading={isDownloading}
                    onClick={handleDownload}
                  >
                    Download corrected photo
                  </Button>
                </>
              )
            )}
          </div>
        )}

        {result && (looksGood || notAPhoto || result.status === "corrected") && (
          <Button
            className="mt-6"
            variant="secondary"
            onClick={() => router.push("/onboarding/positioning")}
          >
            {notAPhoto ? "Skip for now" : "Continue to positioning"}
          </Button>
        )}
      </div>
    </main>
  );
}
