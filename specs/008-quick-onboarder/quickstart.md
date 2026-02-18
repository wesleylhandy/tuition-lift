# Quick Start: Quick Onboarder Wizard

**Branch**: `008-quick-onboarder` | **Date**: 2026-02-18

## Prerequisites

- Node 20+, pnpm
- Supabase project (local or hosted)
- Migrations from 002 (profiles), 003 (discovery), 008 (profile extensions) applied

## Setup

1. **Apply migrations**:
   ```bash
   pnpm --filter @repo/db db:push
   pnpm --filter @repo/db db:generate  # Regenerate types after migration
   ```

2. **Environment variables** (in `apps/web/.env.local`):
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...  # For server-side operations
   ```

3. **Install @supabase/ssr** (if not already):
   ```bash
   pnpm --filter web add @supabase/ssr
   ```

## Run the Onboarding Flow

1. Start the web app:
   ```bash
   pnpm --filter web dev
   ```

2. Navigate to `/onboard` (or the configured onboarding route).

3. Complete the 3 steps:
   - **Step 1**: Email + password → signup → auto-advance to Step 2
   - **Step 2**: Intended major + state (required); optional: full name, GPA (weighted/unweighted)
   - **Step 3**: Optional SAI + Pell → "Finish & Start Discovery" → redirect to /dashboard

## Key Paths

| Path | Purpose |
|------|---------|
| `apps/web/app/onboard/` or `(onboard)/onboard/` | Onboarding route and layout |
| `apps/web/lib/actions/onboarding.ts` | Server Actions (signUp, saveAcademicProfile, finishOnboarding) |
| `apps/web/components/onboard/` | Wizard UI (OnboardWizard, Step1Form, Step2Form, Step3Form) |
| `packages/database/supabase/migrations/` | Profile extensions migration |

## Verification

- After Step 1: Check `auth.users` and `profiles` for new row.
- After Step 2: Check `profiles.intended_major`, `profiles.state`, `profiles.gpa_weighted`, `profiles.gpa_unweighted`.
- After Step 3: Check `profiles.onboarding_complete = true`; discovery run triggered (check `discovery_completions` or Inngest dashboard).
- Navigate to /onboard when onboarded → redirect to /dashboard.
