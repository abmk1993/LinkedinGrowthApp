"use client";

import { FormEvent, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Field, inputClassName } from "@/components/ui/Field";

export default function SignupPage() {
  const supabase = createSupabaseBrowserClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    setIsSubmitting(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    setCheckEmail(true);
  }

  async function handleLinkedInSignup() {
    setError(null);
    // Scopes intentionally limited to what LinkedIn's self-serve OAuth
    // actually exposes: name, photo, email, headline. See the dev
    // plan's note on why profile text (About/experience) is paste-in,
    // not OAuth-sourced.
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "linkedin_oidc",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (oauthError) setError(oauthError.message);
  }

  if (checkEmail) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
        <h1 className="font-display text-2xl text-ink-900">Check your email</h1>
        <p className="mt-3 text-ink-700">
          We sent a confirmation link to <strong>{email}</strong>. Click it to finish
          setting up your account.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="font-display text-2xl text-ink-900">Create your account</h1>
      <p className="mt-2 text-ink-700">
        Start with your profile makeover, then move into ongoing growth mode.
      </p>

      <Button
        type="button"
        variant="secondary"
        onClick={handleLinkedInSignup}
        className="mt-6 w-full"
      >
        Sign in with LinkedIn
      </Button>
      <p className="mt-1 text-xs text-ink-500">
        Pulls your name, photo, and headline automatically.
      </p>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-ink-100" />
        <span className="text-xs text-ink-500">or</span>
        <div className="h-px flex-1 bg-ink-100" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
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
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500">
        Already have an account?{" "}
        <a href="/login" className="font-medium text-brass-600 hover:underline">
          Log in
        </a>
      </p>
    </main>
  );
}
