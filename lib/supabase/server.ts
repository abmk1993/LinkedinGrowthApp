import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./types";

/**
 * Server-side Supabase client for use inside API routes / server
 * components. Uses getAll/setAll — the current recommended cookie API
 * (the older get/set/remove trio is deprecated upstream and due for
 * removal in @supabase/ssr's next major version, so new code should
 * not be written against it).
 *
 * setAll can throw when called from a Server Component (Next.js
 * forbids writing cookies outside Route Handlers/Server Actions) —
 * that's expected and safe to swallow as long as middleware is also
 * refreshing the session, which every route in this app relies on.
 */
export function createSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from a Server Component — safe to ignore; the
            // session refresh is still handled by middleware.
          }
        },
      },
    }
  );
}
