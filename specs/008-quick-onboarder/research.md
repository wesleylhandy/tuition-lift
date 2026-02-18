# Research: Quick Onboarder Wizard

**Branch**: `008-quick-onboarder` | **Date**: 2026-02-18  
**Spec**: [spec.md](./spec.md)

## Resolved Technical Decisions

### 1. Supabase Auth for Next.js (Email/Password Signup)

**Decision**: Use `@supabase/supabase-js` with `supabase.auth.signUp({ email, password })` for Step 1. Add `@supabase/ssr` and cookie-based `createServerClient` for session persistence so authenticated users are recognized on server-side redirects and API calls.

**Rationale**: Current setup (002 research) notes that `@supabase/ssr` is recommended for Next.js cookie-based sessions. Without it, `getUser()` may return null after signup/redirect. The onboarding flow requires: (1) signUp on Step 1, (2) automatic redirect to Step 2, (3) session must persist for profile upsert and discovery trigger. Cookie-based auth via @supabase/ssr achieves this.

**Alternatives considered**:
- Magic link: Spec explicitly requires email/password for this iteration.
- OAuth providers: Out of scope per Assumptions.
- Client-only auth: Session would not persist across Server Component renders or Server Actions; @supabase/ssr required for full flow.

**Reference**: [Supabase Auth - Sign up with email](https://supabase.com/docs/guides/auth/auth-email), [Supabase SSR for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)

---

### 2. Profile Row Creation Timing

**Decision**: Create the profiles row on first successful signUp, before redirecting to Step 2. Use a database trigger or application logic: when `auth.users` gains a new row, insert a corresponding `profiles` row with `id = auth.users.id`. If using application logic, perform the insert immediately after `signUp` succeeds, in the same request flow.

**Rationale**: Step 2 upserts profile data (intended_major, state, etc.). The profiles table has RLS: owner can INSERT and UPDATE. If no row exists, UPDATE would fail. INSERT with `id = auth.uid()` works on signup because the user is now authenticated. Creating the row on signup ensures Step 2 can upsert without extra branching.

**Alternatives considered**:
- Create profile only in Step 2: Requires Step 2 to detect "no row" and INSERT; adds complexity.
- Database trigger on auth.users INSERT: Clean separation; some setups avoid triggers. Application-level insert is explicit and testable.

**Reference**: [Supabase Auth - Triggers](https://supabase.com/docs/guides/auth/auth-deep-diving/auth-deep-diving-triggers), RLS policies in 002 migration.

---

### 3. Rate Limiting for Signup

**Decision**: Implement rate limiting per email (3–5 attempts per hour) at the application layer. Use an in-memory store (e.g., `Map` with TTL) for dev; for production, use Redis or Upstash KV. Store key: `signup:${normalizedEmail}`, value: attempt count, TTL: 1 hour. Increment on each signup attempt; reject with 429 if count exceeds threshold before signUp call.

**Rationale**: Spec requires rate limiting per email (FR-001). Constitution (001) uses 3 attempts/email/hour for waitlist; aligning with 3–5 for signup is consistent. Server Action or API route is the boundary; rate limit check runs before Supabase signUp.

**Alternatives considered**:
- Supabase Auth rate limiting: Supabase has built-in brute-force protection; may not align with exact per-email limit. Application-level gives explicit control.
- Database table for rate limits: Adds migration; Redis/KV is faster for high-frequency checks.

**Reference**: [Supabase Auth - Rate Limits](https://supabase.com/docs/guides/auth/auth-rate-limits), 001 waitlist rate limiting pattern.

---

### 4. GPA Schema: Weighted and Unweighted Columns

**Decision**: Add two nullable columns to profiles: `gpa_weighted numeric(4,2)` (0–6) and `gpa_unweighted numeric(3,2)` (0–4). Deprecate the existing `gpa` column: migration 00016 adds the new columns and copies `gpa` → `gpa_unweighted` (assume legacy data is unweighted). Retain `gpa` for backward compatibility; optional follow-up migration may drop it after all consumers use new columns.

**Rationale**: Spec clarification: profile stores weighted and unweighted GPA separately; user may provide one or both. Two columns satisfy this. `numeric(4,2)` supports up to 99.99 for weighted; `numeric(3,2)` supports 0–9.99 for unweighted. Agent load-profile must be updated to read from `gpa_weighted` and `gpa_unweighted` and map to UserProfile (e.g., prefer unweighted when available for backward compat with discovery queries).

**Alternatives considered**:
- Single `gpa` + `gpa_type` enum: Spec explicitly requires both values when user provides both; single column cannot store both.
- Keep only `gpa`: Does not support "some scholarships require one and not the other."

**Reference**: 002 profiles migration, 003 UserProfile schema, 004 AnonymizedProfile.

---

### 5. Onboarding Complete Flag

**Decision**: Add `onboarding_complete boolean NOT NULL DEFAULT false` to profiles table. Set to `true` when user successfully completes Step 3 ("Finish & Start Discovery"). Middleware or layout logic checks this flag: if user is authenticated and `onboarding_complete = true` and they navigate to `/onboard`, redirect to `/dashboard`.

**Rationale**: Spec FR-007: onboarding-complete flag is the canonical signal. Storing it on profiles avoids a separate table; profiles already exists and is the user's primary record. Single source of truth.

**Alternatives considered**:
- Separate onboarding_state table: Overkill; one boolean on profiles suffices.
- Derive from profile completeness: Ambiguous—user might have partial data; explicit flag is clearer.

**Reference**: profiles table in 002, RLS policies.

---

### 6. Modular Onboarding Architecture

**Decision**: Isolate onboarding in `apps/web/app/(onboard)/onboard/` or `apps/web/app/onboard/` as a dedicated route group. Use a single Client Component (`OnboardWizard`) that owns step state (1|2|3) and composes step-specific subcomponents. Server Actions live in `apps/web/lib/actions/onboarding.ts`. No discovery or dashboard logic inside the wizard; wizard only calls `POST /api/discovery/trigger` and `router.push('/dashboard')` on completion.

**Rationale**: Spec FR-011: wizard must be replaceable without modifying discovery or dashboard. Keeping all onboarding UI and actions in a bounded module allows swapping the entire flow later. Discovery trigger is an integration point (existing API); dashboard is a navigation target.

**Alternatives considered**:
- Inline onboarding in dashboard: Couples the two; hard to replace.
- Separate micro-frontend: Overkill for this scope.

---

### 7. State and Intended Major Input UX

**Decision**: State: Use a dropdown of US state codes (2-letter) for validation and consistency with federal aid. Intended Major: Free text for MVP; future iteration may add autocomplete or predefined list. Both validated with Zod: state must match regex `/^[A-Z]{2}$/` (uppercase) or use an allowlist; major non-empty string, max 200 chars.

**Rationale**: Spec does not prescribe format; plan must decide. State as 2-letter code aligns with FAFSA and existing profiles.state usage. Major as free text minimizes friction; discovery uses it as search input.

**Reference**: profiles migration, 003 load-profile.
