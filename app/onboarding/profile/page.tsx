"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, inputClassName } from "@/components/ui/Field";
import { TagInput } from "@/components/ui/TagInput";

const EXPERIENCE_LEVELS = [
  "Entry level (0-2 years)",
  "Mid level (3-5 years)",
  "Senior (6-10 years)",
  "Lead / Principal (10+ years)",
];

export default function ProfileOnboardingPage() {
  const router = useRouter();

  const [profession, setProfession] = useState("");
  const [industry, setIndustry] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [careerGoal, setCareerGoal] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (skills.length === 0) {
      setError("Add at least one skill — even a broad one is fine, you can refine later.");
      return;
    }

    setIsSubmitting(true);

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

    setIsSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: "Something went wrong." }));
      setError(body.error ?? "Something went wrong saving your profile.");
      return;
    }

    router.push("/onboarding/profile-audit");
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-sm font-medium text-brass-600">Phase 1 · Step 1 of 5</p>
      <h1 className="mt-2 font-display text-3xl text-ink-900">Tell us about your work</h1>
      <p className="mt-2 max-w-prose text-ink-700">
        This shapes everything downstream — the profile critique, the content pillars,
        and what the research agent looks for. A few minutes here saves a lot of
        vague suggestions later.
      </p>

      <form onSubmit={handleSubmit} className="mt-10 space-y-6">
        <Field label="Profession" htmlFor="profession" hint="e.g. QA Automation Engineer">
          <input
            id="profession"
            required
            value={profession}
            onChange={(e) => setProfession(e.target.value)}
            className={inputClassName}
          />
        </Field>

        <Field label="Industry" htmlFor="industry" hint="e.g. Sportsbook / IT">
          <input
            id="industry"
            required
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className={inputClassName}
          />
        </Field>

        <Field label="Experience level" htmlFor="experienceLevel">
          <select
            id="experienceLevel"
            required
            value={experienceLevel}
            onChange={(e) => setExperienceLevel(e.target.value)}
            className={inputClassName}
          >
            <option value="" disabled>
              Select one
            </option>
            {EXPERIENCE_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Skills"
          htmlFor="skills"
          hint="The specific tools and disciplines you want to be known for"
        >
          <TagInput
            id="skills"
            value={skills}
            onChange={setSkills}
            placeholder="Playwright, TypeScript, CI/CD…"
          />
        </Field>

        <Field
          label="Topics of interest"
          htmlFor="interests"
          hint="Optional — broader areas you follow, even if not a core skill"
        >
          <TagInput
            id="interests"
            value={interests}
            onChange={setInterests}
            placeholder="AI in testing, QA leadership…"
          />
        </Field>

        <Field
          label="Career goal"
          htmlFor="careerGoal"
          hint="In your own words — this shapes the tone of everything generated"
        >
          <textarea
            id="careerGoal"
            required
            rows={3}
            value={careerGoal}
            onChange={(e) => setCareerGoal(e.target.value)}
            className={inputClassName}
            placeholder="e.g. Become more visible as a QA / AI-assisted testing expert"
          />
        </Field>

        {error && <p className="text-sm text-signal-bad">{error}</p>}

        <Button type="submit" isLoading={isSubmitting}>
          Continue to profile audit
        </Button>
      </form>
    </main>
  );
}
