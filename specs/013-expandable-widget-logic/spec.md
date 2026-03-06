# Feature Specification: Expandable Widget Logic and State

**Feature Branch**: `013-expandable-widget-logic`  
**Created**: 2025-03-06  
**Status**: Draft  
**Input**: User description: "Implement the Expandable Widget Logic and State for TuitionLift"

## Overview

Extend the TuitionLift dashboard (spec 010-bento-shell-design-system) with progressive disclosure: every bento widget supports a compact "Dashboard" view and an "Expanded" view. Users can expand widgets for focused workflows (Kanban, repository, calendar heatmap), with expanded state reflected in the URL for shareable links and back-button support. Match Cards display trust indicators and Coach guidance; transitions between views are smooth and fluid.

**Reference Wireframes**: `specs/wireframes/TuitionLift__dashboard.png`, `specs/wireframes/TuitionLift__Calendar-expanded.png`, `specs/wireframes/TuitionLift__PriorityHub--Expanded.png`, `specs/wireframes/TuitionLift__ScholarshipRepository-expanded.png`

## Clarifications

### Session 2025-03-06

- Q: How should the expandable widget pattern be designed so future bento sections can be added without rework? → A: Reusable wrapper component that provides expand control, close control, URL sync, and transitions; new widgets supply only Dashboard and Expanded content. Design MUST allow for a future data-driven config layer if needed.
- Q: How should the view parameter support future widgets? → A: Arbitrary IDs—the view parameter accepts any widget ID; new widgets register their ID without URL schema changes.
- Q: How should expanded views behave on mobile and tablet? → A: Full-viewport overlay on all screen sizes; content inside adapts (e.g., stacked layout, scrollable).
- Q: Should the spec explicitly require expand and close controls to meet the same accessibility standards as the shell? → A: Yes—expand and close controls MUST meet WCAG 2.1 AA (44×44px touch target, keyboard operable, visible focus).
- Q: Should the Escape key close the expanded view? → A: Yes—pressing Escape closes the expanded view. Aligns with a broader initiative to ensure all components are keyboard accessible per a11y guidelines (constitution/task update recommended).
- Q: Is drag-and-drop (or equivalent) to move tasks between Kanban columns in scope for this spec? → A: Yes—users can drag (or use keyboard) to move tasks between To Do, In Progress, Done. Add FR.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Expand and Collapse Bento Widgets (Priority: P1)

A logged-in user views the dashboard with three bento widgets (Today's Game Plan, Discovery Feed, Deadline Calendar). Each widget has an expand control. When the user expands a widget, it transitions to a full-screen or full-page view; when they collapse or close it, they return to the dashboard. The transition feels smooth and intentional.

**Why this priority**: Core progressive disclosure; all other expandable behavior depends on this.

**Independent Test**: Can be fully tested by expanding each widget, verifying the expanded layout, then collapsing and confirming return to dashboard. Delivers the foundational expand/collapse interaction.

**Acceptance Scenarios**:

1. **Given** the user is on the dashboard, **When** they view each bento widget, **Then** an expand control (e.g., diagonal arrows icon) is visible in the widget header.
2. **Given** the user clicks the expand control on Today's Game Plan, **When** the transition completes, **Then** they see the full-screen Kanban board with Coach's Huddle sidebar.
3. **Given** the user clicks the expand control on Discovery Feed, **When** the transition completes, **Then** they see the full-page Scholarship Repository with search and advanced filters.
4. **Given** the user clicks the expand control on Deadline Calendar, **When** the transition completes, **Then** they see the 12-month Severity Heatmap view.
5. **Given** the user is in any expanded view, **When** they click the close control, **Then** they return to the dashboard with all widgets in Dashboard view.
6. **Given** the user is in any expanded view, **When** they press Escape, **Then** they return to the dashboard (same as close control).
7. **Given** the user expands or collapses a widget, **When** the transition occurs, **Then** the change is visually smooth (no abrupt jumps or flicker).

---

### User Story 2 - Shareable Links and Back-Button Support (Priority: P2)

A user shares a link to an expanded widget view (e.g., Kanban or Scholarship Repository). When another user (or the same user in a new tab) opens that link, they land directly in the expanded view. The browser back button returns them to the dashboard or previous view as expected.

**Why this priority**: Enables sharing and bookmarking of specific views; improves navigation predictability.

**Independent Test**: Can be tested by copying the URL when a widget is expanded, opening it in a new tab or incognito window, and verifying the expanded view loads. Back button behavior can be verified by navigating forward and back.

**Acceptance Scenarios**:

1. **Given** the user has expanded the Priority Hub (Kanban), **When** they copy the current URL, **Then** the URL includes a parameter indicating the Kanban view (e.g., `?view=kanban`).
2. **Given** a user opens a URL with `?view=kanban`, **When** the page loads, **Then** they see the Kanban expanded view directly (without first showing the dashboard).
3. **Given** a user opens a URL with a view parameter for Discovery Feed or Calendar expanded view, **When** the page loads, **Then** they see the corresponding expanded view.
4. **Given** the user navigates from dashboard to an expanded view, **When** they press the browser back button, **Then** they return to the dashboard.
5. **Given** the user navigates from an expanded view to the dashboard via close, **When** they press the browser back button, **Then** they return to the expanded view (if that was the previous history entry).

---

### User Story 3 - Match Cards with Trust and Coach Guidance (Priority: P2)

A user views Match Cards in the Discovery Feed (dashboard or expanded). Each card displays a Trust Shield badge, a Match Strength progress bar, and a Coach's Take message. These elements help the user assess scholarship fit and trustworthiness at a glance.

**Why this priority**: Differentiates TuitionLift with trust signals and personalized guidance; builds on the Discovery Feed shell from spec 010.

**Independent Test**: Can be tested by loading the Discovery Feed with match data and verifying each card includes the Trust Shield, Match Strength bar, and Coach's Take. Delivers trust and personalization within the card component.

**Acceptance Scenarios**:

1. **Given** the user views a Match Card, **When** the card is displayed, **Then** a Trust Shield badge is visible (indicating verified or vetted status).
2. **Given** the user views a Match Card, **When** the card is displayed, **Then** a Match Strength progress bar shows a percentage (e.g., 94%) with a visual bar.
3. **Given** the user views a Match Card, **When** the card is displayed, **Then** a Coach's Take section shows a brief, personalized message about the match (e.g., "Perfect match! Your leadership experience and SAI make you a top candidate.").
4. **Given** the user hovers or focuses the Coach's Take area (if implemented as tooltip), **When** applicable, **Then** the full Coach's Take message is accessible.

---

### User Story 4 - Priority Hub Expanded: Kanban and Coach's Huddle (Priority: P2)

A user expands Today's Game Plan to work on tasks. They see a full-screen Kanban board with columns (To Do, In Progress, Done) and a Coach's Huddle sidebar with tips and encouragement. Task cards show titles, descriptions, and deadline urgency (color-coded).

**Why this priority**: Enables focused task management; Coach's Huddle reinforces the Encouraging Coach persona.

**Independent Test**: Can be tested by expanding the Priority Hub and verifying Kanban columns, task cards, and Coach's Huddle content. Delivers the execution-focused workflow.

**Acceptance Scenarios**:

1. **Given** the user expands Today's Game Plan, **When** the expanded view loads, **Then** they see a Kanban board with at least To Do, In Progress, and Done columns.
2. **Given** the Kanban view, **When** tasks are displayed, **Then** each task card shows title, description (if available), and deadline with urgency indication (e.g., color-coded by days remaining).
3. **Given** the Kanban view, **When** the user views the layout, **Then** a Coach's Huddle sidebar is visible with tips, reminders, or encouragement from the Coach persona.
4. **Given** the user clicks "View Full Kanban Board" from the dashboard widget, **When** the action completes, **Then** they are taken to the same expanded Kanban view as via the expand control.
5. **Given** the Kanban view, **When** the user drags a task card (or uses keyboard) to move it between columns (To Do, In Progress, Done), **Then** the task moves and the new state is persisted.

---

### User Story 5 - Discovery Feed Expanded: Repository with Filters (Priority: P2)

A user expands the Discovery Feed to browse scholarships. They see a full-page Scholarship Repository with a search bar, advanced filters (Major, SAI, State), and scrollable Match Cards. Active filters are visible as tags; users can adjust filters to refine results.

**Why this priority**: Enables discovery at scale; filters support the Advisor's matching logic.

**Independent Test**: Can be tested by expanding the Discovery Feed and verifying search, filter controls, and Match Card list. Delivers the discovery workflow.

**Acceptance Scenarios**:

1. **Given** the user expands the Discovery Feed, **When** the expanded view loads, **Then** they see a Scholarship Repository with a search bar and filter controls.
2. **Given** the repository view, **When** filters are applied, **Then** active filters (Major, SAI, State) are displayed as removable tags.
3. **Given** the repository view, **When** the user changes filters, **Then** the Match Card list updates to reflect the filtered set.
4. **Given** the repository view, **When** many matches exist, **Then** the list is scrollable and Match Cards display per User Story 3.

---

### User Story 6 - Calendar Expanded: 12-Month Severity Heatmap (Priority: P2)

A user expands the Deadline Calendar to see the full year. They see a 12-month grid where each month shows deadlines color-coded by urgency (Critical, Warning, Safe). A legend explains the severity levels.

**Why this priority**: Enables planning across the academic year; severity heatmap supports prioritization.

**Independent Test**: Can be tested by expanding the Calendar and verifying the 12-month grid, color-coded deadlines, and legend. Delivers the calendar planning workflow.

**Acceptance Scenarios**:

1. **Given** the user expands the Deadline Calendar, **When** the expanded view loads, **Then** they see a 12-month timeline grid (e.g., 4×3 or similar layout).
2. **Given** the calendar heatmap, **When** deadlines are displayed, **Then** each deadline is color-coded by severity (e.g., red for critical &lt;48hrs, orange for warning &lt;7 days, green for safe &gt;7 days).
3. **Given** the calendar heatmap, **When** the user views the layout, **Then** a legend is visible explaining the severity levels.
4. **Given** a month has no deadlines, **When** displayed, **Then** it shows an appropriate empty state (e.g., "No deadlines").

---

### Edge Cases

- What happens when the user has multiple expanded-view URLs in history and navigates back and forth? Back/forward should restore the correct view state without duplication or confusion.
- How does the system handle invalid or unknown view parameters in the URL? Fall back to dashboard view; do not show an error page.
- What happens when a user opens a shared expanded-view link while unauthenticated? Redirect to landing/login per spec 010; after auth, restore the intended view if the URL is preserved.
- How does the Match Card behave when Trust Shield, Match Strength, or Coach's Take data is missing? Display placeholders or hide the element gracefully; never show raw errors or broken layout.
- What happens when the Kanban has no tasks in a column? Column shows empty state (e.g., "Drag tasks here" or "No tasks"); layout remains stable.
- What happens when a task move fails to persist (e.g., network error)? Show user-friendly error; allow retry; revert to previous column; do not leave task in inconsistent visual state.
- What happens when the Scholarship Repository returns no matches for applied filters? Show empty state with option to clear or adjust filters.

## Requirements *(mandatory)*

### Functional Requirements

#### Extensibility

- **FR-000**: A reusable expandable widget abstraction MUST provide expand control, close control, URL sync, and transitions. New bento sections supply only Dashboard and Expanded content; the abstraction MUST NOT require modification when adding future widgets. The design MUST allow for a future data-driven config layer (e.g., widget registry) without breaking the abstraction.

#### Progressive Disclosure

- **FR-001**: Every bento widget (Today's Game Plan, Discovery Feed, Deadline Calendar) MUST support exactly two view states: Dashboard (compact) and Expanded (full-screen or full-page).
- **FR-002**: The Priority Hub (Today's Game Plan) Dashboard view MUST show the top 3 tasks; the Expanded view MUST show a full-screen Kanban board with To Do, In Progress, Done columns and a Coach's Huddle chat sidebar.
- **FR-002a**: Users MUST be able to move task cards between Kanban columns (To Do, In Progress, Done) via drag-and-drop or keyboard (e.g., arrow keys, menu). Task state changes MUST be persisted.
- **FR-003**: The Discovery Feed Dashboard view MUST show scrollable Match Cards; the Expanded view MUST show a full-page Scholarship Repository with advanced filters (Major, SAI, State) and search.
- **FR-004**: The Calendar Dashboard view MUST show a 1-month mini-view; the Expanded view MUST show a 12-month Severity Heatmap with color-coded deadlines.
- **FR-005**: Each widget MUST provide a visible expand control (e.g., icon in header) to transition from Dashboard to Expanded view.
- **FR-006**: Each Expanded view MUST provide a visible close control to return to the Dashboard view.
- **FR-007**: Transitions between Dashboard and Expanded views MUST be smooth and fluid (no abrupt jumps or flicker); the transition should feel like a "Hero" expansion/collapse.

#### Match Cards

- **FR-008**: Every Match Card MUST display a Trust Shield badge indicating verified or vetted status.
- **FR-009**: Every Match Card MUST display a Match Strength progress bar with a numeric percentage.
- **FR-010**: Every Match Card MUST display a Coach's Take message (as visible text or accessible tooltip) with personalized guidance about the match.

#### State Management

- **FR-011**: The expanded view state MUST be reflected in the URL (e.g., via query parameters such as `?view=kanban`, `?view=repository`, `?view=calendar`). The view parameter MUST accept arbitrary widget IDs so new widgets can be added without URL schema changes.
- **FR-012**: Opening a URL with a valid view parameter MUST load the corresponding Expanded view directly, without requiring the user to expand from the dashboard.
- **FR-013**: Browser back and forward navigation MUST correctly restore the previous view state (dashboard or expanded).
- **FR-014**: Invalid or unknown view parameters MUST result in the dashboard view; the system MUST NOT show an error page for bad parameters.

#### Responsive & Accessibility

- **FR-015**: The Expanded view MUST fill the viewport on all screen sizes (375px–1280px+); content inside MUST adapt (e.g., stacked layout, scrollable) without horizontal overflow.
- **FR-016**: Expand and close controls MUST meet WCAG 2.1 AA: minimum 44×44px touch target, keyboard operable, and visible focus indicator.
- **FR-017**: Pressing Escape MUST close the expanded view and return the user to the dashboard.

### Key Entities

- **View State**: The current expanded/collapsed state of each widget; persisted in URL for shareability and history.
- **Match Card**: A card displaying a scholarship match with Trust Shield, Match Strength bar, and Coach's Take.
- **Kanban Board**: Task columns (To Do, In Progress, Done) with task cards; Coach's Huddle sidebar.
- **Scholarship Repository**: Full-page list of Match Cards with search and filters (Major, SAI, State).
- **Severity Heatmap**: 12-month grid with deadlines color-coded by urgency (Critical, Warning, Safe).

### Data Dependencies (for plan.md)

| Element | Likely Data Source | Notes |
|---------|--------------------|-------|
| Top 3 tasks, Kanban tasks | Applications, Coach engine | 005-coach-execution-engine, 006 |
| Match Cards, Trust Shield, Match Strength, Coach's Take | Discovery engine, Trust Filter | 004-advisor-discovery-engine, constitution |
| Calendar deadlines, Severity Heatmap | Applications, Scholarships | 006, 004 |
| Coach's Huddle tips | Coach persona, LangGraph | 005 |

No new DB schema is required for view state; URL parameters are sufficient. Data for Match Cards, tasks, and deadlines is provided by existing or planned specs.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can expand any of the three bento widgets and see the corresponding Expanded view within 1 second of the expand action.
- **SC-002**: Users can share a link to an expanded view; when opened in a new session, the recipient sees the same expanded view without manual expansion.
- **SC-003**: Browser back button returns the user to the previous view (dashboard or expanded) as expected in 100% of navigation sequences.
- **SC-004**: Every Match Card displays Trust Shield, Match Strength bar, and Coach's Take when data is available; no card renders without at least placeholder treatment for missing elements.
- **SC-005**: Transitions between Dashboard and Expanded views complete without visible layout shift or flicker; users perceive a smooth expansion/collapse.
- **SC-006**: The 12-month Severity Heatmap correctly color-codes deadlines by urgency (Critical &lt;48hrs, Warning &lt;7 days, Safe &gt;7 days) when deadline data is provided.

## Assumptions

- Spec 010 (bento shell) is implemented; the dashboard route, header, bento grid, and three section containers exist.
- Task data for the Priority Hub and Kanban is provided by the Coach/Application specs; this spec defines the presentation and expand behavior only.
- Match data (scholarships, Trust Shield, Match Strength, Coach's Take) is provided by the Advisor/Discovery specs; this spec defines the Match Card presentation.
- Calendar deadline data is provided by Applications/Scholarships; this spec defines the heatmap presentation.
- URL parameter names (e.g., `view=kanban`) are illustrative; plan.md will define the exact parameter scheme. The view parameter accepts arbitrary widget IDs; new widgets register their ID without schema changes.
- Only one widget is expanded at a time; the URL reflects the single active expanded view.
- Coach's Huddle content may be static tips initially; integration with live Coach messages can be added in a follow-up spec.
- The reusable wrapper is the primary extension mechanism; a data-driven config (e.g., widget registry) may be added later without changing the wrapper contract.
- Expandable widget keyboard behavior (Escape, focus management) aligns with constitution §6 a11y requirements. A cross-cutting task to audit component-level keyboard accessibility may be added separately.
