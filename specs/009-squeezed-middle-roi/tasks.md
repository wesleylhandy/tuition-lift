# Tasks: Squeezed Middle & Alternative ROI Engine

**Input**: Design documents from `/specs/009-squeezed-middle-roi/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks grouped by user story for independent implementation and testing.

**DB Migrations**: Every phase that creates or modifies migrations includes an explicit "run migrations" task. Run `pnpm --filter @repo/db db:push` after creating migrations; then `pnpm --filter @repo/db db:generate` to refresh types. See T012, T013.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

TuitionLift Turborepo: `apps/web/`, `apps/agent/`, `packages/database/`

---

## Phase 1: Setup

**Purpose**: Environment and config preparation

- [x] T001 Add COLLEGE_SCORECARD_API_KEY, BLS_API_KEY to `apps/agent/.env.example` and `apps/web/.env.example` (SAI/merit config now in DB—no SAI_MERIT_THRESHOLD)
- [x] T002 [P] Add @repo/db exports for sai_zone_config and merit_tier_config queries (read by award_year); add to `packages/database/src/` if not existing; export from package for agent import

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema and migrations. **All user stories depend on this phase.**

**Apply migrations**: After T003–T011, run T012 to apply all migrations. Run T013 to refresh types.

- [x] T003 Create migration `packages/database/supabase/migrations/00000000000019_profiles_squeezed_middle.sql`: add sat_total (int 400–1600), act_composite (int 1–36), spikes (text[]), merit_filter_preference (text DEFAULT 'show_all' CHECK IN ('merit_only','show_all')), award_year (integer); per data-model.md §1
- [x] T004 Create migration `packages/database/supabase/migrations/00000000000020_scholarship_category_need_blind.sql`: ALTER TYPE scholarship_category ADD VALUE IF NOT EXISTS 'need_blind'
- [x] T005 Create migration `packages/database/supabase/migrations/00000000000021_sai_zone_config.sql`: create sai_zone_config (award_year PK, pell_cutoff, grey_zone_end, merit_lean_threshold, updated_at); RLS per data-model.md §3a
- [x] T006 Create migration `packages/database/supabase/migrations/00000000000022_merit_tier_config.sql`: create merit_tier_config with composite PK (award_year, tier_name); columns gpa_min, gpa_max, sat_min, sat_max, act_min, act_max, gpa_min_no_test, updated_at; RLS per data-model.md §3b
- [x] T007 Create migration `packages/database/supabase/migrations/00000000000023_parent_students.sql`: create parent_students (parent_id, student_id, linked_at); RLS per data-model.md §4
- [x] T008 Create migration `packages/database/supabase/migrations/00000000000024_parent_contributions.sql`: create parent_contributions (id, student_id, parent_id, contribution_type, payload jsonb, created_at); RLS per data-model.md §5
- [x] T009 Create migration `packages/database/supabase/migrations/00000000000025_institutions.sql`: create institutions per data-model.md §6 including coa column; indexes on institution_type, state, name (gin for search)
- [x] T010 Create migration `packages/database/supabase/migrations/00000000000026_career_outcomes.sql`: create career_outcomes per data-model.md §7; indexes on cip_code, soc_code, major_name
- [x] T011 Create migration `packages/database/supabase/migrations/00000000000027_user_saved_schools.sql`: create user_saved_schools (user_id, institution_id PK, saved_at); RLS per data-model.md §6a
- [x] T012 **Apply all migrations**: Run `pnpm --filter @repo/db db:push` from repo root. Verify migrations applied successfully.
- [x] T013 **Refresh types**: Run `pnpm --filter @repo/db db:generate` to regenerate Supabase types. Verify no type errors in apps.
- [x] T014 Update `packages/database/src/schema/profiles.ts` with sat_total, act_composite, spikes, merit_filter_preference, award_year; add Zod validation per data-model.md §1
- [x] T015 Seed sai_zone_config: Insert rows for current and next award year (e.g., 2026, 2027) with pell_cutoff (~7395), grey_zone_end (~25000), merit_lean_threshold (~30000). Add seed script or migration addendum. Document in quickstart.md.
- [x] T016 Seed merit_tier_config: Insert tier rows (presidential, deans, merit, incentive) per award year with GPA/SAT/ACT ranges and gpa_min_no_test; per research.md §2. Document in quickstart.md.

**Checkpoint**: Foundation ready. User story implementation can begin.

---

## Phase 3: User Story 1 - The Merit Hunter (Priority: P1) 🎯 MVP

**Goal**: High-SAI users toggle Merit only / Show all; receive merit-first ranked results; Coach surfaces Merit-Only/Need-Blind in top 3. Uses award-year-scoped sai_zone_config and merit_tier_config.

**Independent Test**: User with SAI > merit_lean_threshold (from sai_zone_config), award_year set, completes intake with GPA, SAT, spikes; selects Merit only; triggers discovery; sees scholarship list with need-based filtered; Coach Daily Game Plan shows merit/need_blind first.

### Implementation for User Story 1

- [x] T017 [US1] Extend `apps/agent/lib/load-profile.ts`: read sat_total, act_composite, spikes, merit_filter_preference, award_year from profiles; read sai_zone_config and merit_tier_config by award_year (default current year if null); derive merit_tier from merit_tier_config; compute sai_above_merit_threshold (sai >= merit_lean_threshold); output merit_filter_preference, sai_above_merit_threshold, merit_tier, award_year
- [x] T018 [US1] Extend `apps/agent/lib/state.ts` (or config): add merit_filter_preference, sai_above_merit_threshold, merit_tier, award_year to config or state
- [x] T019 [US1] Extend `apps/agent/lib/discovery/pii-scrub.ts`: add spikes to AnonymizedProfileSchema (array of strings, labels only); scrubPiiFromProfile extracts spikes, passes only safe labels (no PII)
- [x] T020 [US1] Add need_blind to VALID_CATEGORIES in `apps/agent/lib/discovery/scholarship-upsert.ts`
- [x] T021 [US1] Extend `apps/agent/lib/discovery/trust-scorer.ts` (or Advisor_Verify): infer need_blind when .edu domain + merit signals, no need-based; else merit or need_based
- [x] T022 [US1] Extend `apps/agent/lib/nodes/advisor-verify.ts`: when sai_above_merit_threshold and merit_filter_preference === 'merit_only', exclude need_based results from discovery_results. Separately extend `apps/agent/lib/discovery/query-generator.ts`: when merit-first, add merit/need-blind query hints to prompt
- [x] T023 [US1] Extend `apps/agent/lib/nodes/advisor-verify.ts`: set category need_blind for .edu merit; set merit or need_based per trust-scorer; ensure metadata.categories includes merit_tag
- [x] T024 [US1] Extend `apps/agent/lib/nodes/coach-prioritization.ts`: when sai_above_merit_threshold, sort merit/need_blind first; boost merit/need_blind score so they appear in top 3; when no merit results, surface alternative path options and message "Merit results limited; consider trade schools, community colleges"
- [x] T025 [US1] Extend `apps/web/lib/actions/onboarding.ts` saveAcademicProfile: add sat_total (400–1600), act_composite (1–36), spikes (array max 10), award_year (current or next year only) to input schema; persist to profiles
- [x] T026 [US1] Add merit filter toggle UI: wire to GET/PATCH `apps/web/app/api/merit/preference/route.ts`; read meritFilterPreference, saiAboveThreshold, awardYear; PATCH updates profiles.merit_filter_preference
- [x] T027 [US1] Extend onboarding Step 2 UI in `apps/web/app/onboarding/`: add SAT total, ACT composite, Spikes, award year (dropdown: current + next) fields; submit via saveAcademicProfile

**Checkpoint**: User Story 1 complete. Merit-first flow independently testable.

---

## Phase 4: User Story 2 - The ROI Auditor (Priority: P2)

**Goal**: Parent linked to student views ROI comparison (institutions, net price, year-5 income); can add income/manual scholarships; student can unlink. Users see COA comparison (SAI vs. avg COA of saved schools) and Need-to-Merit transition.

**Independent Test**: Parent with linked profile views GET /api/roi/comparison; sees 4-year vs community college vs trade school; adds income via POST /api/parents/contributions; student unlinks via DELETE /api/parents/link; parent loses access. Student adds saved schools; GET /api/coa/comparison shows SAI vs. avg COA and Need-to-Merit zone.

### Implementation for User Story 2

- [x] T028 [US2] Implement GET `apps/web/app/api/roi/comparison/route.ts`: auth user (student or linked parent); resolve student_id; query institutions (by path_types), career_outcomes; join applications (awarded + potential) for student; compute remainingConfirmed (netPrice − awarded) and remainingIfPotential; return per contracts/api-parents.md §4. Per FR-004, never misrepresent potential as guaranteed.
- [x] T029 [US2] Implement POST `apps/web/app/api/parents/link/route.ts`: student sends parentEmail; create/lookup parent; create parent_students link; per contracts/api-parents.md §1
- [x] T030 [US2] Implement DELETE `apps/web/app/api/parents/link/route.ts`: student sends parentId; delete parent_students row; per contracts/api-parents.md §2
- [x] T031 [US2] Implement POST `apps/web/app/api/parents/contributions/route.ts`: parent auth; validate linked to studentId; insert parent_contributions; per contracts/api-parents.md §3
- [x] T032 [US2] Add parent role support: profiles.role or auth raw_app_meta_data; RLS policies for parent_students and parent_contributions per data-model.md
- [x] T033 [US2] Implement GET `apps/web/app/api/coa/comparison/route.ts`: auth student; read profiles.sai (decrypt), profiles.award_year; query user_saved_schools + institutions (with coa); compute avg COA, COA−SAI per school; return per contracts/api-coa-comparison.md §1. Fallback to sai_zone_config when no saved schools.
- [x] T034 [US2] Implement POST `apps/web/app/api/coa/saved-schools/route.ts`: auth student; validate institutionId in institutions; insert user_saved_schools; per contracts/api-coa-comparison.md §2
- [x] T035 [US2] Implement DELETE `apps/web/app/api/coa/saved-schools/route.ts`: auth student; delete user_saved_schools row; per contracts/api-coa-comparison.md §3
- [x] T036 [US2] Implement GET `apps/web/app/api/coa/saved-schools/route.ts`: auth student; list user_saved_schools with institution details (name, type, coa, sticker_price, net_price); per contracts/api-coa-comparison.md §4
- [x] T037 [US2] Create ROI comparison UI in `apps/web/app/`: side-by-side cards for 4-year, community college, trade school; fetch GET /api/roi/comparison; display net price, remaining (confirmed), remaining (if potential) with "not guaranteed" labeling; year-5 income
- [x] T038 [US2] Create COA comparison UI: display SAI vs. avg COA; Need-to-Merit zone; add/remove saved schools; fetch GET /api/coa/comparison and GET /api/coa/saved-schools; POST/DELETE for save/unsave
- [x] T039 [US2] Create parent link flow: student enters parent email; POST /api/parents/link; parent account created if needed; restrict parent to income + manual scholarship only
- [x] T040 [US2] Seed institutions table: script or seed migration for community colleges, trade schools from College Scorecard or manual .edu list; include coa where available; per research §5
- [x] T041 [US2] Seed career_outcomes table: script for top ~100 majors from BLS OEWS or CIP→SOC mapping; per research §3

**Checkpoint**: User Story 2 complete. ROI Auditor and COA comparison independently testable.

---

## Phase 5: User Story 3 - The Major Pivot (Priority: P3)

**Goal**: Undecided students get Coach personality questions; receive major/school suggestions aligned with strengths.

**Independent Test**: User indicates undecided; Coach poses interest/strength questions; recommendations return majors and schools matching answers.

### Implementation for User Story 3

- [x] T042 [US3] Add undecided-major detection in `apps/agent/lib/load-profile.ts` and routing: when intended_major empty or "undecided", trigger Coach personality flow
- [x] T043 [US3] Create Coach personality-question prompts in `apps/agent/lib/nodes/coach-major-pivot.ts` (or extend coach-prioritization): discern interests, strengths; map to CIP codes or major categories
- [x] T044 [US3] Extend Coach recommendations in `apps/agent/lib/nodes/coach-major-pivot.ts`: include major and school suggestions from career_outcomes and institutions based on personality match; surface in messages or active_milestones

**Checkpoint**: User Story 3 complete. Major Pivot flow independently testable.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validation, cleanup, docs

- [x] T045 Run quickstart.md verification: merit-first flow, parent link, ROI comparison, COA comparison (add saved schools, verify Need-to-Merit display); verify intake with GPA, SAT, 2+ spikes completes in <5 min (SC-002)
- [x] T046 Regenerate Supabase types: `pnpm --filter @repo/db db:generate`; ensure no type errors in apps
- [x] T047 [P] Add Loading and Empty states for ROI comparison and COA comparison UI per constitution
- [x] T048 [P] Verify WCAG 2.1 AA for new UI (merit toggle, ROI cards, COA comparison, parent forms)
- [x] T049 Run Lighthouse Performance and Best Practices on merit-first discovery, ROI comparison, and COA comparison flows; verify 90+ on each per constitution §6

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup; **BLOCKS all user stories**. Must run T012 (db:push) and T013 (db:generate) after migrations before US1/US2/US3.
- **User Story 1 (Phase 3)**: Depends on Foundational
- **User Story 2 (Phase 4)**: Depends on Foundational
- **User Story 3 (Phase 5)**: Depends on Foundational; may use career_outcomes from US2
- **Polish (Phase 6)**: Depends on completed user stories

### Apply Migrations (User Request)

**CRITICAL**: After creating any new migration file:

1. Run `pnpm --filter @repo/db db:push` to apply migrations
2. Run `pnpm --filter @repo/db db:generate` to refresh Supabase types

T012 and T013 perform these steps after Phase 2 migrations. When adding migrations in future work, always include an apply + generate step.

### User Story Dependencies

- **US1**: No dependency on US2/US3. Can ship as MVP alone.
- **US2**: No dependency on US1. ROI and COA comparison standalone.
- **US3**: Can use career_outcomes; benefits if seeded in US2.

### Parallel Opportunities

- T001, T002 can run in parallel
- T003–T011 are independent migration files—can be created in parallel
- Within US1: T017–T020 can run parallel; T025–T027 can run parallel after agent nodes
- Within US2: T028–T032, T033–T036, T040–T041 can run parallel
- T045–T049 in Polish can run parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup
2. Phase 2: Foundational (create migrations, **apply migrations T012**, **refresh types T013**, schema, seed)
3. Phase 3: User Story 1 (Merit Hunter)
4. **STOP and VALIDATE**: Run merit-first discovery test
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 → Merit Hunter MVP
3. Add US2 → ROI Auditor + COA comparison
4. Add US3 → Major Pivot
5. Polish
