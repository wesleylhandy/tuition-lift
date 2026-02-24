# Auth Server Actions Contract

**Branch**: 012-auth-bridge-protected-routing | **Date**: 2026-02-24  
**Spec**: [spec.md](../spec.md)

## Overview

Server Actions for authentication flow: sign in, sign up (password setup), request Magic Link. All use `createServerSupabaseClient`, Zod validation, and rate limiting. Return `{ success: boolean; error?: string; redirect?: string }` for client handling.

---

## 1. signIn

**Purpose**: Authenticate returning user with email + password.

**Input**: `FormData` or object `{ email: string; password: string }`

**Validation**: Zod: email format, password non-empty (min 8).

**Rate limit**: Before `signInWithPassword`, call `checkAndIncrementFailedLoginRateLimit(email)`. If not allowed, return `{ success: false, error: "Too many attempts. Please try again later." }`.

**Behavior**:
- Call `supabase.auth.signInWithPassword({ email, password })`
- On success: fetch profile `onboarding_complete`; return `{ success: true, redirect: "/onboard" | "/dashboard" }` (or honor redirectTo from form)
- On error: return `{ success: false, error: "Invalid email or password." }` (generic; no technical details)

---

## 2. signUp (Password Setup)

**Purpose**: Create account when user sets password on `/auth/password-setup`.

**Input**: `FormData` or object `{ email: string; password: string }`

**Validation**: Zod: email format, password min 8 chars.

**Rate limit**: Same as signup—3/email/hour. Reuse `checkAndIncrementSignupRateLimit(email)`.

**Behavior**:
- Call `supabase.auth.signUp({ email, password })`
- On success: insert profiles row (`id = user.id`, `onboarding_complete = false`) if not exists (handle duplicate)
- Return `{ success: true, redirect: "/onboard" }`
- On error (duplicate email, rate limit): return `{ success: false, error: "..." }`

---

## 3. requestMagicLink

**Purpose**: Send Magic Link to user's email from Check Email view.

**Input**: `FormData` or object `{ email: string }`

**Validation**: Zod: email format.

**Rate limit**: 3/email/hour. Reuse `checkAndIncrementSignupRateLimit(email)`.

**Behavior**:
- Call `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${origin}/auth/callback` } })`
- On success: return `{ success: true }` (user sees "Check your email")
- On error: return `{ success: false, error: "..." }` (generic)

---

## 4. Redirect Allowlist

Allowed `redirectTo` values (prefix match): `/dashboard`, `/scout`, `/onboard`. Reject: `//`, `javascript:`, absolute URLs to other origins.
