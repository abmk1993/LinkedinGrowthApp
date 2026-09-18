"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Field, inputClassName } from "@/components/ui/Field";
import { TagInput } from "@/components/ui/TagInput";
// Type-only import — `lib/banner/generate.ts` pulls in `sharp` (a native,
// server-only module), so only its type may cross into this client
// component; the runtime theme list is kept in sync with BANNER_THEMES
// there by the shared BannerTheme type.
import type { BannerTheme } from "@/lib/banner/generate";

const EXPERIENCE_LEVELS = [
  "Entry level (0-2 years)",
  "Mid level (3-5 years)",
  "Senior (6-10 years)",
  "Lead / Principal (10+ years)",
];

const BANNER_THEME_OPTIONS: { value: BannerTheme; label: string }[] = [
  { value: "ink", label: "Ink" },
  { value: "paper", label: "Paper" },
  { value: "brass", label: "Brass" },
];

export default function ProfileGrowthPage() {
  const [profession, setProfession] = useState("");
  const [industry, setIndustry] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [careerGoal, setCareerGoal] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);

  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [bannerTheme, setBannerTheme] = useState<BannerTheme>("ink");
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [isGeneratingBanner, setIsGeneratingBanner] = useState(false);
  const [isDownloadingBanner, setIsDownloadingBanner] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((profile) => {
        if (profile) {
          setProfession(profile.profession);
          setIndustry(profile.industry);
          setExperienceLevel(profile.experienceLevel);
          setCareerGoal(profile.careerGoal);
          setSkills(profile.skills);
          setInterests(profile.interests);
        }
        setIsLoaded(true);
      });

    fetch("/api/banner")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.banner) {
          setBannerUrl(data.banner.url);
          setBannerTheme(data.banner.theme);
        }
      });
  }, []);

  async function handleGenerateBanner() {
    setBannerError(null);
    setIsGeneratingBanner(true);

    const res = await fetch("/api/banner", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ theme: bannerTheme }),
    });
    setIsGeneratingBanner(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: "Something went wrong." }));
      setBannerError(body.error ?? "Something went wrong generating your image.");
      return;
    }

    const { banner } = await res.json();
    setBannerUrl(banner.url);
  }

  async function handleDownloadBanner() {
    if (!bannerUrl) return;
    setIsDownloadingBanner(true);
    try {
      // Signed URL is on Supabase's origin — the `download` attribute is
      // ignored cross-origin, so fetch the bytes and save a same-origin
      // blob URL instead (same approach as the photo download flow).
      const res = await fetch(bannerUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = "linkedin-cover-image.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } finally {
      setIsDownloadingBanner(false);
    }
  }

  async function handleSave() {
    setError(null);
    setSaved(false);
    setIsSaving(true);

    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        profession,
        industry,
        experienceLevel,
        careerGoal,
        skills,
        interests,
      }),
    });
    setIsSaving(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: "Something went wrong." }));
      setError(body.error ?? "Something went wrong saving your profile.");
      return;
    }

    setSaved(true);
  }

  if (!isLoaded) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <p className="text-ink-500">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 pt-16 pb-32">
      <h1 className="font-display text-3xl text-ink-900">Profile growth</h1>
      <p className="mt-2 max-w-prose text-ink-700">
        Everything about how you present yourself — your info, your headline and
        About section, your photo, and the pillars posts get written around.
      </p>

      <section className="mt-10">
        <h2 className="font-display text-xl text-ink-900">Professional profile</h2>
        <div className="mt-4 space-y-5">
          <Field label="Profession" htmlFor="profession">
            <input
              id="profession"
              value={profession}
              onChange={(e) => setProfession(e.target.value)}
              className={inputClassName}
            />
          </Field>
          <Field label="Industry" htmlFor="industry">
            <input
              id="industry"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className={inputClassName}
            />
          </Field>
          <Field label="Experience level" htmlFor="experienceLevel">
            <select
              id="experienceLevel"
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value)}
              className={inputClassName}
            >
              {EXPERIENCE_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Skills" htmlFor="skills">
            <TagInput id="skills" value={skills} onChange={setSkills} />
          </Field>
          <Field label="Topics of interest" htmlFor="interests">
            <TagInput id="interests" value={interests} onChange={setInterests} />
          </Field>
          <Field label="Career goal" htmlFor="careerGoal">
            <textarea
              id="careerGoal"
              rows={3}
              value={careerGoal}
              onChange={(e) => setCareerGoal(e.target.value)}
              className={inputClassName}
            />
          </Field>
        </div>

        {error && <p className="mt-3 text-sm text-signal-bad">{error}</p>}

        <div className="mt-5 flex items-center gap-3">
          <Button isLoading={isSaving} onClick={handleSave}>
            Save changes
          </Button>
          {saved && <span className="text-sm text-signal-good">Saved</span>}
        </div>
      </section>

      <section className="mt-12 border-t border-ink-100 pt-8">
        <h2 className="font-display text-xl text-ink-900">Content pillars</h2>
        <p className="mt-2 text-ink-700">
          The themes the research agent looks for and posts get written around.
        </p>
        <Link
          href="/onboarding/positioning"
          className="mt-2 inline-block text-sm font-medium text-brass-600 hover:underline"
        >
          Edit content pillars
        </Link>
      </section>

      <section className="mt-8 border-t border-ink-100 pt-8">
        <h2 className="font-display text-xl text-ink-900">Profile makeover</h2>
        <p className="mt-2 text-ink-700">
          Re-run these any time — useful after you&apos;ve updated your actual
          LinkedIn profile.
        </p>
        <div className="mt-3 flex gap-4">
          <Link
            href="/onboarding/profile-audit?rerun=1"
            className="text-sm font-medium text-brass-600 hover:underline"
          >
            Re-run profile audit
          </Link>
          <Link
            href="/onboarding/photo?rerun=1"
            className="text-sm font-medium text-brass-600 hover:underline"
          >
            Re-run photo check
          </Link>
        </div>
      </section>

      <section className="mt-8 border-t border-ink-100 pt-8">
        <h2 className="font-display text-xl text-ink-900">Cover image</h2>
        <p className="mt-2 text-ink-700">
          A LinkedIn cover image built from your profession, industry, and
          content pillars — pick a theme and generate as many times as you like.
        </p>

        <div className="mt-4 flex gap-2">
          {BANNER_THEME_OPTIONS.map((theme) => (
            <button
              key={theme.value}
              type="button"
              onClick={() => setBannerTheme(theme.value)}
              className={`rounded-card border px-4 py-2 text-sm font-medium transition-colors ${
                bannerTheme === theme.value
                  ? "border-brass-500 bg-brass-100 text-ink-900"
                  : "border-ink-100 text-ink-700 hover:text-ink-900"
              }`}
            >
              {theme.label}
            </button>
          ))}
        </div>

        {bannerError && <p className="mt-3 text-sm text-signal-bad">{bannerError}</p>}

        <div className="mt-4 flex items-center gap-3">
          <Button isLoading={isGeneratingBanner} onClick={handleGenerateBanner}>
            Generate image
          </Button>
          {bannerUrl && (
            <Button
              variant="secondary"
              isLoading={isDownloadingBanner}
              onClick={handleDownloadBanner}
            >
              Download
            </Button>
          )}
        </div>

        {bannerUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- remote signed URL, not a static asset next/image can optimize
          <img
            src={bannerUrl}
            alt="Generated cover image preview"
            className="mt-4 w-full max-w-xl rounded-card border border-ink-100"
          />
        )}
      </section>
    </main>
  );
}
