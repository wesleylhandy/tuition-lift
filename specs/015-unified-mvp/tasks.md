# Tasks: Unified MVP — Deep-Scout, Data Integrity, and Account Alignment

**Input**: Design documents from `specs/015-unified-mvp/`  
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: No test tasks included—spec does not explicitly request TDD. Use quickstart.md verification steps.

**Organization**: Tasks grouped by user story for independent implementation and validation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- **Turborepo (TuitionLift)**: `apps/web/`, `apps/agent/`, `packages/database/`
- Migrations: `packages/database/supabase/migrations/`
- Schema/validation: `packages/database/src/schema/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify environment and feature readiness

- [x] T001 Verify feature branch `015-unified-mvp` and run `pnpm install` from repo root
- [x] T002 [P] Verify Constitution alignment per plan.md; no new violations introduced

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T003 Create migration `00000000000045_scholarships_content_hash.sql` in `packages/database/supabase/migrations/` — ADD COLUMN content_hash; CREATE UNIQUE INDEX
- [ ] T004 Create migration `00000000000046_user_saved_schools_status.sql` in `packages/database/supabase/migrations/` — ADD COLUMN status; CHECK constraint; UPDATE policy
- [ ] T005 Create migration `00000000000047_applications_merit_tag.sql` in `packages/database/supabase/migrations/` — ADD COLUMN merit_tag
- [ ] T006 Create migration `00000000000048_discovery_config.sql` in `packages/database/supabase/migrations/` — CREATE TABLE discovery_config; seed row id='default'
- [ ] T007 Run `pnpm --filter @repo/db exec supabase db push` to apply migrations
- [ ] T008 [P] Add getDiscoveryConfig() in `packages/database/src/config-queries.ts` returning DiscoveryConfig (id, cooldown_minutes, per_day_cap, max_depth, max_links_per_page, max_records_per_run)
- [ ] T009 [P] Add canTriggerDiscovery(userId) in `packages/database/src/config-queries.ts` — check discovery_completions for running/last run/count today; return { allowed, reason?, retryAfterMinutes? }
- [ ] T010 [P] Extend applications Zod schema with merit_tag in `packages/database/src/schema/applications.ts` — z.string().max(50).nullable().optional()
- [ ] T011 [P] Extend user_saved_schools validation with status in `packages/database/src/schema/` — z.enum(['applied','accepted','committed']).optional().default('applied')

**Checkpoint**: Foundation ready — user story implementation can begin

---

## Phase 3: User Story 1 — Reliable Track and Dismiss with Correct Scholarship Identity (P1) 🎯 MVP

**Goal**: Track and Dismiss target the correct scholarship record; no orphaned or mis-targeted records.

**Independent Test**: Run discovery → verify each result has stable identifier → perform Track and Dismiss → confirm correct DB records.

- [ ] T012 [US1] Compute content_hash at discovery in `apps/agent/lib/discovery/scholarship-upsert.ts` — hash(url || title || deadline || coalesce(amount::text,''))
- [ ] T013 [US1] Change upsert in `apps/agent/lib/discovery/scholarship-upsert.ts` to upsert by content_hash; ON CONFLICT(content_hash); propagate scholarship id to discovery_results
- [ ] T014 [US1] Ensure discovery state and pipeline propagate scholarship_id to discovery_results in `apps/agent/lib/` (state.ts, nodes)
- [ ] T015 [US1] Verify Track uses scholarship_id from API in `apps/web/lib/actions/track.ts`; ensure Match Inbox passes scholarshipId correctly
- [ ] T016 [US1] Verify Dismiss uses scholarship_id from API in `apps/web/lib/actions/dismiss.ts`; ensure discoveryRunId propagated for dismissals scoping
- [ ] T017 [US1] Ensure GET /api/discovery/results returns scholarship_id consistently in `apps/web/app/api/discovery/results/route.ts` (r.scholarship_id ?? r.id)

**Checkpoint**: US1 complete — Track and Dismiss target correct records

---

## Phase 4: User Story 2 — Coach's Take on Every Match Card (P1)

**Goal**: Every card displays a Coach's Take (one-sentence ROI micro-summary); placeholder on failure.

**Independent Test**: View match cards after discovery; each shows distinct Coach's Take or placeholder.

- [ ] T018 [US2] Add Coach's Take generation step in discovery pipeline in `apps/agent/lib/` (discovery or coach nodes) — synthesize trust_report, need_match_score, merit_tag
- [ ] T019 [US2] On generation failure (timeout, API error), set coach_take to placeholder "Review this opportunity—details in your Match Inbox" in agent
- [ ] T020 [US2] Ensure coach_take is never omitted in discovery results schema in `apps/agent/lib/discovery/schemas.ts` or state
- [ ] T021 [US2] Update Match Inbox fallback in `apps/web/components/dashboard/match-inbox/match-inbox.tsx` — use Coach's Take when present; placeholder when null (no Trust Report fallback for primary display)

**Checkpoint**: US2 complete — every card shows Coach's Take or placeholder

---

## Phase 5: User Story 3 — Match Inbox Displays Full Agent Data (P1)

**Goal**: Categories and verification_status pass through; no empty substitution; dedicated empty state for 0 results.

**Independent Test**: Discovery returns results with categories/verification_status → Match Inbox displays them; 0 results → empty state with CTA.

- [ ] T022 [US3] Ensure discovery results include categories and verification_status in agent state and pipeline in `apps/agent/lib/`
- [ ] T023 [US3] Pass through categories and verification_status in GET /api/discovery/results in `apps/web/app/api/discovery/results/route.ts` — no substitution with [] or null
- [ ] T024 [US3] Update Match Inbox consumer in `apps/web/components/dashboard/match-inbox/match-inbox.tsx` — do not overwrite categories or verification_status with empty arrays or nulls
- [ ] T025 [US3] Add dedicated empty state for 0 scholarships in `apps/web/components/dashboard/match-inbox/match-inbox.tsx` — "No matches yet" plus CTA to adjust profile or trigger discovery

**Checkpoint**: US3 complete — full agent data on cards; empty state when 0

---

## Phase 6: User Story 4 — Deep-Scout: Extract Scholarships from Aggregation/Institutional Lists (P1)

**Goal**: Extract individual scholarships from aggregation and institutional list pages; bounded depth and resource limits.

**Independent Test**: Run discovery against known aggregation URL; verify individual records extracted.

- [ ] T026 [US4] Create deep-scout sub-graph or node in `apps/agent/lib/discovery/` — BFS crawl; input: URL; output: extracted scholarship records
- [ ] T027 [US4] Read max_depth, max_links_per_page, max_records_per_run from getDiscoveryConfig in `apps/agent/lib/discovery/` deep-scout
- [ ] T028 [US4] Implement visited URL set and cycle detection in deep-scout to avoid infinite loops
- [ ] T029 [US4] On 403/timeout/CAPTCHA/rate-limit: log, skip page, continue with partial results in `apps/agent/lib/discovery/`
- [ ] T030 [US4] Integrate deep-scout into Advisor flow when aggregation or institutional list page detected in `apps/agent/lib/nodes/advisor-search.ts` or discovery pipeline
- [ ] T031 [US4] Apply in-state 1.2× weight when ranking results (profile state matching) in `apps/agent/lib/discovery/` or need-match-scorer

**Checkpoint**: US4 complete — individual scholarships extracted from aggregation pages

---

## Phase 7: User Story 5 — Verification Badges on Match Cards (P2)

**Goal**: Cards display "Verified [Year]" or "Potentially Expired" badge per cycle status.

**Independent Test**: Display cards with varied verification_status; correct badge shown.

- [ ] T032 [P] [US5] Create VerificationBadge component in `apps/web/components/dashboard/match-inbox/` — display "Verified [Year]" or "Potentially Expired"; WCAG contrast
- [ ] T033 [US5] Add VerificationBadge to MatchCard in `apps/web/components/dashboard/match-inbox/match-card.tsx` — pass verificationStatus prop from match data

**Checkpoint**: US5 complete — badges visible on match cards

---

## Phase 8: User Story 6 — College List and Commitment Logic (P1)

**Goal**: College list with status (Applied, Accepted, Committed); Committed elevates institutional scholarships to Critical in Game Plan.

**Independent Test**: Add institution, set Committed; verify institutional scholarships as Critical in Game Plan.

- [ ] T034 [US6] Create college-list Server Actions in `apps/web/lib/actions/college-list.ts` — CRUD for user_saved_schools; add status (applied|accepted|committed); enforce max 10 (configurable)
- [ ] T035 [US6] Implement Coach commitment logic in `apps/agent/lib/coach/game-plan.ts` — load user_saved_schools where status='committed'; elevate institutional scholarships for those schools to Critical severity

**Checkpoint**: US6 complete — college list status; Coach elevates Committed-school scholarships

---

## Phase 9: User Story 7 — Debt Lifted Header Reflects Won Applications (P2)

**Goal**: Header shows sum of award amounts for applications with status Won (awarded + confirmed_at).

**Independent Test**: Create Won applications with known amounts; header displays correct sum.

- [ ] T036 [US7] Compute Debt Lifted from applications in `apps/web/components/` (dashboard header) — SUM(scholarships.amount) where status='awarded' (application_status enum) AND confirmed_at IS NOT NULL; see quickstart §6
- [ ] T037 [US7] Add K/M abbreviation in Debt Lifted display (K at 1,000, M at 1M) in header component; configurable per contract

**Checkpoint**: US7 complete — Debt Lifted reflects Won application amounts

---

## Phase 10: User Story 8 — Merit-First Mode for High-SAI Students (P2)

**Goal**: SAI > threshold → merit/need-blind prioritized; persist merit_tag on Track; Coach prioritizes merit-tagged.

**Independent Test**: Onboarding with SAI > 10k; discovery prioritizes merit; Track persists merit_tag.

- [ ] T038 [US8] Extend trackScholarship to accept and persist merit_tag in `apps/web/lib/actions/track.ts` — z.string().max(50).nullable().optional()
- [ ] T039 [US8] Ensure GET /api/discovery/results includes meritTag; Match Inbox and MatchCard pass merit_tag to trackScholarship in `apps/web/app/api/discovery/results/route.ts` and `apps/web/components/dashboard/match-inbox/match-card.tsx`
- [ ] T040 [US8] Ensure Advisor merit-first logic uses getMeritFirstThreshold in `apps/agent/lib/` (advisor-search or discovery) — prioritize need-blind and institutional merit when SAI > threshold
- [ ] T041 [US8] Fallback to full mixed ranking when merit-first finds no merit/need-blind results in `apps/agent/lib/`
- [ ] T042 [US8] Update Coach game plan to prioritize merit_tag and need_match_score in `apps/agent/lib/coach/game-plan.ts`

**Checkpoint**: US8 complete — merit-first mode; merit_tag persisted; Coach prioritization

---

## Phase 11: User Story 9 — User Account Modal for Profile and College List (P1)

**Goal**: Modal to edit profile (major, state, GPA, SAI, etc.) and institutions; persist changes; discard confirmation on close.

**Independent Test**: Open modal → edit profile/institutions → save → verify discovery/Coach use updated data; close with unsaved → confirm dialog.

- [ ] T043 [US9] Create profile update Server Action in `apps/web/lib/actions/profile-update.ts` — Zod validation for intended_major, state, gpa_unweighted, sai, pell_eligibility_status, award_year, etc.; optimistic locking via updated_at
- [ ] T044 [US9] Create User Account modal component in `apps/web/components/dashboard/account/` — profile edit form + college list (uses college-list actions from US6)
- [ ] T045 [US9] Add discard confirmation ("Discard changes?" Cancel/Confirm) when closing with unsaved changes in account modal
- [ ] T046 [US9] Add account trigger (e.g., header avatar/button) to open modal from dashboard in `apps/web/components/dashboard/` or header
- [ ] T047 [US9] Ensure modal meets WCAG 2.1 AA (keyboard, focus, landmarks)

**Checkpoint**: US9 complete — account modal; profile and college list editable; discard confirmation

---

## Phase 12: User Story 10 — Manual Discovery Trigger and Clear Navigation (P1)

**Goal**: Dashboard has "Run Discovery" trigger or clear link to /discovery; rate limits; block when running; error + retry on failure.

**Independent Test**: Locate trigger from dashboard; run discovery; loading/success/error feedback; block when in progress.

- [ ] T048 [US10] Call canTriggerDiscovery before Inngest.send in POST /api/discovery/trigger in `apps/web/app/api/discovery/trigger/route.ts`; return 429 with retry-after when blocked
- [ ] T049 [US10] Add profile completeness check (award_year, major, state, GPA per FR-016) in trigger route — return 400 if missing
- [ ] T050 [US10] Add "Run Discovery" button or trigger to dashboard in `apps/web/app/(auth)/dashboard/` or layout; visible and actionable
- [ ] T051 [US10] Add link to /discovery from dashboard when inline trigger not primary path in `apps/web/components/`
- [ ] T052 [US10] Implement loading state and "Discovery in progress" when status=running; disable trigger until complete in dashboard
- [ ] T053 [US10] Show inline error message with retry control when discovery fails in `apps/web/components/` (dashboard)

**Checkpoint**: US10 complete — discovery trigger visible; rate limits; feedback; retry on failure

---

## Phase 13: User Story 11 — Protected Routes and Incomplete Profile Redirect (P1)

**Goal**: Unauthenticated → sign-in; authenticated incomplete (award_year, major, state, GPA missing) → onboarding; SAI optional.

**Independent Test**: Access dashboard unauthenticated → sign-in; incomplete profile → onboarding; complete → dashboard.

- [ ] T054 [US11] Add auth check in middleware or layout for `/dashboard`, `/scout`, discovery routes in `apps/web/middleware.ts` or `apps/web/app/` — redirect unauthenticated to sign-in
- [ ] T055 [US11] Add profile completeness check (award_year, intended_major, state, gpa_unweighted or gpa) in `apps/web/` — redirect to onboarding when incomplete; SAI must NOT block
- [ ] T056 [US11] Ensure protected route logic covers dashboard, scout, and discovery flow in `apps/web/`

**Checkpoint**: US11 complete — protected routes; profile completeness redirect

---

## Phase 14: Polish & Cross-Cutting Concerns

**Purpose**: Monitoring, observability, and validation

- [ ] T057 [P] Emit structured logs at discovery completion in `apps/agent/lib/` — duration, success/fail, record_count
- [ ] T058 [P] Update CoachesTake component fallback in `apps/web/components/dashboard/match-inbox/coaches-take.tsx` — use spec placeholder when coachTake null (no trustReport fallback for Coach's Take display)
- [ ] T059 Run quickstart.md verification steps 1–6 (US1, US2, US3, US4, US6, US7, US9, US10, US11)
- [ ] T060 Code cleanup and any remaining cross-cutting fixes per plan.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Stories (Phase 3–13)**: All depend on Foundational completion
- **Polish (Phase 14)**: Depends on desired user stories complete

### User Story Dependencies

| Story | Depends On | Notes |
|-------|------------|-------|
| US1 | Foundation | Identity propagation; content_hash migration |
| US2 | Foundation | Coach's Take generation in agent |
| US3 | Foundation | Pass-through; empty state |
| US4 | Foundation, T008 | Deep-scout; needs getDiscoveryConfig |
| US5 | US3 | Badges use verification_status from US3 |
| US6 | Foundation | College list; Coach commitment |
| US7 | Foundation | Debt Lifted; no schema change |
| US8 | Foundation, T038 | merit_tag; Track extend |
| US9 | US6 | Account modal uses college-list actions |
| US10 | Foundation, T009 | Trigger; canTriggerDiscovery |
| US11 | Foundation | Middleware; profile check |

### Parallel Opportunities

- **Phase 2**: T008, T009, T010, T011 can run in parallel
- **Phase 7**: T032 is [P]
- **Phase 14**: T057, T058 are [P]
- **Across stories**: US1–US4, US6–US8, US10–US11 can proceed in parallel after Foundation (US5 after US3; US9 after US6)

---

## Parallel Example: Foundational Phase

```bash
# After migrations applied (T003–T007):
Task T008: getDiscoveryConfig in config-queries.ts
Task T009: canTriggerDiscovery in config-queries.ts
Task T010: applications merit_tag Zod in schema/applications.ts
Task T011: user_saved_schools status validation
```

---

## Implementation Strategy

### MVP First (Core P1 Stories)

1. Complete Phase 1: Setup  
2. Complete Phase 2: Foundational  
3. Complete Phase 3 (US1): Track/Dismiss identity  
4. Complete Phase 4 (US2): Coach's Take  
5. Complete Phase 5 (US3): Full agent data pass-through  
6. Complete Phase 6 (US4): Deep-scout (or defer to next increment)  
7. Complete Phase 11 (US9): Account modal  
8. Complete Phase 12 (US10): Discovery trigger  
9. Complete Phase 13 (US11): Protected routes  
10. **STOP and VALIDATE** per quickstart.md

### Incremental Delivery

- Foundation → US1 → US2 → US3 → validate Match Inbox  
- Add US4 (deep-scout) → US5 (badges)  
- Add US6 → US9 (college list + modal)  
- Add US7 (Debt Lifted), US8 (merit-first), US10 (trigger), US11 (routes)  
- Polish (T057–T060)

---

## Notes

- [P] tasks = different files, no dependencies on other in-progress tasks
- [Story] label maps task to user story for traceability
- Each user story is independently completable and testable
- Commit after each task or logical group
- Validate at checkpoints per quickstart.md
- Avoid: vague tasks, same-file conflicts, cross-story dependencies that break independence
