# Server Actions Contract: Quick Onboarder

**Branch**: `008-quick-onboarder` | **Date**: 2026-02-18  
**Spec**: [spec.md](../spec.md)

## Overview

The onboarding wizard uses three Server Actions, one per step. All run server-side with `createServerSupabaseClient` (or @supabase/ssr client) for auth. Actions return `{ success: boolean; error?: string; redirect?: string }` so the client can advance the step, show errors, or navigate.

---

## 1. signUp (Step 1)

**Purpose**: Create account via email/password; create profiles row; rate-limit per email.

**Signature**:
```typescript
async function signUp(
  formData: FormData
): Promise<{ success: boolean; error?: string }>
```

**Input** (from FormData):
- `email`: string, valid email format (Zod)
- `password`: string, min 8 characters; validate with Zod (e.g. `.min(8)`); Supabase Auth enforces additional strength—reject weak passwords with clear error before signUp

**Behavior**:
- Check rate limit: `signup:${normalizedEmail}`; reject with error if ≥ 3–5 attempts in last hour.
- Call `supabase.auth.signUp({ email, password })`.
- On success: insert profiles row with `id = user.id`, `onboarding_complete = false`.
- On duplicate email: Supabase returns error; map to user-friendly message.
- Increment rate limit counter on attempt.

**Errors**:
- Rate limit exceeded → `{ success: false, error: "Too many attempts; try again later." }`
- Invalid email/password → `{ success: false, error: "<validation message>" }`
- Duplicate email → `{ success: false, error: "An account with this email already exists." }`

**Client**: On success, advance to Step 2 (no redirect needed if SPA-style; or redirect to /onboard?step=2).

---

## 2. saveAcademicProfile (Step 2)

**Purpose**: Upsert academic profile (intended_major, state required; full_name, gpa_weighted, gpa_unweighted optional).

**Signature**:
```typescript
async function saveAcademicProfile(
  formData: FormData
): Promise<{ success: boolean; error?: string }>
```

**Input** (from FormData):
- `intended_major`: string, required, non-empty, max 200 chars
- `state`: string, required, 2-letter US state code
- `full_name`: string, optional
- `gpa_weighted`: number, optional, 0–6
- `gpa_unweighted`: number, optional, 0–4

**Behavior**:
- Validate user is authenticated.
- Validate required fields (intended_major, state).
- Validate optional fields when provided (GPA ranges).
- Upsert profiles: `full_name`, `intended_major`, `state`, `gpa_weighted`, `gpa_unweighted`.
- SAI is not collected in Step 2; no encryption needed for this step.
- Optimistic locking: include `updated_at` in upsert condition if applicable.

**Errors**:
- Unauthenticated → `{ success: false, error: "Not authenticated" }`
- Missing required fields → `{ success: false, error: "Major and state are required." }`
- Invalid GPA → `{ success: false, error: "GPA must be between 0 and 4 (unweighted) or 0 and 6 (weighted)." }`

**Client**: On success, advance to Step 3.

---

## 3. finishOnboarding (Step 3)

**Purpose**: Save financial profile (SAI, Pell), set onboarding_complete, trigger discovery, return success for client to redirect to /dashboard.

**Signature**:
```typescript
async function finishOnboarding(
  formData: FormData
): Promise<{ success: boolean; error?: string; discoveryTriggered?: boolean }>
```

**Input** (from FormData):
- `sai`: number, optional, -1500 to 999999
- `pell_eligibility`: "eligible" | "ineligible" | "unknown", optional

**Behavior**:
- Validate user is authenticated.
- Encrypt SAI via @repo/db `withEncryptedSai` before upsert.
- Upsert profiles: `sai`, `pell_eligibility_status`, `onboarding_complete = true`.
- Call `POST /api/discovery/trigger` (or inngest.send directly from Server Action if preferred). If trigger fails (e.g., profile incomplete), still set onboarding_complete so user is not stuck; set `discoveryTriggered: false`; client can show "Discovery will start soon" or offer retry from dashboard.
- Return `{ success: true, discoveryTriggered: true|false }`.

**Errors**:
- Unauthenticated → `{ success: false, error: "Not authenticated" }`
- Invalid SAI range → `{ success: false, error: "SAI must be between -1500 and 999999." }`

**Client**: On success, `router.push('/dashboard')`. If `discoveryTriggered: false`, show toast: "Profile saved. Start discovery from your dashboard when ready."

---

## 4. Resume Step Resolution

**Purpose**: Determine which step to show when user returns mid-flow.

**Implementation**: Server Component or API that runs on /onboard load:
- If not authenticated → redirect to sign-in or show Step 1.
- If authenticated:
  - Fetch profile (onboarding_complete, intended_major, state, sai).
  - If onboarding_complete → redirect to /dashboard.
  - Else if !intended_major || !state → show Step 2.
  - Else → show Step 3.

This logic may live in layout or a small loader; not a Server Action per se.
