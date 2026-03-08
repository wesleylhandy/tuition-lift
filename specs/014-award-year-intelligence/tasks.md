# Tasks: User-Specific Award Year Logic and Intelligence Persistence

**Input**: Design documents from `/specs/014-award-year-intelligence/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/, research.md, quickstart.md

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (US1–US7)
- Include exact file paths in descriptions

## Path Conventions (Turborepo)

- `apps/web/` — Next.js user-facing app
- `apps/agent/` — LangGraph agent
- `packages/database/` — @repo/db (Supabase, migrations, schema)

---

## Phase 1: Setup

**Purpose**: Verify environment and migration numbering

- [x] T001 Verify feature branch `014-award-year-intelligence` and migration sequence (next: 35, 36, 37) in packages/database/supabase/migrations/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: DB schema and shared utilities that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 Create migration 00000000000035_applications_need_match_score.sql: ADD COLUMN need_match_score numeric(5,2) to applications in packages/database/supabase/migrations/
- [x] T003 Create migration 00000000000036_scholarship_cycle_verifications.sql: CREATE TABLE with scholarship_id, academic_year, verified_at; UNIQUE(scholarship_id, academic_year); RLS; indexes in packages/database/supabase/migrations/
- [x] T004 Create migration 00000000000037_merit_first_config.sql: CREATE TABLE with award_year PK, merit_first_sai_threshold, updated_at; RLS per sai_zone_config pattern in packages/database/supabase/migrations/
- [x] T005 [P] Add need_match_score to applicationSchema (z.number().min(0).max(100).nullable().optional()) in packages/database/src/schema/applications.ts
- [x] T006 [P] Add getMeritFirstThreshold(awardYear: number): Promise<number | null> in packages/database/src/config-queries.ts
- [x] T007 [P] Add isScholarshipVerifiedForCycle and upsertScholarshipCycleVerification helpers in packages/database/src/ (or config-queries.ts)
- [x] T008 Add awardYearToAcademicYear(yr: number): string helper returning "YYYY-YYYY" in packages/database/src/ or apps/web/lib/utils/academic-year.ts
- [x] T009 Update profile award_year Zod range to dynamic currentYear..(currentYear+4) at validation boundary; document in packages/database/src/schema/profiles.ts

**Checkpoint**: Migrations applied; schema and config queries ready

---

## Phase 3: User Story 6 — Target Award Year First Onboarding (P1) 🎯 MVP

**Goal**: Target Award Year is the first required data-gathering step; range current year through 4 years ahead; block advancement until selected.

**Independent Test**: Start onboarding; verify Step 0 (Award Year) is first and required; select year; advance to Identity; verify award year persisted to profile.

- [x] T010 [US6] Add Step0Form (Target Award Year selector) with range currentYear..currentYear+4, required, WCAG 2.1 AA in apps/web/components/onboard/
- [x] T011 [US6] Update OnboardWizard to 4 steps: Step 0 (Award Year) → Step 1 (Identity) → Step 2 (Academic) → Step 3 (Financial) in apps/web/components/onboard/onboard-wizard.tsx
- [x] T012 [US6] Add OnboardStepProvider state for award_year; pass from Step 0 to Step 1; persist on account creation in apps/web/components/onboard/onboard-step-provider.tsx and step1-form
- [x] T013 [US6] Update onboarding Server Action to accept and validate award_year (currentYear..currentYear+4), include in profile upsert in apps/web/lib/actions/onboarding.ts
- [x] T014 [US6] Update ProgressBar for 4 steps (1 of 4, 2 of 4, etc.) in apps/web/components/onboard/progress-bar.tsx
- [x] T015 [US6] Update useOnboardInitialStep to handle Step 0 resume logic when user returns mid-flow in apps/web/components/onboard/onboard-step-provider.tsx

**Checkpoint**: New users must select award year first; selection persisted to profile

---

## Phase 4: User Story 1 — Award-Year-Driven Search and Applications (P1)

**Goal**: All discovery, tracking, and application logic uses profile award_year; no system-clock-derived academic year when profile has award_year.

**Independent Test**: User with award_year 2027 completes onboarding, triggers discovery, tracks scholarship; verify application uses academic_year "2027-2028"; discovery queries target 2027–2028.

- [x] T016 [US1] Update trackScholarship to fetch profile, derive academic_year from profile.award_year via awardYearToAcademicYear; block tracking when award_year null in apps/web/lib/actions/track.ts
- [x] T017 [US1] Add optional need_match_score param to trackScholarship; include in applications upsert when provided in apps/web/lib/actions/track.ts
- [x] T018 [US1] Update MatchCard to call trackScholarship(scholarshipId, needMatchScore) when Track clicked; pass needMatchScore from discovery result; remove academicYear param (track derives from profile per T016) in apps/web/components/dashboard/match-inbox/match-card.tsx
- [x] T019 [US1] Update confirmScoutScholarship to fetch profile, derive academic_year from award_year; block when null in apps/web/lib/actions/scout.ts
- [x] T020 [US1] Update getTrackedScholarshipIds to accept optional academicYear or fetch profile award_year; use derived academic year instead of getCurrentAcademicYear in apps/web/lib/actions/get-tracked-scholarship-ids.ts
- [x] T021 [US1] Update load-profile to ensure award_year is loaded and passed to graph state in apps/agent/lib/load-profile.ts
- [x] T022 [US1] Inject user award_year into Advisor query generation (QueryGenerator or advisor-search) so search targets correct cycle in apps/agent/lib/nodes/advisor-search.ts or discovery/
- [x] T023 [US1] Block discovery and tracking when profile has no award_year; surface prompt in UI (dashboard, Match Inbox) per edge case in apps/web/

**Checkpoint**: Applications use profile-derived academic_year; discovery queries use user award year

---

## Phase 5: User Story 2 — Need-Match Score Persistence (P1)

**Goal**: When tracking from Discovery Feed, need_match_score from Advisor is persisted to application; Scout path allows null.

**Independent Test**: Trigger discovery, receive results with need_match_score, track from feed; verify application.need_match_score persisted; Scout add yields null.

- [x] T025 [US2] Verify trackScholarship upsert includes need_match_score when provided (from T017) in apps/web/lib/actions/track.ts
- [x] T026 [US2] Ensure Scout confirmScoutScholarship does NOT pass need_match_score (null) in apps/web/lib/actions/scout.ts
- [x] T027 [US2] Expose need_match_score in applications API/coach status for prioritization display in apps/web/app/api/coach/application/status/route.ts or equivalent

**Checkpoint**: Discovery-tracked applications have need_match_score; Scout applications have null

---

## Phase 6: User Story 3 — Merit-First Mode for High-SAI Students (P2)

**Goal**: When SAI exceeds configurable threshold, Advisor prioritizes Need-Blind and merit-tier over Pell-based; threshold from merit_first_config.

**Independent Test**: User with SAI > threshold completes discovery; verify top results are Need-Blind/merit-tier; change threshold in DB, verify behavior updates.

- [x] T029 [US3] Fetch merit_first_sai_threshold via getMeritFirstThreshold(profile.award_year) in Advisor flow in apps/agent/lib/nodes/advisor-verify.ts or discovery/
- [x] T030 [US3] When profile.sai > threshold, activate Merit-First Mode: reorder/prioritize Need-Blind and merit-tier results over Pell-based in apps/agent/lib/nodes/advisor-verify.ts
- [x] T031 [US3] Seed merit_first_config with default threshold (e.g., 15000) for 2025–2029 in migration or seed script in packages/database/supabase/migrations/

**Checkpoint**: High-SAI users receive merit-first ranked results

---

## Phase 7: User Story 4 — DB-First Discovery and Cycle-Aware Verification (P2)

**Goal**: Advisor queries scholarships (trust_score ≥ 60) before external search; past-deadline scholarships flagged for re-verification; use scholarship_cycle_verifications.

**Independent Test**: Seed high-trust scholarships; trigger discovery; verify DB query runs first; scholarship with past deadline flagged for re-verification.

- [x] T032 [US4] Create db-first lookup module: query scholarships WHERE trust_score >= 60, match profile + award year in apps/agent/lib/discovery/db-first-lookup.ts
- [x] T033 [US4] Integrate scholarship_cycle_verifications: check isScholarshipVerifiedForCycle; flag past-deadline scholarships for re-verification in apps/agent/lib/discovery/db-first-lookup.ts
- [x] T034 [US4] Invoke DB-first lookup BEFORE external search in Advisor_Search or discovery flow in apps/agent/lib/nodes/advisor-search.ts
- [x] T035 [US4] Merge DB results with external search results; de-duplicate; apply cycle verification flags in apps/agent/lib/nodes/advisor-search.ts

**Checkpoint**: Discovery queries DB first; cycle verification enforced

---

## Phase 8: User Story 5 — Alternative Path ROI for Squeezed Middle (P3)

**Goal**: Coach includes Alternative Path comparisons for Squeezed Middle when data available; omit when no data (no placeholder).

**Independent Test**: Squeezed Middle user receives Coach recommendations; when 009 catalog has data, comparison shown; when not, omitted.

- [x] T036 [US5] In Coach Game Plan / recommendations, check if user is Squeezed Middle (009 SAI zone) in apps/agent/lib/coach/
- [x] T037 [US5] When Squeezed Middle, query 009 Alternative Path catalog; if data exists, include Trade School vs 4-Year comparison; if not, omit block in apps/agent/lib/coach/game-plan.ts or equivalent
- [x] T038 [US5] Ensure comparison is clearly labeled and avoids misrepresentation per 009 in apps/agent/lib/coach/

**Checkpoint**: Squeezed Middle users get Alternative Path when data available; no empty placeholder

---

## Phase 8.5: User Story 7 — Expanded Discovery Criteria (P2)

**Goal**: Discovery queries include state (local/regional), saved institutions (institution-specific), and optional first-gen/parent employer/identity when profile supports. State already in AnonymizedProfile (C1); add saved institutions.

**Independent Test**: User with state=CA and saved institutions triggers discovery; verify queries include "California" and institution names (e.g., "UCLA scholarships").

- [x] T039 [US7] Verify profile schema has first_generation, parent_employer_category, identity_eligibility_categories per 002/008; add migration if missing in packages/database/supabase/migrations/
- [x] T040 [US7] Extend AnonymizedProfileSchema with first_gen, parent_employer_category, identity_eligibility_categories (broad labels only) in apps/agent/lib/discovery/schemas.ts
- [x] T041 [US7] Extend formatProfileForPrompt to include first-gen, parent employer, identity angles when present in apps/agent/lib/discovery/query-generator.ts
- [x] T042 [US7] Vary query generation by geographic scope (local, regional, national) when state or preference available in apps/agent/lib/discovery/query-generator.ts
- [x] T043 [US7] Add getSavedInstitutionNamesForUser(userId: string): Promise<string[]> in packages/database — query user_saved_schools join institutions, return institution names (max 10)
- [x] T044 [US7] Extend AnonymizedProfileSchema with savedInstitutionNames: z.array(z.string().max(200)).max(10).optional() in apps/agent/lib/discovery/schemas.ts
- [x] T045 [US7] Extend formatProfileForPrompt in query-generator to include "Saved schools: X, Y" when savedInstitutionNames present in apps/agent/lib/discovery/query-generator.ts
- [x] T046 [US7] In Advisor_Search, load saved institution names via getSavedInstitutionNamesForUser when userId available; merge into profile before calling generateQueries in apps/agent/lib/nodes/advisor-search.ts

**Checkpoint**: Users with state and/or saved institutions receive discovery queries targeting local/regional and institution-specific scholarships (SC-008, SC-009)

---

## Phase 9: Polish & Cross-Cutting

**Purpose**: Edge cases, validation, and verification

- [x] T048 Surface "You have applications for a different year" when user changes award_year and has existing applications for other year in apps/web/ (optional UX)
- [x] T049 Run quickstart.md verification: SC-001, SC-002, SC-003, SC-004, SC-006, SC-008, SC-009 in specs/014-award-year-intelligence/quickstart.md
- [x] T050 Remove or deprecate getCurrentAcademicYear usage for application/discovery flows; replace with profile-derived academic year in apps/web/lib/utils/academic-year.ts (keep for legacy if needed)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1**: No dependencies
- **Phase 2**: Depends on Phase 1 — BLOCKS all user stories
- **Phase 3 (US6)**: Depends on Phase 2 — MVP; establishes award year collection
- **Phase 4 (US1)**: Depends on Phase 2, 3 — uses award_year from profile
- **Phase 5 (US2)**: Depends on Phase 2, 4 — need_match_score + track flow
- **Phase 6 (US3)**: Depends on Phase 2 — merit_first_config
- **Phase 7 (US4)**: Depends on Phase 2 — scholarship_cycle_verifications
- **Phase 8 (US5)**: Depends on 009 — Coach + Alternative Path
- **Phase 8.5 (US7)**: Depends on Phase 2, 4 — uses state (C1) and discovery flow; requires user_saved_schools (009)
- **Phase 9**: Depends on Phases 3–8.5

### User Story Dependencies

- **US6 (P1)**: No story deps — can start after Phase 2
- **US1 (P1)**: Depends on US6 (award year must be collected first)
- **US2 (P1)**: Depends on US1 (track flow uses profile academic year)
- **US3 (P2)**: Independent after Phase 2
- **US4 (P2)**: Independent after Phase 2
- **US5 (P3)**: Depends on 009 implementation
- **US7 (P2)**: Depends on Phase 2, 4 — state already in AnonymizedProfile (C1); saved institutions from user_saved_schools (009)

### Parallel Opportunities

- T002, T003, T004 (migrations) can run sequentially but are independent files
- T005, T006, T007 within Phase 2 can run in parallel
- US3, US4 can be implemented in parallel after Phase 2
- T029, T030 (US3) sequential within story
- T032, T033 (US4) sequential; T034, T035 integrate

---

## Implementation Strategy

### MVP First (US6 + US1 + US2)

1. Phase 1 + 2 (Setup + Foundational)
2. Phase 3 (US6) — Award year first in onboarding
3. Phase 4 (US1) — Award-year-driven logic
4. Phase 5 (US2) — Need-match persistence
5. **STOP and VALIDATE**: SC-001, SC-002, SC-006

### Incremental Delivery

1. Foundation → US6 → US1 → US2 (MVP)
2. Add US3 (Merit-First) → Add US4 (DB-First)
3. Add US5 (Alternative Path) → Add US7 (Expanded Discovery Criteria)
4. Polish

---

## Task Summary

| Phase | Tasks | Story |
|-------|-------|-------|
| 1 Setup | T001 | — |
| 2 Foundational | T002–T009 | — |
| 3 US6 | T010–T015 | P1 |
| 4 US1 | T016–T023 | P1 |
| 5 US2 | T025–T027 | P1 |
| 6 US3 | T029–T031 | P2 |
| 7 US4 | T032–T035 | P2 |
| 8 US5 | T036–T038 | P3 |
| 8.5 US7 | T039–T046 | P2 |
| 9 Polish | T048–T050 | — |

**Total**: 47 tasks
