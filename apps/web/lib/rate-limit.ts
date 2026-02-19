/**
 * Signup rate-limiting utility (per email).
 * Per research.md §3: 3–5 attempts per hour per email.
 *
 * MVP: In-memory Map. Works for dev and single-instance deployment.
 * PRODUCTION: Multi-instance deployments (e.g. Vercel serverless) require
 * a shared store such as Redis or Upstash KV. Replace this implementation
 * with @upstash/ratelimit or similar when scaling beyond a single instance.
 */

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const DEFAULT_LIMIT = 5;

/** Reads limit from env; default 5. Range 3–5 per spec. */
function getLimit(): number {
  const raw = process.env.SIGNUP_RATE_LIMIT_PER_EMAIL;
  if (!raw) return DEFAULT_LIMIT;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 3 || n > 5) return DEFAULT_LIMIT;
  return n;
}

/** Entry: attempts in current window and when window ends. */
type Entry = { count: number; windowEndsAt: number };

const store = new Map<string, Entry>();

/** Normalizes email for rate-limit key. */
function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/** Builds storage key per research.md §3. */
function key(email: string): string {
  return `signup:${normalizeEmail(email)}`;
}

/**
 * Checks and increments signup rate limit for the given email.
 * Call before supabase.auth.signUp. Increments on every attempt (including rejected ones).
 *
 * @returns { allowed: true } if under limit; { allowed: false } if rate limited
 */
export function checkAndIncrementSignupRateLimit(
  email: string
): { allowed: boolean } {
  const k = key(email);
  const now = Date.now();
  const limit = getLimit();

  let entry = store.get(k);

  if (!entry || now >= entry.windowEndsAt) {
    entry = { count: 1, windowEndsAt: now + WINDOW_MS };
    store.set(k, entry);
    return { allowed: true };
  }

  entry.count += 1;
  return { allowed: entry.count <= limit };
}
