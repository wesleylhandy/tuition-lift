# Implementation Plan: Authentication Bridge and Protected Routing

**Branch**: `012-auth-bridge-protected-routing` | **Date**: 2026-02-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/012-auth-bridge-protected-routing/spec.md`

## Summary

Connect visitors from the landing page into authenticated flows via Email/Password and Magic Link. Implement route protection for `/dashboard` and `/scout` with session-aware routing (redirect to `/login`, then onboarding or dashboard based on `onboarding_complete`). Provide a global Navbar that reflects session state (Guest: Login + Get Started; Authenticated: User Avatar + Debt Lifted HUD). Auth flow uses `/login`, `/auth/check-email`, `/auth/password-setup`, `/auth/callback` with Supabase Auth. Landing hero submits to Check Email first; user chooses Magic Link or Password Setup. Rate limits: Magic Link/signup 3/email/hour; failed login 5/email/15min. Post-login redirect honors `redirectTo` query param (allowlist validation).

**Existing**: Middleware protects `/dashboard`; redirects unauthenticated to `/`. Onboarding at `/onboard`; Step 1 collects email+password. Landing hero redirects to `/onboard?email=`. LandingHeader shows "Login / Sign Up" → `/onboard`. Supabase SSR and cookie-based session in use. **Change required**: New auth route structure, Check Email as first stop, Magic Link support, `/login` as auth gate, `redirectTo` handling, session-aware Navbar, `/scout` protection.

## Technical Context

**Language/Version**: TypeScript 5.x, Node 20+  
**Primary Dependencies**: Next.js (App Router), React 19, Supabase (@supabase/supabase-js, @supabase/ssr), Tailwind CSS, Shadcn/ui, Zod  
**Storage**: Supabase (PostgreSQL); profiles table (onboarding_complete); no new tables  
**Testing**: Vitest, Playwright; auth flow E2E; middleware redirect tests  
**Target Platform**: Web (Vercel)  
**Project Type**: Turborepo monorepo (apps/web, packages/database)  
**Performance Goals**: Auth flow completes in &lt;2 min; session resolution in middleware &lt;100ms  
**Constraints**: WCAG 2.1 AA; 44×44px touch targets; reduced-motion support; no technical error details to users  
**Scale/Scope**: Auth flow (4 routes), middleware extension, Navbar refactor, landing hero integration

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Mission & scope:** Auth bridge and protected routing are core conversion and security; enable "Search → Verify → Apply" by securing dashboard/scout and onboarding flow. No deviation.
- **Technical standards:** Next.js App Router, React 19, Tailwind + Shadcn/ui. Supabase Auth with @supabase/ssr for cookie-based sessions. Middleware for route protection. All in apps/web.
- **Security & PII:** Rate limiting per spec; no stack traces or technical details in user errors. redirectTo allowlist prevents open redirects. Magic Link expiry 1h (Supabase default).
- **Workflow:** Spec and plan exist; tasks via /speckit.tasks.
- **UX/UI:** WCAG 2.1 AA; auth views match Premium Academic brand (dark navy, electric mint).
- **Forbidden:** No inline styles; Loading/Empty states; no mock data.
- **Data integrity:** Uses existing profiles.onboarding_complete; no schema changes.
- **Documentation protocol:** References Supabase Auth, Next.js Middleware, Zod.

## Project Structure

### Documentation (this feature)

```text
specs/012-auth-bridge-protected-routing/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── contracts/           # Server Actions, rate limit, redirect allowlist
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code

```text
apps/web/
├── app/
│   ├── login/
│   │   └── page.tsx                 # NEW: Login view (email + password)
│   ├── auth/
│   │   ├── check-email/
│   │   │   └── page.tsx             # NEW: Check Email (Magic Link or Password Setup)
│   │   ├── password-setup/
│   │   │   └── page.tsx             # NEW: Password Setup for new accounts
│   │   └── callback/
│   │       └── route.ts             # NEW: Magic Link verification (Supabase redirect)
│   ├── (onboard)/onboard/
│   │   ├── page.tsx                 # UNCHANGED: Wizard; Step 1 removed for new-flow users
│   │   └── layout.tsx               # Extend: accept ?email= for Password Setup return
│   └── page.tsx                     # Landing (unchanged)
├── components/
│   ├── auth/                        # NEW
│   │   ├── check-email-view.tsx
│   │   ├── password-setup-form.tsx
│   │   └── login-form.tsx
│   ├── landing/
│   │   └── landing-header.tsx       # Refactor: session-aware Navbar (Guest vs Auth)
│   └── dashboard/
│       └── global-header.tsx       # Extend: reuse Debt Lifted, Avatar
├── lib/
│   ├── actions/
│   │   ├── landing.ts               # Update: redirect to /auth/check-email?email=
│   │   └── auth.ts                  # NEW: signUp (password), signIn, requestMagicLink
│   ├── rate-limit.ts                # Extend: magic link + failed login limits
│   └── auth/
│       └── redirect-allowlist.ts    # NEW: validate redirectTo against allowlist
└── middleware.ts                    # Extend: /login redirect, redirectTo, /scout
```

**Structure Decision**: Turborepo monorepo. Auth flow in apps/web; no packages changes. Reuse existing Supabase SSR, server client, profiles schema. Navbar extracted or composed for Guest vs Authenticated; Debt Lifted HUD and Avatar from GlobalHeader reused where applicable.

## Auth Flow (Spec Alignment)

| Step | Route | Purpose |
|------|-------|---------|
| 1 | Landing hero | Submit email → /auth/check-email?email= |
| 2 | /auth/check-email | "Check your email" or "Set password" → Magic Link or /auth/password-setup |
| 3a | Magic Link | Supabase emails link → /auth/callback → exchange code → onboarding or dashboard |
| 3b | /auth/password-setup | Collect password, signUp → onboarding (new) or dashboard (returning) |
| 4 | /login | Returning users: email + password signIn → dashboard |

**Protected routes**: /dashboard, /scout. Unauthenticated → /login?redirectTo=/dashboard. Post-login → allowlist-valid redirect or default (onboarding vs dashboard by onboarding_complete).

**Onboarding flow integration**: Users arriving via Check Email → Password Setup create account (signUp) with profiles row (onboarding_complete=false), then redirect to /onboard. Step 1 of onboard wizard becomes optional for this path (user already has account); T015 ensures users arriving from Password Setup bypass or auto-advance Step 1 and resume at Step 2. Users arriving via Magic Link: same flow after callback.

**Existing onboard Step 1**: Retain for direct /onboard access (e.g. email+password in one step) OR remove if all signup flows go through Check Email. Plan assumes: Check Email is primary entry; /onboard Step 1 remains for backward compatibility until migration complete; Phase 2 tasks can clarify.

## Phase 0: Research

See [research.md](./research.md) — Supabase Auth Magic Link, Next.js middleware redirectTo handling, rate-limit patterns, redirect allowlist.

## Phase 1: Design & Contracts

- **Contracts**: [contracts/](./contracts/) — auth Server Actions (signUp, signIn, requestMagicLink), rate limits (Magic Link 3/h, login 5/15m), redirect allowlist
- **Redirect allowlist**: Internal paths only (`/dashboard`, `/dashboard/:path*`, `/scout`, `/onboard`); reject external or `//` URLs

## Phase 2: Tasks

See [tasks.md](./tasks.md). Coverage:

- **Middleware**: Extend matcher to /scout; redirect unauthenticated to /login?redirectTo=; redirect authenticated incomplete-onboarding to /onboard; session refresh (existing)
- **Auth routes**: /login, /auth/check-email, /auth/password-setup, /auth/callback (Magic Link exchange)
- **Server Actions**: signIn, signUp (password setup), requestMagicLink; rate limits
- **Landing**: Hero → /auth/check-email; Navbar session-aware (Login, Get Started vs Avatar, Debt Lifted)
- **Visual identity**: Auth views match dark navy + electric mint; 44×44px touch targets

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (None)    | —          | —                                   |
