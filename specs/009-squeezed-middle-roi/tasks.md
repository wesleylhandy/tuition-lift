# Tasks: Squeezed Middle & Alternative ROI Engine

**Input**: Design documents from `/specs/009-squeezed-middle-roi/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks grouped by user story for independent implementation and testing.

**DB Migrations**: All migration tasks include a follow-up instruction to apply migrations. See T010.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

TuitionLift Turborepo: `apps/web/`, `apps/agent/`, `packages/database/`

---

## Phase 1: Setup

**Purpose**: Environment and config preparation

- [ ] T001 Add SAI_MERIT_THRESHOLD, COLLEGE_SCORECARD_API_KEY, BLS_API_KEY to `apps/agent/.env.example` and `apps/web/.env.example` (or root .env.example if single file)
- [ ] T002 [P] Create merit-tiers config module in `packages/database/src/config/merit-tiers.ts` with MERIT_TIERS (top/strong/standard) per data-model.md §8; export from package for agent import

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema and migrations. **All user stories depend on this phase.**

**Apply migrations**: After creating migrations (T003–T009), run T010 to apply them.

- [ ] T003 Create migration `packages/database/supabase/migrations/00000000000017_profiles_squeezed_middle.sql`: add sat_total (int 400–1600), act_composite (int 1–36), spikes (text[]), merit_filter_preference (text DEFAULT 'show_all' CHECK IN ('merit_only','show_all'))
- [ ] T004 Create migration `packages/database/supabase/migrations/00000000000018_scholarship_category_need_blind.sql`: ALTER TYPE scholarship_category ADD VALUE IF NOT EXISTS 'need_blind'
- [ ] T005 Create migration `packages/database/supabase/migrations/00000000000019_app_settings.sql`: create app_settings (key text PK, value text NOT NULL, updated_at timestamptz); RLS for service role
- [ ] T006 Create migration `packages/database/supabase/migrations/00000000000020_parent_students.sql`: create parent_students (parent_id, student_id, linked_at); RLS per data-model.md §4
- [ ] T007 Create migration `packages/database/supabase/migrations/00000000000021_parent_contributions.sql`: create parent_contributions (id, student_id, parent_id, contribution_type, payload jsonb, created_at); RLS per data-model.md §5
- [ ] T008 Create migration `packages/database/supabase/migrations/00000000000022_institutions.sql`: create institutions table per data-model.md §6; indexes on institution_type, state
- [ ] T009 Create migration `packages/database/supabase/migrations/00000000000023_career_outcomes.sql`: create career_outcomes table per data-model.md §7; indexes on cip_code, major_name
- [ ] T010 **Apply all migrations**: Run `pnpm --filter @repo/db db:push` from repo root. Verify migrations applied with `pnpm --filter @repo/db db:generate` to refresh types.
- [ ] T011 Update `packages/database/src/schema/profiles.ts` with sat_total, act_composite, spikes, merit_filter_preference; add Zod validation per data-model.md §1
- [ ] T012 Seed app_settings: Insert sai_merit_threshold = 15000 (script or migration addendum). Document in quickstart.md.

**Checkpoint**: Foundation ready. User story implementation can begin.

---

## Phase 3: User Story 1 - The Merit Hunter (Priority: P1) MVP

**Goal**: High-SAI users toggle Merit only / Show all; receive merit-first ranked results; Coach surfaces Merit-Only/Need-Blind in top 3.

**Independent Test**: User with SAI > 15000 completes intake with GPA, SAT, spikes; selects Merit only; triggers discovery; sees scholarship list with need-based filtered; Coach Daily Game Plan shows merit/need_blind first.

### Implementation for User Story 1

- [ ] T013 [US1] Extend `apps/agent/lib/load-profile.ts`: read sat_total, act_composite, spikes, merit_filter_preference from profiles; read sai_merit_threshold from app_settings (or .env); derive merit_tier from MERIT_TIERS; output merit_filter_preference, sai_above_merit_threshold, merit_tier
- [ ] T014 [US1] Extend `apps/agent/lib/state.ts`: add merit_filter_preference, sai_above_merit_threshold, merit_tier to config or state
- [ ] T015 [US1] Extend `apps/agent/lib/discovery/pii-scrub.ts`: add spikes to AnonymizedProfileSchema (array of strings, labels only); scrubPiiFromProfile extracts spikes, passes only safe labels (no PII)
- [ ] T016 [US1] Add need_blind to VALID_CATEGORIES in `apps/agent/lib/discovery/scholarship-upsert.ts`
- [ ] T017 [US1] Extend `apps/agent/lib/discovery/trust-scorer.ts` (or Advisor_Verify): infer need_blind when .edu domain + merit signals, no need-based; else merit or need_based
- [ ] T018 [US1] Extend `apps/agent/lib/nodes/advisor-verify.ts`: when sai_above_merit_threshold and merit_filter_preference === 'merit_only', exclude need_based results from discovery_results before passing to Coach. Extend `apps/agent/lib/discovery/query-generator.ts`: when merit-first, add merit/need-blind query hints to prompt
- [ ] T019 [US1] Extend `apps/agent/lib/nodes/advisor-verify.ts`: set category need_blind for .edu merit; set merit or need_based per trust-scorer; ensure metadata.categories includes merit_tag
- [ ] T020 [US1] Extend `apps/agent/lib/nodes/coach-prioritization.ts`: when sai_above_merit_threshold, sort merit/need_blind first; boost merit/need_blind score so they appear in top 3; when no merit results, surface alternative path options (link to ROI view) and message "Merit results limited; consider trade schools, community colleges" per edge case
- [ ] T021 [US1] Extend `apps/web/lib/actions/onboarding.ts` saveAcademicProfile: add sat_total (400–1600), act_composite (1–36), spikes (array max 10) to input schema; persist to profiles
- [ ] T022 [US1] Add merit filter toggle UI in dashboard/discovery: wire to GET/PATCH `apps/web/app/api/merit/preference/route.ts`; read meritFilterPreference, saiAboveThreshold; PATCH updates profiles.merit_filter_preference
- [ ] T023 [US1] Extend onboarding Step 2 UI in `apps/web/app/onboarding/`: add SAT total, ACT composite, Spikes (multi-select or text inputs) fields; submit via saveAcademicProfile

**Checkpoint**: User Story 1 complete. Merit-first flow independently testable.

---

## Phase 4: User Story 2 - The ROI Auditor (Priority: P2)

**Goal**: Parent linked to student views ROI comparison (institutions, net price, year-5 income); can add income/manual scholarships; student can unlink.

**Independent Test**: Parent with linked profile views GET /api/roi/comparison; sees 4-year vs community college vs trade school; adds income via POST /api/parents/contributions; student unlinks via DELETE /api/parents/link; parent loses access.

### Implementation for User Story 2

- [ ] T024 [US2] Implement GET `apps/web/app/api/roi/comparison/route.ts`: auth user (student or linked parent); resolve student_id; query institutions (by path_types), career_outcomes; join applications (awarded + potential) for student; compute remainingConfirmed (netPrice − awarded) and remainingIfPotential (netPrice − awarded − potential); return per contracts/api-parents.md §4. Target p95 <2s. Per FR-004, never misrepresent potential as guaranteed.
- [ ] T025 [US2] Implement POST `apps/web/app/api/parents/link/route.ts`: student sends parentEmail; create/lookup parent; create parent_students link; return per contracts/api-parents.md §1
- [ ] T026 [US2] Implement DELETE `apps/web/app/api/parents/link/route.ts`: student sends parentId; delete parent_students row; per contracts/api-parents.md §2
- [ ] T027 [US2] Implement POST `apps/web/app/api/parents/contributions/route.ts`: parent auth; validate linked to studentId; insert parent_contributions; per contracts/api-parents.md §3
- [ ] T028 [US2] Add parent role support: profiles.role or auth raw_app_meta_data; RLS policies for parent_students and parent_contributions per data-model.md
- [ ] T029 [US2] Create ROI comparison UI in `apps/web/app/`: side-by-side cards for 4-year, community college, trade school; fetch from GET /api/roi/comparison; display net price, remaining (confirmed), remaining (if potential) with clear "not guaranteed" labeling; year-5 income
- [ ] T030 [US2] Create parent link flow: student enters parent email via form; POST /api/parents/link creates link; parent account created if needed; parent gains access when they sign in (minimal flow; no invite email). Restrict parent to income + manual scholarship entry only.
- [ ] T031 [US2] Seed institutions table: script or seed migration for community colleges, trade schools from College Scorecard or manual .edu list (research §5)
- [ ] T032 [US2] Seed career_outcomes table: script for top ~100 majors from BLS OEWS or CIP→SOC mapping (research §3)

**Checkpoint**: User Story 2 complete. ROI Auditor flow independently testable.

---

## Phase 5: User Story 3 - The Major Pivot (Priority: P3)

**Goal**: Undecided students get Coach personality questions; receive major/school suggestions aligned with strengths.

**Independent Test**: User indicates undecided; Coach poses interest/strength questions; recommendations return majors and schools matching answers.

### Implementation for User Story 3

- [ ] T033 [US3] Add undecided-major detection in `apps/agent/lib/load-profile.ts` and routing: when intended_major empty or "undecided", trigger Coach personality flow
- [ ] T034 [US3] Create Coach personality-question prompts in `apps/agent/lib/nodes/coach-major-pivot.ts` (or extend coach-prioritization): discern interests, strengths; map to CIP codes or major categories
- [ ] T035 [US3] Extend Coach recommendations in `apps/agent/lib/nodes/coach-major-pivot.ts`: include major and school suggestions from career_outcomes and institutions based on personality match; surface in messages or active_milestones

**Checkpoint**: User Story 3 complete. Major Pivot flow independently testable.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validation, cleanup, docs

- [ ] T036 Run quickstart.md verification: merit-first flow, parent link, ROI comparison
- [ ] T037 Regenerate Supabase types: `pnpm --filter @repo/db db:generate`; ensure no type errors in apps
- [ ] T038 [P] Add Loading and Empty states for ROI comparison UI per constitution
- [ ] T039 [P] Verify WCAG 2.1 AA for new UI (merit toggle, ROI cards, parent forms)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup; **BLOCKS all user stories**. Must run T010 to apply migrations before US1/US2/US3.
- **User Story 1 (Phase 3)**: Depends on Foundational
- **User Story 2 (Phase 4)**: Depends on Foundational
- **User Story 3 (Phase 5)**: Depends on Foundational; may use career_outcomes from US2
- **Polish (Phase 6)**: Depends on completed user stories

### User Story Dependencies

- **US1**: No dependency on US2/US3. Can ship as MVP alone.
- **US2**: No dependency on US1 (ROI UI standalone). Parent/ROI independent.
- **US3**: Can use career_outcomes; if seeded in US2, US3 benefits. May start after T032 or with stub data.

### Apply Migrations (USER REQUEST)

**CRITICAL**: After creating any new migration file, run:

```bash
pnpm --filter @repo/db db:push
```

This applies all pending migrations to the database. Task T010 explicitly performs this step after T003–T009. When adding new migrations in future work, always include an apply step.

### Parallel Opportunities

- T001, T002 can run in parallel
- T003–T009 are independent migration files — can be created in parallel
- Within US1: T013–T015 can run parallel; T021, T022, T023 can run parallel after agent nodes
- Within US2: T024–T027, T031–T032 can run parallel
- T036, T037, T038, T039 in Polish can run parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup
2. Phase 2: Foundational (create migrations, **apply migrations**, schema, seed)
3. Phase 3: User Story 1 (Merit Hunter)
4. **STOP and VALIDATE**: Run merit-first discovery test
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 → Merit Hunter MVP
3. Add US2 → ROI Auditor
4. Add US3 → Major Pivot
5. Polish
