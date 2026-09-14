"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

interface GuestButtonProps {
  redirectTo?: string;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
  label?: string;
}

/**
 * Signs in via Supabase's anonymous auth (a real auth.users row with
 * is_anonymous=true) rather than a parallel localStorage-only mode — same
 * session/cookie handling and RLS policies as a real account, no
 * duplicate code path to maintain. Requires "Anonymous Sign-Ins" enabled
 * in the Supabase dashboard (Authentication → Sign In / Providers); see
 * README "Setup".
 */
export function GuestButton({
  redirectTo = "/onboarding/profile",
  variant = "ghost",
  className = "",
  label = "Continue as guest",
}: GuestButtonProps) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setIsLoading(true);

    const { error: guestError } = await supabase.auth.signInAnonymously();
    setIsLoading(false);

    if (guestError) {
      setError(guestError.message);
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div>
      <Button
        type="button"
        variant={variant}
        isLoading={isLoading}
        onClick={handleClick}
        className={className}
      >
        {label}
      </Button>
      {error && <p className="mt-2 text-sm text-signal-bad">{error}</p>}
    </div>
  );
}
