/**
 * Supabase server client for API routes and Server Components.
 * For production auth with cookies, add @supabase/ssr and use createServerClient.
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */
// Uses createDbClient; for cookie-based auth add @supabase/ssr
import { createDbClient } from "@repo/db";

/**
 * Creates a Supabase client for server-side auth.
 * Uses @repo/db createDbClient (anon in browser; service-role in Node when set).
 * Without @supabase/ssr, session from cookies is not auto-restored; getUser() may return null.
 * Add @supabase/ssr and createServerClient for full cookie-based auth.
 */
export function createServerSupabaseClient() {
  return createDbClient();
}
