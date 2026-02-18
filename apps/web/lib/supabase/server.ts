/**
 * Supabase server client for API routes, Server Components, and Server Actions.
 * Uses @supabase/ssr createServerClient for cookie-based session persistence.
 * Required for onboarding: signUp → redirect → session persists for profile upsert.
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@repo/db";
import type { DbClient } from "@repo/db";

/**
 * Creates a Supabase client for server-side use with cookie-based session.
 * Use in Server Components, Server Actions, and Route Handlers.
 * Session from signUp/ signIn persists across redirects via cookies.
 */
export async function createServerSupabaseClient(): Promise<DbClient> {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing env: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // setAll called from Server Component; cookies read-only there.
          // Middleware/proxy can refresh sessions if needed.
        }
      },
    },
  });
}
