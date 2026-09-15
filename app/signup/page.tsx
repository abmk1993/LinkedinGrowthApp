"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Field, inputClassName } from "@/components/ui/Field";
import { GuestButton } from "@/components/auth/GuestButton";

export default function SignupPage() {
  const router = useRouter();
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

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    setIsSubmitting(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    // If "Confirm email" is off in Supabase, signUp returns an active
    // session immediately and no confirmation email is sent.
    if (data.session) {
      router.push("/onboarding/profile");
      router.refresh();
      return;
    }

    setCheckEmail(true);
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
          Create account
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-ink-100" />
        <span className="text-xs text-ink-500">or</span>
        <div className="h-px flex-1 bg-ink-100" />
      </div>

      <GuestButton variant="secondary" className="w-full" />
      <p className="mt-2 text-center text-xs text-ink-500">
        Try it first, no email needed — you can save your progress later.
      </p>

      <p className="mt-6 text-center text-sm text-ink-500">
        Already have an account?{" "}
        <a href="/login" className="font-medium text-brass-600 hover:underline">
          Log in
        </a>
      </p>
    </main>
  );
}
