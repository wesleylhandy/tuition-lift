/**
 * @repo/db — Supabase client factory
 * Runtime detection: browser → anon only; Node → service-role when available, else anon.
 * Never exposes SUPABASE_SERVICE_ROLE_KEY to the client bundle.
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './generated/database.types.js';
import type { SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'NEXT_PUBLIC_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'NEXT_PUBLIC_SUPABASE_ANON_KEY';
const SUPABASE_SERVICE_ROLE_KEY = 'SUPABASE_SERVICE_ROLE_KEY';

function getEnv(name: string): string | undefined {
  if (typeof process === 'undefined' || !process.env) return undefined;
  return process.env[name];
}

/**
 * Creates a typed Supabase client appropriate for the current runtime.
 * - Browser: Uses anon key only (service-role never exposed).
 * - Node/server: Uses service-role key if set, otherwise anon key.
 */
export function createDbClient(): SupabaseClient<Database> {
  const url = getEnv(SUPABASE_URL);
  const anonKey = getEnv(SUPABASE_ANON_KEY);

  if (!url || !anonKey) {
    throw new Error(
      `@repo/db: Missing required env vars. Set ${SUPABASE_URL} and ${SUPABASE_ANON_KEY}.`
    );
  }

  const isBrowser = typeof window !== 'undefined';
  const serviceRoleKey = isBrowser ? undefined : getEnv(SUPABASE_SERVICE_ROLE_KEY);
  const key = serviceRoleKey ?? anonKey;

  return createClient<Database>(url, key);
}
