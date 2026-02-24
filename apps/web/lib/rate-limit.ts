/**
 * Rate-limiting utilities (per email).
 * - Signup / Magic Link: 3 attempts per hour (per contracts/auth-server-actions.md)
 * - Failed login: 5 attempts per 15 minutes (per research.md §3)
 *
 * MVP: In-memory Map. Works for dev and single-instance deployment.
 * PRODUCTION: Multi-instance deployments (e.g. Vercel serverless) require
 * a shared store such as Redis or Upstash KV. Replace this implementation
 * with @upstash/ratelimit or similar when scaling beyond a single instance.
 */

const SIGNUP_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const SIGNUP_DEFAULT_LIMIT = 3; // Per contract: 3/email/hour for signup and Magic Link

const FAILED_LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const FAILED_LOGIN_LIMIT = 5;

/** Reads signup limit from env; default 3. Range 3–5 per spec. */
function getSignupLimit(): number {
  const raw = process.env.SIGNUP_RATE_LIMIT_PER_EMAIL;
  if (!raw) return SIGNUP_DEFAULT_LIMIT;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 3 || n > 5) return SIGNUP_DEFAULT_LIMIT;
  return n;
}

/** Entry: attempts in current window and when window ends. */
type Entry = { count: number; windowEndsAt: number };

const store = new Map<string, Entry>();

/** Normalizes email for rate-limit key. */
function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/** Builds storage key for signup/Magic Link (3/email/hour). */
function signupKey(email: string): string {
  return `signup:${normalizeEmail(email)}`;
}

/** Builds storage key for failed login (5/email/15min). */
function failedLoginKey(email: string): string {
  return `failed-login:${normalizeEmail(email)}`;
}

function checkAndIncrement(
  storageKey: string,
  windowMs: number,
  limit: number
): { allowed: boolean } {
  const now = Date.now();
  let entry = store.get(storageKey);

  if (!entry || now >= entry.windowEndsAt) {
    entry = { count: 1, windowEndsAt: now + windowMs };
    store.set(storageKey, entry);
    return { allowed: true };
  }

  entry.count += 1;
  return { allowed: entry.count <= limit };
}

/**
 * Checks and increments signup rate limit for the given email.
 * Used for signUp (Password Setup) and requestMagicLink. Per contract: 3/email/hour.
 * Call before supabase.auth.signUp or signInWithOtp. Increments on every attempt.
 *
 * @returns { allowed: true } if under limit; { allowed: false } if rate limited
 */
export function checkAndIncrementSignupRateLimit(
  email: string
): { allowed: boolean } {
  return checkAndIncrement(
    signupKey(email),
    SIGNUP_WINDOW_MS,
    getSignupLimit()
  );
}

/**
 * Checks and increments failed login rate limit for the given email.
 * Call before supabase.auth.signInWithPassword. Per contract: 5 attempts per 15 minutes.
 * Increments on every attempt (including rejected ones). Used by signIn Server Action.
 *
 * @returns { allowed: true } if under limit; { allowed: false } if rate limited
 */
export function checkAndIncrementFailedLoginRateLimit(
  email: string
): { allowed: boolean } {
  return checkAndIncrement(
    failedLoginKey(email),
    FAILED_LOGIN_WINDOW_MS,
    FAILED_LOGIN_LIMIT
  );
}
