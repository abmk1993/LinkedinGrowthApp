import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

/**
 * Browser-side Supabase client. Cookies are handled automatically —
 * per @supabase/ssr's own docs, don't pass a custom cookies option
 * unless you have a specific reason to; the default handles the
 * server/client cookie sync correctly.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
