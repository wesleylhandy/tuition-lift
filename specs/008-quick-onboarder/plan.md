# Implementation Plan: Quick Onboarder Wizard

**Branch**: `008-quick-onboarder` | **Date**: 2026-02-18 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/008-quick-onboarder/spec.md`

## Summary

Build a modular 3-step onboarding wizard (Identity → Academic Profile → Financial Pulse) that moves users from signup to the dashboard. Uses Supabase Auth (email/password), Server Actions for profile persistence, and triggers the existing discovery API on completion. Wizard is isolated for easy replacement in future iterations. Profile extensions: `onboarding_complete`, `gpa_weighted`, `gpa_unweighted`.

**Completed (Pre-Onboarding)**: Migration 00016, profiles schema, agent (load-profile, schemas, pii-scrub), get-prep-checklist, setup-test-profile. Tasks T005, T006, T030, T031, T031a done. Remaining work: onboarding UI and Server Actions.

## Technical Context

**Language/Version**: TypeScript 5.x, Node 20+  
**Primary Dependencies**: Next.js (App Router), React 19, Supabase (@supabase/supabase-js, @supabase/ssr), Tailwind CSS, Shadcn/ui, Zod  
**Storage**: Supabase (PostgreSQL); profiles table extensions  
**Testing**: Vitest, Playwright (or project standard)  
**Target Platform**: Web (Vercel)  
**Project Type**: Turborepo monorepo (web + agent apps)  
**Performance Goals**: Onboarding completes in &lt;3 min; Lighthouse Mobile 90+  
**Constraints**: WCAG 2.1 AA; no inline styles; skeleton loading during async  
**Scale/Scope**: Onboarding flow; modular; no new backend services

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Mission & scope:** Onboarding feeds the "Search → Verify → Apply" loop by collecting profile data and triggering discovery. Core-loop enabler.
- **Technical standards:** Next.js App Router, React 19, Tailwind + Shadcn/ui. Supabase Auth + RLS. No new agent logic; discovery trigger uses existing API. Server Actions for mutations. All in apps/web and packages/database.
- **Security & PII:** No raw PII to third-party LLMs. Profile data stays in Supabase. Rate limiting on signup. SAI encrypted per 002.
- **Workflow:** Spec and plan exist; tasks to be created via /speckit.tasks.
- **UX/UI:** WCAG 2.1 AA; skeleton loading; Coach tips; mobile-friendly; progress indicator.
- **Forbidden:** No inline styles; Loading state (skeleton) handled; no mock data.
- **Data integrity:** Profile extensions additive; backward-compatible migration.
- **Documentation protocol:** References Supabase Auth, Next.js Server Actions, Zod.

## Project Structure

### Documentation (this feature)

```text
specs/008-quick-onboarder/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Server Actions contract
│   └── server-actions.md
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code

```text
apps/web/
├── app/
│   ├── (onboard)/onboard/   # Wizard route (route group, no segment in URL)
│   │   ├── page.tsx
│   │   └── layout.tsx
│   └── ...
├── components/
│   └── onboard/            # OnboardWizard, Step1Form, Step2Form, Step3Form, ProgressBar
├── lib/
│   ├── actions/
│   │   └── onboarding.ts   # signUp, saveAcademicProfile, finishOnboarding
│   └── supabase/
│       └── server.ts       # Update for @supabase/ssr if needed
packages/database/
├── supabase/migrations/
│   └── 00000000000016_profiles_onboarding_gpa.sql  # onboarding_complete, gpa_weighted, gpa_unweighted
└── src/schema/
    └── profiles.ts        # Update Zod schema
```

**Structure Decision**: Turborepo monorepo. Onboarding lives entirely in apps/web. packages/database receives one additive migration. Agent (load-profile) updated to read new GPA columns.

### Module Boundary (Replaceable Unit per FR-011)

The onboarding wizard is a replaceable unit. To swap it for a different flow, replace these files only. Discovery, dashboard, and profile persistence logic stay unchanged.

| Path | Purpose |
|------|---------|
| `apps/web/app/(onboard)/onboard/page.tsx` | Route page; renders OnboardWizard |
| `apps/web/app/(onboard)/onboard/layout.tsx` | Resume step resolution; redirect if complete; OnboardStepProvider |
| `apps/web/components/onboard/onboard-wizard.tsx` | 3-step shell (Identity → Academic → Financial) |
| `apps/web/components/onboard/onboard-step-provider.tsx` | Context for initial step (resume support) |
| `apps/web/components/onboard/step1-form.tsx` | Identity: email + password signup |
| `apps/web/components/onboard/step2-form.tsx` | Academic: major, state, GPA |
| `apps/web/components/onboard/step3-form.tsx` | Financial: SAI, Pell, Finish CTA |
| `apps/web/components/onboard/progress-bar.tsx` | Progress indicator (1 of 3, 2 of 3, 3 of 3) |
| `apps/web/lib/actions/onboarding.ts` | Server Actions: signUp, saveAcademicProfile, finishOnboarding |
| `apps/web/middleware.ts` | /onboard redirect when onboarding_complete (T029); extend matcher if other onboard-only logic added |

**Integration points** (do not change when replacing onboarding): `profiles` table (onboarding_complete, etc.), `POST /api/discovery/trigger`, redirect target `/dashboard`, `@repo/db` withEncryptedSai.

**Visual Style**: Centered card 450px max-width, soft shadow; progress bar Electric Mint (#00FFAB); mobile-friendly (44px touch targets). Per spec Assumptions.

## Phase 0: Research

Complete. See [research.md](./research.md).

## Phase 1: Design Artifacts

- [data-model.md](./data-model.md) — Profile extensions, migration strategy
- [contracts/server-actions.md](./contracts/server-actions.md) — signUp, saveAcademicProfile, finishOnboarding
- [quickstart.md](./quickstart.md) — Setup and verification

## Phase 2: Tasks

See [tasks.md](./tasks.md). Coverage:
- **Done**: Migration 00016, profiles schema (T005, T006), agent alignment (T030), get-prep-checklist (T031), setup-test-profile (T031a)
- **Remaining**: @supabase/ssr integration, Server Actions (signUp, saveAcademicProfile, finishOnboarding), OnboardWizard UI (forms, Coach tips, progress bar, skeleton loading), resume logic, redirect, rate limiting

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| (None)    | —          | —                                    |
