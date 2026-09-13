"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Field, inputClassName } from "@/components/ui/Field";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createSupabaseBrowserClient();

  const redirectedFrom = searchParams.get("redirectedFrom") ?? "/dashboard";
  const oauthError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(oauthError);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsSubmitting(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.push(redirectedFrom);
    router.refresh();
  }

  async function handleLinkedInLogin() {
    setError(null);
    const { error: linkedInError } = await supabase.auth.signInWithOAuth({
      provider: "linkedin_oidc",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirectedFrom=${redirectedFrom}`,
      },
    });
    if (linkedInError) setError(linkedInError.message);
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        onClick={handleLinkedInLogin}
        className="mt-6 w-full"
      >
        Sign in with LinkedIn
      </Button>

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
        <Field label="Password" htmlFor="password">
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClassName}
            autoComplete="current-password"
          />
        </Field>

        {error && <p className="text-sm text-signal-bad">{error}</p>}

        <Button type="submit" isLoading={isSubmitting} className="w-full">
          Log in
        </Button>
      </form>
    </>
  );
}
