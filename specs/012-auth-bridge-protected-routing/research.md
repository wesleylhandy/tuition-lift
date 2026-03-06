# Research: Authentication Bridge and Protected Routing

**Branch**: 012-auth-bridge-protected-routing | **Date**: 2026-02-24  
**Spec**: [spec.md](./spec.md)

## Resolved Technical Decisions

### 1. Magic Link Flow and Callback

**Decision**: Use `supabase.auth.signInWithOtp({ email })` to send Magic Link. Supabase redirects user to configured `emailRedirectTo` (e.g. `https://app.example.com/auth/callback`). Create `app/auth/callback/route.ts` as a GET handler that extracts `code` from query (PKCE flow) or `token_hash` (implicit flow) and exchanges for session via `supabase.auth.exchangeCodeForSession(code)` or `verifyOtp({ token_hash, type: 'email' })`. After exchange, redirect to onboarding or dashboard based on `onboarding_complete`; honor `redirectTo` from state if allowlisted.

**Rationale**: Supabase Magic Link uses PKCE by default for server-side apps. Next.js Route Handler + `createServerSupabaseClient` (or equivalent with cookies) stores session in cookies. Existing `@supabase/ssr` + `createServerClient` in middleware and server.ts already support cookie-based session.

**Alternatives considered**:
- Implicit flow with token_hash: Simpler but less secure; PKCE recommended.
- Client-side exchange: Session would not persist correctly for SSR; server route required.

**Reference**: [Supabase Magic Link](https://supabase.com/docs/guides/auth/auth-magic-link), [exchangeCodeForSession](https://supabase.com/docs/reference/javascript/auth-exchangecodeforsession), existing `apps/web/lib/supabase/server.ts`.

---

### 2. Redirect Allowlist and redirectTo Handling

**Decision**: Maintain an allowlist of internal paths: `/dashboard`, `/dashboard/:path*`, `/scout`, `/onboard`. When unauthenticated user hits protected route, redirect to `/login?redirectTo=<encoded-path>`. After login, parse `redirectTo` from URL; if it matches allowlist (prefix match for dashboard/scout/onboard), redirect there; otherwise redirect to default (onboarding or dashboard). Reject any `redirectTo` containing `//`, `javascript:`, or external origins.

**Rationale**: Prevents open redirect vulnerabilities. Spec requires `redirectTo` for post-login destination. Internal paths only.

**Reference**: Spec FR-009; OWASP Open Redirect.

---

### 3. Rate Limits: Magic Link and Failed Login

**Decision**: Extend `lib/rate-limit.ts` with two additional limiters:
- **Magic Link / signup**: 3 attempts per email per hour (reuse existing `checkAndIncrementSignupRateLimit` logic; ensure Check Email + Password Setup use same key).
- **Failed login**: 5 attempts per email per 15 minutes. New function `checkAndIncrementFailedLoginRateLimit(email)`. Increment on each failed `signInWithPassword`; reset on success (optional, or let window expire). Same in-memory Map pattern; document Redis/KV for production multi-instance.

**Rationale**: Spec FR-006a requires these exact limits. Existing signup limiter uses 1h window; add 15m window for login.

**Reference**: Spec clarifications; existing `apps/web/lib/rate-limit.ts`.

---

### 4. Session-Aware Navbar

**Decision**: Create a shared Navbar component (or refactor `LandingHeader`) that:
- **Server-side**: In a Server Component layout or page, call `createServerSupabaseClient()` → `getUser()`. Pass `user` (or `session`) as prop to Navbar.
- **Client-side fallback**: If Navbar must be client (e.g. for interactive dropdown), use a small client wrapper that fetches `/api/me` or receives session from a Server Component parent and renders Guest vs Authenticated states.

**Rationale**: Session is available server-side via cookies. Avoiding client-only session check reduces flash of wrong state. LandingHeader is currently static; must become session-aware for FR-010. GlobalHeader (dashboard) already assumes authenticated; reuse Debt Lifted HUD and Avatar patterns.

**Reference**: Spec FR-010; existing `LandingHeader`, `GlobalHeader`; `GET /api/me`.

---

### 5. Check Email as First Stop (Landing Hero Flow)

**Decision**: Landing hero form submits to Server Action that validates email, applies rate limit, then redirects to `/auth/check-email?email=...`. Check Email view shows: (1) "We sent a Magic Link to your email" (after request) or "Check your email or set a password below"; (2) Button "Send Magic Link" calling `signInWithOtp`; (3) Link "Or set a password" → `/auth/password-setup?email=...`. Password Setup collects password, calls `signUp`, creates profiles row, redirects to onboarding. Magic Link flow: user clicks link → `/auth/callback` → exchange → redirect.

**Rationale**: Spec FR-002, FR-003: landing routes to Check Email first; user chooses Magic Link or Password Setup. Decouples email capture from immediate password creation.

**Reference**: Spec User Story 1, FR-002, FR-003, FR-004.

---

### 6. Middleware: redirectTo and /scout

**Decision**: Extend `middleware.ts`:
- Redirect unauthenticated from `/dashboard`, `/scout` to `/login?redirectTo=<pathname>` (not `/`).
- Add `/scout` to matcher (and /scout/:path* if scout has nested routes).
- Redirect authenticated users with `onboarding_complete=false` from `/dashboard`, `/scout` to `/onboard` (existing behavior for onboard).
- Session refresh: already using `createServerClient`; ensure `getUser()` is used for auth check (not `getSession()` per Supabase SSR guidance if applicable).

**Rationale**: Spec FR-007, FR-008, FR-009. Current middleware redirects to `/`; spec requires `/login` with redirectTo.

**Reference**: Existing `apps/web/middleware.ts`; Spec FR-007, FR-009.

---

### 7. Onboard Step 1 vs Check Email / Password Setup

**Decision**: Two paths coexist:
- **Path A (new)**: Landing → Check Email → (Magic Link or Password Setup) → onboarding/dashboard. User never sees onboard Step 1 (email+password); they set password on `/auth/password-setup` or use Magic Link.
- **Path B (legacy)**: Direct `/onboard` with `?email=` — user can still use Step 1 (email+password) for backward compatibility. Optional: hide Step 1 when user arrives with `?from=check-email` or similar, and go straight to Step 2.

For MVP: Keep onboard Step 1 as-is. New flow users hit Password Setup, then redirect to `/onboard` (start at Step 2 since account exists). Onboard layout/page detects existing account + profile and resumes at Step 2. If no profile row exists after Magic Link signup, onboard Step 1 could be skipped (profile created in callback or first Step 2 save).

**Rationale**: Minimal change to onboard wizard. Password Setup creates account + profile; redirect to /onboard. Onboard Step 1 reads `?email=`; if user already has session, Step 1 can auto-advance or we show Step 2 directly. Task breakdown will clarify.

**Reference**: Spec 008 onboarding flow; apps/web/components/onboard/step1-form.tsx.

---

### 8. Auth Views Visual Identity

**Decision**: Reuse design tokens from `globals.css` (010-bento-shell): `--color-navy`, `--color-electric-mint`, `--color-off-white` (or Tailwind `bg-navy`, `text-electric-mint`). Auth views use same gradient background as landing (dark navy), electric mint for CTAs and highlights, 44×44px touch targets. No dedicated wireframe; follow landing/dashboard wireframes for consistency. Use `prefers-reduced-motion` for any animations.

**Rationale**: Spec FR-014, FR-015; Premium Academic brand.

**Reference**: Spec 010, 011; specs/wireframes/.
