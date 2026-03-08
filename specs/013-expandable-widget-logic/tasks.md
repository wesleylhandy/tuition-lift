# Tasks: Expandable Widget Logic and State

**Input**: Design documents from `/specs/013-expandable-widget-logic/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: E2E tasks included per plan.md (Playwright for expand/collapse, URL sync, back-button).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5, US6)
- Include exact file paths in descriptions

## Path Conventions

- **Turborepo (TuitionLift)**: `apps/web/`, `packages/db/`, `packages/ui/`
- All expandable widget logic in `apps/web/components/dashboard/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Dependencies and project structure per plan.md

- [x] T001 Add @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities to apps/web/package.json
- [x] T002 [P] Verify Framer Motion 12 present in apps/web/package.json (already installed)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Reusable expandable widget abstraction (FR-000). MUST complete before any user story.

**Checkpoint**: Foundation ready — user story implementation can begin

- [x] T003 Create WIDGET_IDS registry (kanban, repository, calendar) in apps/web/lib/constants/widget-ids.ts
- [x] T004 Create useViewParam hook (expandedWidgetId, isExpanded, expand, close) using useSearchParams + router in apps/web/lib/hooks/use-view-param.ts
- [x] T005 Create ExpandableWidget component with props widgetId, title, dashboardContent, expandedContent, headerActions in apps/web/components/dashboard/expandable-widget/expandable-widget.tsx
- [x] T006 Create ExpandableWidgetContext providing expand/close and isExpanded to expanded overlay content in apps/web/components/dashboard/expandable-widget/expandable-widget-context.tsx
- [x] T007 Add Escape key listener to close expanded view and focus return in apps/web/components/dashboard/expandable-widget/expandable-widget.tsx
- [x] T008 Implement Framer Motion AnimatePresence + motion.div transitions (opacity/scale) for expand/collapse in apps/web/components/dashboard/expandable-widget/expandable-widget.tsx
- [x] T009 Add expand and close controls (min 44×44px, keyboard operable, aria-label) per FR-016 in apps/web/components/dashboard/expandable-widget/expandable-widget.tsx

---

## Phase 3: User Story 1 - Expand and Collapse Bento Widgets (Priority: P1) — MVP

**Goal**: Each bento widget has expand control; expanding shows full-viewport overlay; close/Escape returns to dashboard; transitions are smooth.

**Independent Test**: Expand each widget (Game Plan, Discovery Feed, Calendar), verify expanded layout, collapse via close or Escape, confirm return to dashboard with smooth transitions.

### Implementation for User Story 1

- [x] T010 [P] [US1] Create KanbanBoard shell (To Do, In Progress, Done columns; placeholder task cards) in apps/web/components/dashboard/game-plan/kanban-board.tsx
- [x] T011 [P] [US1] Create ScholarshipRepository shell (search bar placeholder, filter placeholder, scrollable area) in apps/web/components/dashboard/match-inbox/scholarship-repository.tsx
- [x] T012 [P] [US1] Create SeverityHeatmap shell (12-month grid placeholder, legend placeholder) in apps/web/components/dashboard/deadline-calendar/severity-heatmap.tsx
- [x] T013 [US1] Wrap GamePlan section with ExpandableWidget; dashboardContent = SectionShell + GamePlan, expandedContent = KanbanBoard in apps/web/app/(auth)/dashboard/page.tsx
- [x] T014 [US1] Wrap MatchInbox section with ExpandableWidget; dashboardContent = SectionShell + MatchInbox, expandedContent = ScholarshipRepository in apps/web/app/(auth)/dashboard/page.tsx
- [x] T015 [US1] Wrap DeadlineCalendarShell section with ExpandableWidget; dashboardContent = existing shell, expandedContent = SeverityHeatmap in apps/web/app/(auth)/dashboard/page.tsx
- [x] T016 [US1] Ensure dashboard client reads searchParams (wrap bento in Suspense if needed for useSearchParams) in apps/web/app/(auth)/dashboard/page.tsx

**Checkpoint**: User Story 1 complete — expand/collapse works for all three widgets; transitions smooth; Escape closes.

---

## Phase 4: User Story 2 - Shareable Links and Back-Button Support (Priority: P2)

**Goal**: URL includes ?view=<widgetId> when expanded; opening URL with valid view param loads expanded view directly; back/forward restore correct view.

**Independent Test**: Copy URL when expanded, open in new tab → lands in expanded view. Navigate expand → close → back → returns to expanded view.

### Implementation for User Story 2

- [x] T017 [US2] Wire useViewParam: router.push with ?view=<widgetId> on expand, router.replace to remove view on close in apps/web/lib/hooks/use-view-param.ts
- [x] T018 [US2] Handle invalid/unknown view param → treat as null (dashboard); no error page per FR-014 in apps/web/lib/hooks/use-view-param.ts
- [x] T019 [US2] Verify initial load with ?view=kanban|repository|calendar opens corresponding expanded view in apps/web/app/(auth)/dashboard/page.tsx

**Checkpoint**: User Story 2 complete — shareable links and back-button work as expected.

**Note**: Unauthenticated user opening shared expanded link is handled by spec 012 auth bridge (redirect to login; URL preserved for post-auth restore). No additional task in 013.

---

## Phase 5: User Story 3 - Match Cards with Trust and Coach Guidance (Priority: P2)

**Goal**: Each Match Card displays Trust Shield, Match Strength bar, and Coach's Take; placeholders when data missing.

**Independent Test**: Load Discovery Feed with match data; verify Trust Shield, Match Strength bar, Coach's Take on each card; verify placeholder behavior when null.

### Implementation for User Story 3

- [x] T020 [P] [US3] Create MatchStrengthBar component (value 0–100, progress bar + percentage; null → placeholder) in apps/web/components/dashboard/match-inbox/match-strength-bar.tsx
- [x] T021 [US3] Extend MatchCard props with matchStrength (number | null | undefined) per contracts/match-card-extended.md in apps/web/components/dashboard/match-inbox/match-card.tsx
- [x] T022 [US3] Integrate MatchStrengthBar into MatchCard; ensure Trust Shield and Coach's Take handle null gracefully per SC-004 in apps/web/components/dashboard/match-inbox/match-card.tsx

**Checkpoint**: User Story 3 complete — Match Cards show Trust Shield, Match Strength, Coach's Take with placeholders.

---

## Phase 6: User Story 4 - Priority Hub Expanded: Kanban and Coach's Huddle (Priority: P2)

**Goal**: Full-screen Kanban with To Do, In Progress, Done; task cards with title, description, deadline urgency; Coach's Huddle sidebar; drag-and-drop with persisted state.

**Independent Test**: Expand Today's Game Plan; verify Kanban columns, task cards, Coach's Huddle; drag task between columns; verify persistence.

### Implementation for User Story 4

- [x] T023 [US4] Implement KanbanBoard with To Do, In Progress, Done columns and task card layout (title, description, deadline, urgency color) in apps/web/components/dashboard/game-plan/kanban-board.tsx
- [x] T024 [US4] Add @dnd-kit DndContext, SortableContext for drag-and-drop between columns in apps/web/components/dashboard/game-plan/kanban-board.tsx
- [x] T025 [US4] Add keyboard support (arrow keys or menu) for moving tasks between columns per FR-002a in apps/web/components/dashboard/game-plan/kanban-board.tsx
- [x] T026 [US4] Create Coach's Huddle sidebar with tips, reminders, encouragement in apps/web/components/dashboard/game-plan/coaches-huddle.tsx
- [x] T027 [US4] Create Server Action for task status update (todo | in_progress | done) in apps/web/lib/actions/
- [x] T028 [US4] Implement optimistic update with revert on persist failure; show user-friendly error and retry in apps/web/components/dashboard/game-plan/kanban-board.tsx
- [x] T029 [US4] Add empty state for columns ("No tasks" or "Drag tasks here") in apps/web/components/dashboard/game-plan/kanban-board.tsx
- [x] T030 [US4] Wire "View Full Kanban Board" (if present in GamePlan) to expand kanban in apps/web/components/dashboard/game-plan/game-plan.tsx

**Checkpoint**: User Story 4 complete — Kanban with DnD, Coach's Huddle, persisted state.

---

## Phase 7: User Story 5 - Discovery Feed Expanded: Repository with Filters (Priority: P2)

**Goal**: Full-page Scholarship Repository with search bar, filters (Major, SAI, State), active filter tags, scrollable Match Cards.

**Independent Test**: Expand Discovery Feed; verify search, filters, filter tags; change filters; verify Match Card list updates; verify empty state.

### Implementation for User Story 5

- [x] T031 [US5] Implement ScholarshipRepository search bar and filter controls (Major, SAI, State) in apps/web/components/dashboard/match-inbox/scholarship-repository.tsx
- [x] T032 [US5] Add active filter tags (removable) in apps/web/components/dashboard/match-inbox/scholarship-repository.tsx
- [x] T033 [US5] Wire filtered Match Card list; use extended MatchCard (Trust Shield, Match Strength, Coach's Take) in apps/web/components/dashboard/match-inbox/scholarship-repository.tsx
- [x] T034 [US5] Add empty state for no matches with option to clear/adjust filters in apps/web/components/dashboard/match-inbox/scholarship-repository.tsx

**Checkpoint**: User Story 5 complete — Repository with search, filters, Match Cards.

---

## Phase 8: User Story 6 - Calendar Expanded: 12-Month Severity Heatmap (Priority: P2)

**Goal**: 12-month grid with deadlines color-coded by urgency (Critical <48h, Warning <7d, Safe ≥7d); legend; empty state for months with no deadlines.

**Independent Test**: Expand Deadline Calendar; verify 12-month grid, color-coded deadlines, legend; verify "No deadlines" for empty months.

### Implementation for User Story 6

- [x] T035 [US6] Implement SeverityHeatmap 12-month grid (4×3 layout) in apps/web/components/dashboard/deadline-calendar/severity-heatmap.tsx
- [x] T036 [US6] Color-code deadlines: Critical (bg-red-500), Warning (bg-amber-500), Safe (bg-green-500) per research.md in apps/web/components/dashboard/deadline-calendar/severity-heatmap.tsx
- [x] T037 [US6] Add legend explaining Critical, Warning, Safe in apps/web/components/dashboard/deadline-calendar/severity-heatmap.tsx
- [x] T038 [US6] Add "No deadlines" empty state for months with no data in apps/web/components/dashboard/deadline-calendar/severity-heatmap.tsx

**Checkpoint**: User Story 6 complete — Severity Heatmap with legend and empty states.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Verification, E2E, performance

- [x] T039 Run quickstart.md validation (expand/collapse, URL sync, Escape, a11y, Kanban DnD)
- [x] T040 [P] Add Playwright E2E: expand each widget, verify expanded view, close via button and Escape in apps/web/e2e/ or tests/
- [x] T041 [P] Add Playwright E2E: URL with ?view=kanban loads expanded; back button returns to dashboard in apps/web/e2e/ or tests/
- [x] T042 Run Lighthouse on /dashboard; achieve Performance and Best Practices ≥90 per SC-001

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on T001–T002 — BLOCKS all user stories
- **Phase 3 (US1)**: Depends on Phase 2 — expand/collapse mechanism
- **Phase 4 (US2)**: Depends on Phase 3 — URL sync builds on ExpandableWidget
- **Phase 5 (US3)**: Depends on Phase 2 — Match Card extension independent of expand
- **Phase 6 (US4)**: Depends on Phase 3 — Kanban fills expanded content from US1
- **Phase 7 (US5)**: Depends on Phase 3, Phase 5 — Repository uses MatchCard; expanded shell from US1
- **Phase 8 (US6)**: Depends on Phase 3 — Heatmap fills expanded content from US1
- **Phase 9 (Polish)**: Depends on all desired user stories

### User Story Dependencies

- **US1 (P1)**: After Foundational — no dependency on other stories
- **US2 (P2)**: After US1 — URL sync implemented in useViewParam; verification after US1
- **US3 (P2)**: After Foundational — can run in parallel with US1/US4/US5/US6
- **US4 (P2)**: After US1 — Kanban content for expanded view
- **US5 (P2)**: After US1, US3 — Repository uses extended MatchCard
- **US6 (P2)**: After US1 — Heatmap content for expanded view

### Within Each User Story

- Shell/placeholder components before full implementation
- Core implementation before integration
- Persistence (Server Actions) before optimistic UI

### Parallel Opportunities

- T010, T011, T012 can run in parallel (three expanded view shells)
- T020 can run in parallel with T010–T012 (MatchStrengthBar)
- US3, US4, US6 can run in parallel after US1 (different components)
- T040, T041 can run in parallel (different E2E flows)

---

## Parallel Example: User Story 1

```bash
# After Phase 2, run in parallel:
Task T010: "Create KanbanBoard shell in kanban-board.tsx"
Task T011: "Create ScholarshipRepository shell in scholarship-repository.tsx"
Task T012: "Create SeverityHeatmap shell in severity-heatmap.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Expand each widget, verify transitions, close, Escape
5. Demo if ready

### Incremental Delivery

1. Setup + Foundational → ExpandableWidget abstraction ready
2. US1 → Expand/collapse for all three widgets → Demo (MVP)
3. US2 → Shareable links, back button → Demo
4. US3 → Match Cards extended → Demo
5. US4 → Kanban with DnD → Demo
6. US5 → Repository with filters → Demo
7. US6 → Severity Heatmap → Demo
8. Polish → E2E, Lighthouse, quickstart

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US1 (expand/collapse) → US2 (URL verify)
   - Developer B: US3 (Match Cards) → US5 (Repository)
   - Developer C: US4 (Kanban) → US6 (Heatmap)
3. US4, US5, US6 can proceed in parallel after US1

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Spec 010 bento shell assumed; GamePlan, MatchInbox, DeadlineCalendarShell exist
- No new DB schema; view state URL-only; task status persisted via existing Coach/Application APIs
- Coach's Huddle may use static tips initially; live Coach integration deferred
