"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Field, inputClassName } from "@/components/ui/Field";

/**
 * Converts a guest (Supabase anonymous auth) session into a permanent
 * account in place — same user id, so every row already saved under it
 * (profile, audits, posts, …) carries over untouched. Attaching an
 * email/password via updateUser() on an anonymous user is exactly what
 * does that conversion; Supabase flips is_anonymous to false once the
 * confirmation link is clicked.
 */
export default function UpgradeAccountPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [isAnonymous, setIsAnonymous] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setIsAnonymous(Boolean(data.user?.is_anonymous));
    });
  }, [supabase]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const { error: updateError } = await supabase.auth.updateUser({ email, password });
    setIsSubmitting(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSent(true);
  }

  if (isAnonymous === null) {
    return (
      <main className="mx-auto max-w-md px-6 py-16">
        <p className="text-ink-500">Loading…</p>
      </main>
    );
  }

  if (!isAnonymous) {
    return (
      <main className="mx-auto max-w-md px-6 py-16">
        <h1 className="font-display text-2xl text-ink-900">You already have an account</h1>
        <p className="mt-3 text-ink-700">Nothing to save here.</p>
        <Button className="mt-6" onClick={() => router.push("/profile")}>
          Back to profile growth
        </Button>
      </main>
    );
  }

  if (sent) {
    return (
      <main className="mx-auto max-w-md px-6 py-16">
        <h1 className="font-display text-2xl text-ink-900">Check your email</h1>
        <p className="mt-3 text-ink-700">
          We sent a confirmation link to <strong>{email}</strong>. Click it to finish
          saving your account — everything you&apos;ve done so far stays exactly as it
          is, nothing to redo. Keep using this browser until then.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="font-display text-2xl text-ink-900">Save your progress</h1>
      <p className="mt-2 text-ink-700">
        You&apos;re using a guest session — it only lives in this browser. Add an
        email and password so you can get back in later; everything you&apos;ve
        already done stays exactly as it is.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Field label="Email" htmlFor="email">
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClassName}
            autoComplete="email"
          />
        </Field>
        <Field label="Password" htmlFor="password" hint="At least 8 characters">
          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClassName}
            autoComplete="new-password"
          />
        </Field>

        {error && <p className="text-sm text-signal-bad">{error}</p>}

        <Button type="submit" isLoading={isSubmitting} className="w-full">
          Save my progress
        </Button>
      </form>
    </main>
  );
}
