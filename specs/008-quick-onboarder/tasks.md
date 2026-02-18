# Tasks: Quick Onboarder Wizard

**Input**: Design documents from `/specs/008-quick-onboarder/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

**Completed (GPA model & agent alignment)**: T005, T006, T030, T031, T031a. Migration, schema, agent (load-profile, schemas, pii-scrub), get-prep-checklist, and setup-test-profile updated. Remaining: onboarding UI, Server Actions, resume/redirect.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Turborepo (TuitionLift)**: `apps/web/`, `apps/agent/`, `packages/database/`

---

## Phase 1: Setup

**Purpose**: Dependencies and folder structure for onboarding module

- [x] T001 [P] Add @supabase/ssr to apps/web if not present (pnpm --filter web add @supabase/ssr) per research.md §1
- [x] T002 Create onboarding route structure: apps/web/app/(onboard)/onboard/page.tsx and layout.tsx per plan.md
- [x] T003 [P] Create apps/web/components/onboard/ directory for wizard components
- [x] T004 [P] Create US state codes allowlist (2-letter) in apps/web/lib/constants/us-states.ts for state validation per research.md §7

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Migration, schema, auth, and rate limiting—MUST complete before any user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Create migration 00000000000016_profiles_onboarding_gpa.sql in packages/database/supabase/migrations/: add onboarding_complete boolean NOT NULL DEFAULT false, gpa_weighted numeric(4,2), gpa_unweighted numeric(3,2) with CHECK constraints; migrate existing gpa to gpa_unweighted; retain gpa column (do not drop) per data-model.md
- [x] T006 Update packages/database/src/schema/profiles.ts: add gpa_weighted, gpa_unweighted (0–6, 0–4), onboarding_complete; deprecate gpa (keep for type compat) per data-model.md
- [x] T007 Update apps/web/lib/supabase/server.ts to use @supabase/ssr createServerClient for cookie-based session persistence per research.md §1
- [x] T008 Create signup rate-limiting utility in apps/web/lib/rate-limit.ts: check increment per email (3–5/hour); implement in-memory Map for MVP (dev and single-instance); document in code that production multi-instance deployment requires Redis/Upstash KV per research.md §3
- [x] T009 Create OnboardWizard Client Component shell in apps/web/components/onboard/onboard-wizard.tsx: useState(step 1|2|3), render step placeholder divs, 450px max-width centered card per spec FR-010
- [x] T010 Wire OnboardWizard into apps/web/app/(onboard)/onboard/page.tsx; ensure route renders wizard

**Checkpoint**: Foundation ready—user story implementation can begin. T005, T006 done (migration and schema).

---

## Phase 3: User Story 1 - Identity (Account Creation) (Priority: P1) 🎯 MVP

**Goal**: User creates account via email/password; advances to Step 2 on success.

**Independent Test**: Complete signup with valid email/password; verify user sees Step 2. Invalid email or weak password shows error and does not advance.

- [x] T011 [US1] Implement signUp Server Action in apps/web/lib/actions/onboarding.ts: validate email (Zod), password (min 8), check rate limit, call supabase.auth.signUp, on success insert profiles row (id=user.id, onboarding_complete=false), return { success, error } per contracts/server-actions.md §1
- [x] T012 [US1] Create Step1Form component in apps/web/components/onboard/step1-form.tsx: email and password inputs, form action→signUp, validation errors display, Coach tip ("Create your account to get started!" or similar) per FR-005
- [x] T013 [US1] Wire Step1Form into OnboardWizard when step=1; on signUp success set step to 2; handle duplicate email and rate limit errors with user-friendly messages per FR-008, edge cases
- [x] T014 [US1] Add skeleton loading state and block duplicate submit during signUp in Step1Form per FR-014

**Checkpoint**: User Story 1 complete—signup works, advances to Step 2

---

## Phase 4: User Story 2 - Academic Profile Intake (Priority: P1)

**Goal**: User provides intended major, state (required); full name, GPA weighted/unweighted (optional). Data persisted; advances to Step 3.

**Independent Test**: Fill Step 2 and submit; verify profile persisted (intended_major, state, gpa_weighted, gpa_unweighted); missing major/state blocks advance.

- [x] T015 [US2] Implement saveAcademicProfile Server Action in apps/web/lib/actions/onboarding.ts: validate auth, intended_major and state required (Zod), full_name/gpa_weighted/gpa_unweighted optional with range validation (0–6 weighted, 0–4 unweighted), upsert profiles per contracts/server-actions.md §2
- [x] T016 [US2] Create Step2Form component in apps/web/components/onboard/step2-form.tsx: intended_major (text), state (dropdown from US states), full_name (optional), gpa_weighted and gpa_unweighted (optional number inputs with labels), Coach tip per FR-005, validation per FR-008
- [x] T017 [US2] Wire Step2Form into OnboardWizard when step=2; on saveAcademicProfile success set step to 3; show skeleton during save, block duplicate submit per FR-014
- [x] T018 [US2] Add skip/optional handling for GPA fields when empty; validate only when value provided (invalid blocks or allows skip per FR-008) in Step2Form

**Checkpoint**: User Story 2 complete—Academic Profile saves and advances

---

## Phase 5: User Story 3 - Financial Pulse Intake and Discovery Launch (Priority: P1)

**Goal**: User provides SAI and Pell (optional); clicks "Finish & Start Discovery"; onboarding complete, discovery triggered, redirect to dashboard.

**Independent Test**: Complete Step 3; verify onboarding_complete=true, discovery triggered, user lands on /dashboard. SAI tooltip visible.

- [x] T019 [US3] Implement finishOnboarding Server Action in apps/web/lib/actions/onboarding.ts: validate auth, optional sai (-1500–999999) and pell_eligibility (enum), encrypt SAI via @repo/db withEncryptedSai before upsert, upsert profiles (sai, pell_eligibility_status, onboarding_complete=true), call POST /api/discovery/trigger, return { success, discoveryTriggered } per contracts/server-actions.md §3
- [x] T020 [US3] Create Step3Form component in apps/web/components/onboard/step3-form.tsx: SAI input with "What is this?" tooltip (explain Student Aid Index), Pell toggle (eligible/ineligible/unknown), Coach tip per FR-005, "Finish & Start Discovery" CTA per FR-006
- [x] T021 [US3] Wire Step3Form into OnboardWizard when step=3; on finishOnboarding success call router.push('/dashboard'); show skeleton during action; if discoveryTriggered=false show toast per contracts §3
- [x] T022 [US3] Handle discovery trigger failure gracefully in finishOnboarding: still set onboarding_complete so user not stuck; set discoveryTriggered: false per edge case spec

**Checkpoint**: User Story 3 complete—Financial Pulse saves, discovery triggers, redirect

---

## Phase 6: User Story 4 - Progress and Visual Feedback (Priority: P2)

**Goal**: Progress bar (1 of 3, 2 of 3, 3 of 3); mobile-friendly layout; WCAG 2.1 AA.

**Independent Test**: Advance through steps; progress indicator updates; layout works on mobile (no horizontal scroll, 44px touch targets).

- [x] T023 [P] [US4] Create ProgressBar component in apps/web/components/onboard/progress-bar.tsx: display current step (e.g., Step 1 of 3), high-contrast bar (Electric Mint #00FFAB brand accent per plan), 3 segments per FR-009, FR-010
- [x] T024 [US4] Add ProgressBar to OnboardWizard; pass current step; ensure bar updates when step changes
- [x] T025 [US4] Apply centered card layout (450px max-width, soft shadow), mobile-friendly (no horizontal scroll, 44px min touch targets per WCAG) to OnboardWizard and step forms per FR-010, plan visual style
- [x] T026 [US4] Verify WCAG 2.1 AA: keyboard navigation, focus visible, screen reader labels, color contrast 4.5:1 on all onboarding components per FR-015
- [x] T027 [US4] Verify Coach tip copy on Step1Form, Step2Form, Step3Form; ensure each step has one-line supportive micro-copy per FR-005

**Checkpoint**: User Story 4 complete—Progress, layout, and accessibility in place

---

## Phase 7: User Story 5 - Modular Design and Resume Logic (Priority: P3)

**Goal**: Resume from correct step when user returns; redirect completed users to dashboard; onboarding isolated for replacement.

**Independent Test**: Close browser mid-flow, return→resume at correct step. Complete onboarding, visit /onboard→redirect to /dashboard.

- [x] T028 [US5] Implement resume step resolution in apps/web/app/(onboard)/onboard/layout.tsx: fetch profile (onboarding_complete, intended_major, state); if onboarding_complete redirect to /dashboard (FR-012); else compute initialStep (2 if !major||!state, else 3); if not authenticated show step 1. Pass initialStep to OnboardWizard so user resumes at correct step per contracts §4, FR-013
- [x] T029 [US5] Add middleware in apps/web/middleware.ts: when path=/onboard and user authenticated with onboarding_complete=true, redirect to /dashboard before layout renders (faster than layout redirect). Complements T028; layout remains fallback per FR-012
- [x] T030 [US5] Update apps/agent/lib/load-profile.ts: select gpa_weighted, gpa_unweighted; map to UserProfile.gpa (prefer unweighted when available, else weighted); update UserProfileSchema in apps/agent/lib/schemas.ts to accept gpa 0–6; update apps/agent/lib/discovery/pii-scrub.ts and AnonymizedProfileSchema gpa to 0–6 per data-model.md §4
- [x] T031 [US5] Update apps/web/lib/actions/get-prep-checklist.ts: add gpa_weighted, gpa_unweighted to profiles select; "Complete your GPA" item checks gpa_weighted OR gpa_unweighted present (valid range) per data-model.md §4
- [x] T031a [US5] Update apps/agent/scripts/setup-test-profile.ts: write gpa_unweighted instead of gpa when creating test profile; ensure compatibility with new schema

**Checkpoint**: User Story 5 complete—Resume, redirect, agent alignment

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final integration and validation

- [ ] T032 [P] Run quickstart.md verification: apply migrations, complete full flow, verify profile and discovery in apps/web. Include Lighthouse run on /onboard (Performance, Best Practices, Accessibility) per constitution §6; target 90+ each
- [ ] T033 Regenerate Supabase types after migration: pnpm --filter @repo/db db:generate
- [ ] T034 Document onboarding module boundaries in specs/008-quick-onboarder/plan.md or quickstart: list files that constitute replaceable unit per FR-011

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies—can start immediately
- **Foundational (Phase 2)**: Depends on Setup; BLOCKS all user stories
- **User Stories (Phase 3–7)**: Depend on Foundational
  - US1, US2, US3 are sequential (steps 1→2→3)
  - US4 (Progress) can parallel after US1–US3 have step forms
  - US5 (Resume/redirect) requires completion flow working
- **Polish (Phase 8)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: After Foundational—no story deps
- **US2 (P1)**: After Foundational, US1 (needs Step 1 to reach Step 2)
- **US3 (P1)**: After Foundational, US2 (needs Step 2 to reach Step 3)
- **US4 (P2)**: After US1–US3 (polishes all steps)
- **US5 (P3)**: After US1–US3 (resume/redirect logic)

### Parallel Opportunities

- Phase 1: T001, T003, T004 can run in parallel
- Phase 2: T005, T006 can run in parallel; T007, T008 can run in parallel after T005
- Phase 6: T023 (ProgressBar) can start once Step forms exist
- Phase 8: T032 can run in parallel with T033

---

## Parallel Example: Phase 2 (Partial)

```bash
# After T001–T004:
T005: Create migration
T006: Update Zod schema

# In parallel:
T007: SSR integration
T008: Rate limit utility
```

---

## Implementation Strategy

### MVP First (User Stories 1–3)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (critical)
3. Complete Phase 3: US1 (Identity)—STOP and validate signup
4. Complete Phase 4: US2 (Academic Profile)—validate profile save
5. Complete Phase 5: US3 (Financial Pulse)—validate full flow to dashboard
6. Deploy/demo MVP

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 → test signup independently
3. US2 → test profile independently
4. US3 → test full onboarding independently (MVP!)
5. US4 → add progress and polish
6. US5 → add resume and agent alignment
7. Polish → quickstart validation

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to user story for traceability
- Each user story independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- No tests requested in spec—test tasks omitted
