# Tasks: Scholarship Inbox & Dashboard

**Input**: Design documents from `/specs/006-scholarship-inbox-dashboard/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (US1–US6)
- Include exact file paths in descriptions

## Path Conventions

- **apps/web/**: Next.js app (App Router)
- **packages/database/**: Supabase migrations, shared schema

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependencies

- [x] T001 Add framer-motion to apps/web/package.json
- [x] T002 [P] Add shadcn skeleton, toast, sonner components via `pnpm dlx shadcn@latest add skeleton sonner` in apps/web
- [x] T003 [P] Create dashboard route group and page at apps/web/app/(auth)/dashboard/page.tsx (or apps/web/app/dashboard/page.tsx per existing auth layout)
- [x] T004 [P] Create apps/web/components/dashboard/bento-grid.tsx with Tailwind grid layout (responsive grid-cols, col-span, row-span for modular blocks)
- [x] T005 Add Toaster provider from sonner to apps/web app layout for toast notifications

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure required before user story implementation

- [x] T006 Create dismissals migration in packages/database/supabase/migrations/ (file: XXXXX_add_dismissals.sql) per data-model.md spec with RLS policies. **Depends on**: packages/database and prior migrations from 002-db-core-infrastructure; create package structure if missing.
- [x] T007 [P] Create Trust Shield util at apps/web/lib/utils/trust-shield.ts mapping trust_score to badge color (Green 80–100, Amber 60–79, Yellow 40–59, Red 0–39, gray for null)
- [x] T008 Implement trackScholarship Server Action in apps/web/lib/actions/track.ts per contracts/server-actions.md (authenticate, validate scholarship, insert applications)
- [x] T009 Implement dismissScholarship Server Action in apps/web/lib/actions/dismiss.ts per contracts/server-actions.md (authenticate, insert dismissals)
- [x] T010 Implement verifySubmission Server Action in apps/web/lib/actions/verify-submission.ts per contracts/server-actions.md (authenticate, validate ownership, update status)
- [x] T011 [P] Define design tokens in Tailwind config or CSS: Navy #1A1A40, Electric Mint #00FFAB, Off-White; serif for headings, sans-serif for body per FR-018, FR-019, FR-020
- [x] T012 Create apps/web/lib/hooks/use-realtime-matches.ts subscribing per contracts/realtime-channels.md: use Broadcast on `user:{userId}:discovery` for `new_matches` event (discovery results live in LangGraph checkpoint, not a Supabase table); optional polling of GET /api/discovery/results as fallback when Broadcast unavailable
- [x] T013 [P] Create apps/web/lib/hooks/use-realtime-applications.ts for applications table Postgres Changes per contracts/realtime-channels.md

**Checkpoint**: Foundation ready—user story implementation can begin

---

## Phase 3: User Story 1 - Prioritized Match Inbox with Live Activity (Priority: P1) MVP

**Goal**: Student views prioritized feed of Advisor discoveries with Live Pulse, Trust Shield, Coach's Take

**Independent Test**: Display match feed with varying trust scores; verify prioritization by trust_score and need_match_score; verify Live Pulse when discovery active

- [x] T014 [P] [US1] Create Trust Shield component at apps/web/components/dashboard/match-inbox/trust-shield.tsx using lib/utils/trust-shield.ts and render badge (Green/Amber/Yellow/Red/gray)
- [x] T015 [P] [US1] Create Coach's Take component at apps/web/components/dashboard/match-inbox/coaches-take.tsx displaying micro-summary (prop: coachTakeText or similar)
- [x] T016 [US1] Create Live Pulse component at apps/web/components/dashboard/match-inbox/live-pulse.tsx showing "Active Scouting" and domain ticker when scouting active per FR-002; use Broadcast (user:{userId}:discovery) for scouting event, or fallback to polling GET /api/discovery/status (lastActiveNode=Advisor_Search) per contracts/realtime-channels.md
- [x] T017 [US1] Create Match Card component at apps/web/components/dashboard/match-inbox/match-card.tsx with Trust Shield, Coach's Take, scholarship title, amount, deadline; wrap in motion.div for AnimatePresence
- [x] T018 [US1] Create Match Inbox component at apps/web/components/dashboard/match-inbox/match-inbox.tsx: fetch/sort matches by trust_score and need_match_score, render MatchCard list with AnimatePresence, integrate Live Pulse, subscribe via use-realtime-matches for new matches
- [x] T019 [US1] Wire Match Inbox data source to GET /api/discovery/results (003); consume discoveryRunId (camelCase in response; map to internal), results with discovery_run_id, trust_score, need_match_score, coachTake; filter out dismissed scholarships per current run. Pass coachTake to Coach's Take component (fallback to trustReport when coachTake null)
- [x] T020 [US1] Add Framer Motion entrance animation for new matches in Match Inbox (AnimatePresence, initial/animate/exit, key=id) per research.md

**Checkpoint**: Match Inbox fully functional; Trust Shield, Coach's Take, Live Pulse, real-time updates working

---

## Phase 4: User Story 2 - Coach's Game Plan with Top 3 Tasks (Priority: P1)

**Goal**: Student sees Top 3 Tasks, Debt Lifted ring, Next Win countdown

**Independent Test**: Supply applications with varying deadlines/trust; verify Top 3 ordered by momentum_score, Debt Lifted from Won apps, Next Win shows nearest deadline

- [x] T021 [P] [US2] Create Top Three Tasks component at apps/web/components/dashboard/game-plan/top-three-tasks.tsx displaying up to 3 applications ordered by momentum_score
- [x] T022 [P] [US2] Create Debt Lifted progress ring at apps/web/components/dashboard/game-plan/debt-lifted-ring.tsx showing cumulative $ from applications where status='awarded' AND confirmed_at IS NOT NULL (per 005)
- [x] T023 [P] [US2] Create Next Win countdown at apps/web/components/dashboard/game-plan/next-win-countdown.tsx showing nearest deadline or next actionable milestone
- [x] T024 [US2] Create Game Plan component at apps/web/components/dashboard/game-plan/game-plan.tsx composing Top Three Tasks, Debt Lifted ring, Next Win countdown; fetch applications with momentum_score (002 schema)
- [x] T025 [US2] Wire Game Plan to applications data; compute Debt Lifted from applications where status = 'awarded' AND confirmed_at IS NOT NULL (per 005); adapt layout when fewer than 3 tasks (no empty placeholders)

**Checkpoint**: Coach's Game Plan displays Top 3, Debt Lifted, Next Win correctly

---

## Phase 5: User Story 3 - Application Tracker Lifecycle View (Priority: P1)

**Goal**: Student sees applications in lifecycle stages: Tracked, Drafting, Review, Submitted, Outcome Pending; Won/Lost outcomes

**Independent Test**: Move applications through stages; verify tracker updates in real time; status persists correctly

- [x] T026 [P] [US3] Create Tracker Column component at apps/web/components/dashboard/application-tracker/tracker-column.tsx for one lifecycle stage (title, list of cards)
- [x] T027 [P] [US3] Create Application Card component at apps/web/components/dashboard/application-tracker/application-card.tsx displaying application/scholarship info, status, deadline
- [x] T028 [US3] Create Application Tracker component at apps/web/components/dashboard/application-tracker/application-tracker.tsx with columns for Tracked, Drafting, Review, Submitted, Outcome Pending; map DB status (draft, submitted, awarded, rejected, withdrawn) to display buckets per data-model.md lifecycle mapping
- [x] T029 [US3] Subscribe Application Tracker to applications table via use-realtime-applications for real-time status updates per FR-010
- [x] T030 [US3] Ensure Application Tracker receives and displays Won (awarded) and Lost (rejected) in outcome section or inline

**Checkpoint**: Application Tracker shows full lifecycle; real-time updates; status mapping correct

---

## Phase 6: User Story 4 - Quick Actions and Action Parity (Priority: P2)

**Goal**: Track, Dismiss, Verify Submission available on cards; toast with retry on failure

**Independent Test**: Click Track, Dismiss, Verify Submission; verify state updates; on server error, toast shows with retry

- [ ] T031 [US4] Add Quick Actions component or buttons to Match Card: Track, Dismiss; wire to trackScholarship and dismissScholarship Server Actions; pass discovery_run_id from match to dismissScholarship when available (003); toast on error and retry per FR-017
- [ ] T032 [US4] Add Verify Submission button to Application Card for Drafting/Review status; wire to verifySubmission Server Action with confirmation flow (per Coach spec); use React 19 useActionState where form-based; toast on error with retry
- [ ] T033 [US4] Ensure card state does not change until action succeeds; use startTransition for optimistic UX where appropriate; reject duplicate/conflicting rapid actions server-side
- [ ] T034 [US4] Add Quick Actions to Application Tracker application cards where context permits (e.g., Track if not yet tracked, Verify Submission if draft/review)

**Checkpoint**: Track, Dismiss, Verify Submission work from Match Inbox and Application Tracker; toast + retry on failure

---

## Phase 7: User Story 5 - Zero-State: Coach's Prep Checklist (Priority: P2)

**Goal**: When no matches, show dynamic Coach's Prep Checklist instead of blank state

**Independent Test**: View inbox with zero matches; verify checklist with actionable items from profile completeness and discovery state

- [ ] T035 [P] [US5] Create Coach's Prep Checklist component at apps/web/components/dashboard/coaches-prep-checklist.tsx
- [ ] T036 [US5] Implement dynamic checklist items: derive from profile (intended_major, state, GPA per 002 FR-014b; SAI for financial profile) completeness and discovery state (not run, zero results) per FR-015; e.g., missing major/state → "Complete your profile", missing GPA → "Complete your GPA", no discovery → "Start discovery"
- [ ] T037 [US5] Wire Match Inbox to show Coach's Prep Checklist when matches array is empty; fetch profile from shared layer to compute checklist items
- [ ] T038 [US5] Add links/actions to checklist items (e.g., navigate to profile edit, trigger discovery) where applicable

**Checkpoint**: Zero matches shows Coach's Prep Checklist with dynamic items; no blank state

---

## Phase 8: User Story 6 - Visual Identity and Accessibility (Priority: P2)

**Goal**: Serif headings, sans-serif body; Navy, Electric Mint, Off-White palette; Bento grid; WCAG 2.1 AA

**Independent Test**: Verify typography, colors, layout; run Lighthouse; zero critical a11y violations

- [ ] T039 [P] [US6] Apply serif font to dashboard headings (font-serif or custom) and sans-serif to body per FR-019
- [ ] T040 [P] [US6] Apply color palette Navy #1A1A40, Electric Mint #00FFAB, Off-White to dashboard components per FR-020
- [ ] T041 [US6] Ensure Bento grid adapts to 320px+ viewports; no horizontal scroll; blocks reflow per FR-018, SC-008
- [ ] T042 [US6] Add aria-labels, focus order, and ensure WCAG AA contrast on all interactive elements (buttons, links, cards); run axe or Lighthouse a11y audit

**Checkpoint**: Visual identity and accessibility meet spec; Lighthouse a11y pass

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Loading/error states, page composition, validation

- [ ] T043 [P] Add skeleton/placeholder loading states to Match Inbox, Game Plan, Application Tracker, and Coach's Prep Checklist during initial data load per FR-016; mirror final layout structure
- [ ] T044 Compose dashboard page at apps/web/app/(auth)/dashboard/page.tsx: Bento grid with Match Inbox, Game Plan, Application Tracker sections; integrate Coach's Prep Checklist in Match Inbox area when empty
- [ ] T045 Add subtle reconnection indicator when Supabase Realtime disconnects; degrade gracefully (data remains viewable)
- [ ] T046 Run quickstart.md verification: Trust Shield colors, Coach's Prep Checklist, Quick Actions toast, skeletons, Lighthouse Performance and Best Practices 90+, Lighthouse a11y (WCAG AA, zero critical violations). Verify SC-001 (Match Inbox load <2s), SC-002 (Live Pulse within 5s of scouting start), SC-004 (action feedback within 2s).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies—start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1; **blocks all user stories**
- **Phases 3–5 (US1, US2, US3)**: Depend on Phase 2; can proceed in parallel after Phase 2
- **Phase 6 (US4)**: Depends on Phase 3 (Match Inbox) and Phase 5 (Application Tracker)
- **Phase 7 (US5)**: Depends on Phase 3 (Match Inbox empty state)
- **Phase 8 (US6)**: Can run in parallel with Phases 3–7; applies to all components
- **Phase 9 (Polish)**: Depends on Phases 3–8

### User Story Dependencies

| Story | Depends On | Can Parallel With |
|-------|------------|-------------------|
| US1 | Foundational | US2, US3 |
| US2 | Foundational | US1, US3 |
| US3 | Foundational | US1, US2 |
| US4 | US1, US3 | US5, US6 |
| US5 | US1 | US2, US3, US4, US6 |
| US6 | Foundational | US1, US2, US3, US4, US5 |

### Within Each User Story

- Components before integration
- Data wiring before realtime
- Core implementation before polish

### Parallel Opportunities

- T002, T003, T004 in Setup
- T007, T011, T013 in Foundational
- T014, T015, T021, T022, T023, T026, T027, T035, T039, T040 within their phases
- US1, US2, US3 after Foundational complete
- T043 with other Polish tasks

---

## Parallel Example: User Story 1

```bash
# Parallel component creation:
Task T014: "Create Trust Shield component"
Task T015: "Create Coach's Take component"

# Then sequential:
Task T017: "Create Match Card" (uses T014, T015)
Task T018: "Create Match Inbox" (uses T016, T017)
```

---

## Parallel Example: Foundational

```bash
# After T006 (migration), these can run in parallel:
Task T007: "Trust Shield util"
Task T011: "Design tokens"
Task T013: "use-realtime-applications hook"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (Match Inbox)
4. **STOP and VALIDATE**: Test Match Inbox independently with mock/real discovery data
5. Deploy/demo Match Inbox

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1 (Match Inbox) → MVP
3. US2 (Game Plan) + US3 (Application Tracker) → Full dashboard
4. US4 (Quick Actions) → Actionable
5. US5 (Coach's Prep Checklist) → Zero-state
6. US6 (Visual Identity) + Polish → Production-ready

### Suggested MVP Scope

**Phase 1 + Phase 2 + Phase 3** = Match Inbox with prioritization, Trust Shield, Coach's Take, Live Pulse, real-time new matches. Delivers core engagement surface.

---

## Notes

- [P] = parallelizable; [USn] = user story label
- Paths use Turborepo structure: apps/web, packages/database
- Tests not explicitly requested in spec; omit test tasks
- Commit after each task or logical group
- Verify each checkpoint before proceeding
