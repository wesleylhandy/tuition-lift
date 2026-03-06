# Tasks: Authentication Bridge and Protected Routing

**Input**: Design documents from `/specs/012-auth-bridge-protected-routing/`
**Prerequisites**: plan.md, spec.md, research.md, contracts/

**Tests**: Not explicitly requested in spec; omit test tasks.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story (US1, US2, US3, US4, US5)
- Include exact file paths in descriptions

## Path Conventions

- **Turborepo**: `apps/web/` — all auth flow, middleware, components

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify prerequisites and create directory structure

- [x] T001 [P] Create `apps/web/lib/auth/` and `apps/web/components/auth/` directories
- [x] T002 Verify Supabase Auth config: Email + Magic Link enabled; Site URL and `{origin}/auth/callback` in Redirect URLs

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core auth utilities that MUST be complete before any user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 [P] Create `getSafeRedirectTo` in `apps/web/lib/auth/redirect-allowlist.ts` per contracts/redirect-allowlist.md (allowed prefixes: /dashboard, /scout, /onboard)
- [x] T004 Extend `apps/web/lib/rate-limit.ts` with `checkAndIncrementFailedLoginRateLimit(email)` — 5 attempts per email per 15 minutes; ensure signup/Magic Link use 3/email/hour per contract
- [x] T005 Create `apps/web/lib/actions/auth.ts` with `signIn`, `signUp`, `requestMagicLink` Server Actions per contracts/auth-server-actions.md — wire rate limits, Zod validation, `getSafeRedirectTo` for redirect handling

**Checkpoint**: Foundation ready — user story implementation can begin

---

## Phase 3: User Story 1 - Enter Auth Flow from Landing Page (Priority: P1) 🎯 MVP

**Goal**: Visitor enters email on landing hero, clicks Get Started → routed to Check Email view; user sees Magic Link or Password Setup options; Password Setup view collects password. Invalid email blocked with clear message.

**Independent Test**: Enter valid email on landing, click Get Started → arrive at Check Email with clear next steps; view Password Setup view; invalid email shows validation message before navigation.

### Implementation for User Story 1

- [x] T006 [US1] Update `redirectToSignUp` in `apps/web/lib/actions/landing.ts` to redirect to `/auth/check-email?email=` instead of `/onboard?email=`
- [x] T007 [P] [US1] Create `apps/web/components/auth/check-email-view.tsx` — instructions for Magic Link or Password Setup, "Send Magic Link" button, "Set password" link to `/auth/password-setup?email=`
- [x] T008 [US1] Create `apps/web/app/auth/check-email/page.tsx` — read `email` from searchParams, render CheckEmailView, wire `requestMagicLink` for Send Magic Link button
- [x] T009 [P] [US1] Create `apps/web/components/auth/password-setup-form.tsx` — password fields (min 8 chars), validation, submit calls `signUp` from auth actions
- [x] T010 [US1] Create `apps/web/app/auth/password-setup/page.tsx` — read `email` from searchParams, render PasswordSetupForm, wire `signUp`; on success redirect to `/onboard`; ensure invalid email blocked on landing form (existing Zod in landing.ts)

**Checkpoint**: User Story 1 complete — landing → Check Email → Password Setup flow works

---

## Phase 4: User Story 2 - Sign In via Email/Password or Magic Link (Priority: P1)

**Goal**: Complete authentication via Password Setup (signUp) or Magic Link; post-auth routing: new users → onboarding, returning → dashboard; login view for returning users; clear error messages for failures.

**Independent Test**: Complete Password Setup or Magic Link → verify redirect to onboarding (new) or dashboard (returning); login with email+password → dashboard; invalid credentials show user-friendly error.

### Implementation for User Story 2

- [x] T011 [US2] Create `apps/web/app/auth/callback/route.ts` — GET handler, extract `code` or `token_hash` from query, exchange via `exchangeCodeForSession` or `verifyOtp`, redirect using `getSafeRedirectTo` to onboarding or dashboard based on `onboarding_complete`
- [x] T012 [P] [US2] Create `apps/web/components/auth/login-form.tsx` — email + password fields, submit calls `signIn` from auth actions; display error from action
- [x] T013 [US2] Create `apps/web/app/login/page.tsx` — render LoginForm; pass `redirectTo` from searchParams to signIn for post-login redirect
- [x] T014 [US2] Wire `getSafeRedirectTo` in auth actions (`signIn`, `signUp`) and callback route — honor `redirectTo` from form/URL when allowlisted; default to `/onboard` (new) or `/dashboard` (returning)
- [x] T015 [US2] Extend `apps/web/app/(onboard)/onboard/layout.tsx` to accept `?email=` for Password Setup return path; ensure users arriving from Password Setup (session exists) can resume at Step 2 if profile exists

**Checkpoint**: User Story 2 complete — full auth flow (Password, Magic Link, Login) with correct post-auth routing

---

## Phase 5: User Story 3 - Access Protected Routes (Priority: P1)

**Goal**: Unauthenticated users hitting /dashboard or /scout → redirect to /login?redirectTo=; authenticated with incomplete onboarding → /onboard; fully onboarded → access granted.

**Independent Test**: Visit /dashboard or /scout as guest → redirect to /login?redirectTo=/dashboard (or /scout); authenticated incomplete → /onboard; fully onboarded → access granted. Post-login honors redirectTo.

### Implementation for User Story 3

- [x] T016 [US3] Extend `apps/web/middleware.ts`: add `/scout` and `/scout/:path*` to matcher; redirect unauthenticated from /dashboard and /scout to `/login?redirectTo=${encodeURIComponent(pathname)}` instead of `/`; fetch profile for /dashboard and /scout, redirect authenticated users with `onboarding_complete=false` to `/onboard`
- [x] T017 [US3] Verify `redirectTo` flows: middleware sets it; login/callback use `getSafeRedirectTo`; test allowlist rejects `//`, `javascript:`, external URLs

**Checkpoint**: User Story 3 complete — protected routes and redirectTo flow work correctly

---

## Phase 6: User Story 4 - Session-Aware Global Navigation (Priority: P2)

**Goal**: Navbar reflects session: Guest shows "Login" and "Get Started"; Authenticated shows User Avatar and Debt Lifted HUD.

**Independent Test**: Load landing/login as guest → see Login + Get Started; load as authenticated → see Avatar + Debt Lifted HUD.

### Implementation for User Story 4

- [x] T018 [US4] Refactor `apps/web/components/landing/landing-header.tsx` to be session-aware — Server Component with `createServerClient` (or parent passes user), render Guest: "Login" → `/login`, "Get Started" → `/auth/check-email` (or landing hero flow); render Auth: reuse Avatar + Debt Lifted HUD patterns from `apps/web/components/dashboard/global-header.tsx` (Debt Lifted HUD shows placeholder/skeleton until data available per FR-013)
- [x] T019 [US4] Ensure LandingHeader (or shared Navbar) is used on landing, login, auth pages; session fetched server-side where possible to avoid flash

**Checkpoint**: User Story 4 complete — Navbar correctly shows Guest vs Authenticated state

---

## Phase 7: User Story 5 - Consistent Visual Identity for Auth Views (Priority: P3)

**Goal**: Auth views (login, Check Email, Password Setup) match Premium Academic brand: dark navy gradient, electric mint accents, typography; 44×44px touch targets; reduced-motion support.

**Independent Test**: Compare auth views to landing/dashboard wireframes; colors, fonts, layout align; touch targets meet 44×44px; no horizontal overflow on mobile.

### Implementation for User Story 5

- [x] T020 [P] [US5] Apply design tokens (`--color-navy`, `--color-electric-mint`, `--color-off-white` from globals.css, or Tailwind utilities `bg-navy`, `text-electric-mint`) to `apps/web/app/login/page.tsx`, `apps/web/app/auth/check-email/page.tsx`, `apps/web/app/auth/password-setup/page.tsx` — dark navy gradient background, electric mint CTAs
- [x] T021 [US5] Ensure all interactive elements in auth components meet 44×44px min touch targets and WCAG 2.1 AA contrast; add `prefers-reduced-motion` support for any animations
- [x] T022 [US5] Verify responsive layout on mobile — no horizontal overflow; auth forms stack correctly

**Checkpoint**: User Story 5 complete — auth views visually cohesive with brand

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases, validation, and final verification

- [x] T023 [P] Add user-friendly error handling for expired/invalid Magic Link — "This link has expired" message with link to request new link or return to login in `apps/web/app/auth/callback/route.ts` and check-email-view
- [x] T024 [P] Add rate-limit error display — when Magic Link/signup or login rate limit exceeded, show "Too many attempts. Please try again later." (per contract) in auth components
- [x] T025 Run quickstart.md validation — middleware redirect, landing→Check Email, Magic Link flow, Password Setup flow, Login flow, Navbar session state, Supabase Redirect URLs config. Additionally verify: SC-001 (auth flow completes in under 2 min), SC-005 (auth views pass WCAG 2.1 AA — run axe or similar accessibility checker), SC-006 (error messages display within 3 seconds of triggering action)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Setup — BLOCKS all user stories
- **Phase 3 (US1)**: Depends on Foundational
- **Phase 4 (US2)**: Depends on Foundational; integrates with US1 components (Check Email, Password Setup)
- **Phase 5 (US3)**: Depends on Foundational; uses redirect-allowlist from Phase 2
- **Phase 6 (US4)**: Depends on Foundational; can start after US1 (needs auth routes for Login/Get Started links)
- **Phase 7 (US5)**: Can start after US1/US2 (auth views exist); styling only
- **Phase 8 (Polish)**: Depends on US1–US5

### User Story Dependencies

| Story | Depends On | Can Parallel With |
|-------|------------|--------------------|
| US1 | Foundational | — |
| US2 | Foundational, US1 (form/views) | US3 (different concerns) |
| US3 | Foundational | US2 |
| US4 | Foundational | US1 (for links), US2 (login route) |
| US5 | US1, US2 (views exist) | US4 |

### Parallel Opportunities

- **Phase 2**: T003 and T004 can run in parallel
- **Phase 3**: T007 and T009 can run in parallel
- **Phase 4**: T012 can run in parallel with T011
- **Phase 7**: T020 can run in parallel with other tasks

---

## Parallel Example: Phase 3 (US1)

```bash
# Launch together:
Task T007: "Create check-email-view.tsx in apps/web/components/auth/"
Task T009: "Create password-setup-form.tsx in apps/web/components/auth/"
```

---

## Implementation Strategy

### MVP First (User Stories 1–3)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (landing → Check Email → Password Setup)
4. Complete Phase 4: User Story 2 (signUp, signIn, Magic Link callback)
5. Complete Phase 5: User Story 3 (protected routes, redirectTo)
6. **STOP and VALIDATE**: Run quickstart steps 1–5; verify flows work end-to-end

### Incremental Delivery

1. US1 + US2 + US3 → MVP (full auth + protected routing)
2. Add US4 → Session-aware Navbar
3. Add US5 → Visual polish
4. Add Phase 8 → Edge cases and quickstart validation

### Suggested MVP Scope

- **MVP**: Phases 1–5 (US1, US2, US3) — core auth bridge and protected routing
- **Enhanced**: Add US4 (Navbar) for consistent UX
- **Polish**: Add US5 (visual identity) and Phase 8

---

## Notes

- [P] tasks = different files, no cross-task dependencies
- [Story] label maps task to user story for traceability
- Each user story independently testable per spec Independent Test criteria
- Commit after each task or logical group
- Supabase Dashboard: Add `http://localhost:3000/auth/callback` to Redirect URLs (dev)
