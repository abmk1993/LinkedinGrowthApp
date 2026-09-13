"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Field, inputClassName } from "@/components/ui/Field";
import { TagInput } from "@/components/ui/TagInput";

const EXPERIENCE_LEVELS = [
  "Entry level (0-2 years)",
  "Mid level (3-5 years)",
  "Senior (6-10 years)",
  "Lead / Principal (10+ years)",
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
  }, []);

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
    <main className="mx-auto max-w-2xl px-6 py-16">
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
            <TagInput value={skills} onChange={setSkills} />
          </Field>
          <Field label="Topics of interest" htmlFor="interests">
            <TagInput value={interests} onChange={setInterests} />
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
            href="/onboarding/profile-audit"
            className="text-sm font-medium text-brass-600 hover:underline"
          >
            Re-run profile audit
          </Link>
          <Link
            href="/onboarding/photo"
            className="text-sm font-medium text-brass-600 hover:underline"
          >
            Re-run photo check
          </Link>
        </div>
      </section>
    </main>
  );
}
