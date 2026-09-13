"use client";

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

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-ink-100">
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
        <button
          type="button"
          onClick={handleSignOut}
          className="text-sm font-medium text-ink-500 hover:text-ink-900"
        >
          Log out
        </button>
      </nav>
    </header>
  );
}
