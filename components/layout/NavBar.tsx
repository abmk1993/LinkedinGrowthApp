"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const LINKS = [
  { href: "/profile", label: "Profile growth" },
  { href: "/dashboard", label: "Posting" },
] as const;

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setIsGuest(Boolean(data.user?.is_anonymous));
    });
  }, [supabase]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-ink-100">
      {isGuest && (
        <div className="bg-brass-100 px-6 py-2 text-center text-sm text-ink-900">
          You&apos;re using a guest session — it only lives in this browser.{" "}
          <Link href="/account/upgrade" className="font-medium text-brass-600 hover:underline">
            Save your progress
          </Link>
        </div>
      )}
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-6">
          <span className="font-display text-lg text-ink-900">Growth Agent</span>
          <div className="flex items-center gap-4">
            {LINKS.map((link) => {
              const isActive = pathname === link.href || pathname?.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-medium transition-colors ${
                    isActive ? "text-brass-600" : "text-ink-700 hover:text-ink-900"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
        {!isGuest && (
          <button
            type="button"
            onClick={handleSignOut}
            className="text-sm font-medium text-ink-500 hover:text-ink-900"
          >
            Log out
          </button>
        )}
      </nav>
    </header>
  );
}
