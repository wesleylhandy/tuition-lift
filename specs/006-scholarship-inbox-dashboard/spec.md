# Feature Specification: Scholarship Inbox & Dashboard

**Feature Branch**: `006-scholarship-inbox-dashboard`  
**Created**: 2025-02-13  
**Status**: Draft  
**Input**: User description: "Create the Scholarship Inbox & Dashboard UI: A real-time, Bento-box control center for TuitionLift."

## Vision & UX Objective

Create a high-performance "Control Center" that transitions the student from Discovery to Action. The UI must feel alive and authoritative, reflecting the work of the Advisor and Coach personas. Students see their scholarship landscape at a glance, know exactly what to do next, and feel the system is actively working for them.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Prioritized Match Inbox with Live Activity (Priority: P1)

A student views a prioritized feed of Advisor discoveries—scholarships that match their profile, ranked by trust and relevance. The feed feels alive: it shows when the Advisor is actively scouting (e.g., which domains are currently being vetted), so the student knows discovery is in progress and new matches may arrive.

**Why this priority**: Core engagement—the inbox is the primary surface where students encounter new opportunities. Live status builds trust and reduces "is anything happening?" anxiety.

**Independent Test**: Can be fully tested by displaying a match feed with varying trust scores, verifying prioritization by trust_score and momentum_score, and confirming that live scouting status appears when discovery is active.

**Acceptance Scenarios**:

1. **Given** a student has discovery results, **When** they view the Match Inbox, **Then** scholarships appear in a prioritized feed ordered by trust_score and momentum_score.
2. **Given** the Advisor is actively scouting, **When** the student views the inbox, **Then** a "Live Pulse" indicator shows "Active Scouting" and a ticker of domains currently being vetted.
3. **Given** discovery completes with new matches, **When** matches arrive, **Then** new items are visibly surfaced in the feed so the student notices them.
4. **Given** the student views a scholarship card, **When** they look at it, **Then** they see a Trust Shield badge (Green/Amber/Red) based on the Reputation Engine score.
5. **Given** the student views a scholarship card, **When** they look at it, **Then** they see a "Coach's Take" micro-summary explaining the specific ROI of that scholarship.

---

### User Story 2 - Coach's Game Plan with Top 3 Tasks (Priority: P1)

A student sees a prominent "Coach's Game Plan" section displaying the Top 3 Tasks—the three applications they should focus on today. A "Debt Lifted" progress ring shows cumulative scholarship dollars secured. A "Next Win" countdown highlights when the next deadline or milestone is approaching.

**Why this priority**: Action clarity—students need to know where to spend energy. The Top 3 reduces overwhelm; progress visuals sustain motivation.

**Independent Test**: Can be tested by supplying applications with varying deadlines and trust scores, and verifying the Top 3 display, Debt Lifted ring, and Next Win countdown reflect the correct prioritization and totals.

**Acceptance Scenarios**:

1. **Given** a student has tracked applications, **When** they view the Coach's Game Plan, **Then** the Top 3 Tasks are displayed prominently, ordered by momentum_score.
2. **Given** the student has secured scholarships (confirmed Won), **When** they view the dashboard, **Then** a "Debt Lifted" progress ring shows cumulative dollars lifted.
3. **Given** a student has upcoming deadlines or milestones, **When** they view the dashboard, **Then** a "Next Win" countdown indicates the nearest deadline or next actionable milestone.
4. **Given** fewer than 3 tasks exist, **When** the game plan is shown, **Then** only the available tasks are displayed; the layout adapts without empty placeholders.

---

### User Story 3 - Application Tracker Lifecycle View (Priority: P1)

A student tracks applications through clear lifecycle stages: Drafting → Submitted → Won. Each application is visible in a lifecycle view so the student sees progress at a glance. Status reflects where each application stands.

**Why this priority**: State clarity—students need to see their pipeline and feel progress. The lifecycle view is the single source of truth for application status.

**Independent Test**: Can be tested by moving applications through each stage and verifying the tracker updates correctly; status changes persist and reflect in the lifecycle view.

**Acceptance Scenarios**:

1. **Given** an application is being worked on, **When** it is in Drafting, **Then** it appears in the Drafting column/section of the Application Tracker.
2. **Given** an application is submitted, **When** the student marks it Submitted, **Then** it appears in the Submitted section.
3. **Given** an application is won, **When** the student confirms it as Won, **Then** it appears in the Won section and contributes to Debt Lifted.
4. **Given** the student views the tracker, **When** they look at the layout, **Then** the lifecycle stages (Drafting, Submitted, Won) are clearly distinguished.
5. **Given** status changes, **When** they occur, **Then** the UI updates to reflect the new state; all transitions use server-side validation and persist correctly.

---

### User Story 4 - Quick Actions and Action Parity (Priority: P2)

A student can take quick actions on scholarship cards and applications: Track (add to tracked list), Dismiss (remove from feed without tracking), and Verify Submission (confirm an application was submitted). Actions are available on every card where contextually relevant, ensuring parity across surfaces.

**Why this priority**: Reduces friction—students can act without navigating away. Action parity ensures consistent behavior regardless of where they encounter a scholarship.

**Independent Test**: Can be tested by performing Track, Dismiss, and Verify Submission from cards in the Match Inbox and Application Tracker, and verifying state updates correctly.

**Acceptance Scenarios**:

1. **Given** a scholarship appears in the Match Inbox, **When** the student clicks "Track", **Then** the scholarship is added to their tracked applications and the card reflects the new state.
2. **Given** a scholarship appears in the Match Inbox, **When** the student clicks "Dismiss", **Then** the scholarship is removed from their feed and not added to tracked applications.
3. **Given** an application is in Drafting or Review, **When** the student clicks "Verify Submission", **Then** the verification flow (per Coach spec) is triggered and, upon confirmation, status updates to Submitted.
4. **Given** any scholarship or application card, **When** context permits, **Then** the appropriate quick-action buttons (Track, Dismiss, Verify Submission) are visible and functional.

---

### User Story 5 - Zero-State: Coach's Prep Checklist (Priority: P2)

When a student has no matches in the Match Inbox (discovery not run, or zero results), the system displays a "Coach's Prep Checklist" instead of an empty state. The checklist keeps the student engaged by guiding them on next steps (e.g., complete profile, trigger discovery, review eligibility).

**Why this priority**: Engagement during cold start—empty states cause drop-off; a checklist maintains momentum and clarity.

**Independent Test**: Can be tested by viewing the inbox with zero matches and verifying the Coach's Prep Checklist is displayed with actionable next steps.

**Acceptance Scenarios**:

1. **Given** the Match Inbox has zero matches, **When** the student views it, **Then** a Coach's Prep Checklist is displayed instead of a blank or generic empty state.
2. **Given** the checklist is shown, **When** the student reads it, **Then** it contains specific, actionable next steps (e.g., complete profile, start discovery).
3. **Given** the student completes a checklist item, **When** the condition is met (e.g., profile complete), **Then** the checklist updates to reflect progress or transitions to showing matches when available.

---

### User Story 6 - Visual Identity and Accessibility (Priority: P2)

The dashboard uses a cohesive visual identity: serif headings for trust and authority, sans-serif body for clarity. Color palette (Navy, Electric Mint, textured Off-White) creates a distinct, academic feel. The layout uses a Bento grid—non-linear, modular blocks that adapt to content. All components meet accessibility standards for contrast, focus, and screen readers.

**Why this priority**: Brand and inclusivity—the UI must feel intentional and be usable by all students.

**Independent Test**: Can be tested by verifying typography, colors, and layout match the design system; running accessibility audits on key views.

**Acceptance Scenarios**:

1. **Given** the student views any dashboard screen, **When** they read headings, **Then** serif typography is used for headings; sans-serif for body text.
2. **Given** the dashboard layout, **When** viewed on desktop and mobile, **Then** a Bento-style grid presents content in modular, non-linear blocks that adapt to screen size.
3. **Given** the color palette, **When** applied, **Then** Navy (#1A1A40), Electric Mint (#00FFAB), and textured Off-White are used consistently.
4. **Given** any interactive element, **When** accessed via keyboard or screen reader, **Then** focus order is logical, contrast meets WCAG AA, and labels/aria attributes support assistive technology.

---

### Edge Cases

- What happens when the Match Inbox receives new matches while the student is viewing it? The UI updates in real time; new matches are surfaced with a noticeable indicator so the student sees them without manual refresh.
- What happens when the student has zero tracked applications? The Coach's Game Plan shows a reduced or empty state; the Next Win countdown may reference onboarding or discovery as the next action.
- What happens when trust_score or momentum_score is missing for a scholarship? Fallback to secondary sort (e.g., deadline, creation date); display a neutral Trust Shield until score is available.
- What happens when the student has no confirmed Won applications? The Debt Lifted progress ring shows zero or a placeholder; the design encourages action without shaming.
- What happens when real-time updates fail or disconnect? The UI degrades gracefully; data remains viewable; a subtle reconnection indicator appears when connection is restored.
- What happens when multiple quick actions are triggered in rapid succession? Each action is validated server-side; duplicate or conflicting actions are rejected; UI reflects final consistent state.

## Requirements *(mandatory)*

### Functional Requirements

**Match Inbox**
- **FR-001**: System MUST display a prioritized feed of Advisor discoveries (Match Inbox) ordered by trust_score and momentum_score.
- **FR-002**: System MUST show a "Live Pulse" indicator with "Active Scouting" status and a ticker of domains currently being vetted when discovery is running.
- **FR-003**: System MUST surface new matches in real time so the student sees them without manual refresh.
- **FR-004**: Each scholarship card MUST display a Trust Shield badge (Green/Amber/Red) based on the Reputation Engine score (trust_score).
- **FR-005**: Each scholarship card MUST display a "Coach's Take" micro-summary explaining the specific ROI of that scholarship.

**Coach's Game Plan**
- **FR-006**: System MUST display a prominent "Coach's Game Plan" section with the Top 3 Tasks, ordered by momentum_score.
- **FR-007**: System MUST display a "Debt Lifted" progress ring showing cumulative dollars from confirmed Won scholarships.
- **FR-008**: System MUST display a "Next Win" countdown indicating the nearest deadline or next actionable milestone.

**Application Tracker**
- **FR-009**: System MUST display an Application Tracker with lifecycle stages: Drafting, Submitted, Won.
- **FR-010**: System MUST update the tracker in real time when application status changes.
- **FR-011**: System MUST ensure all status transitions are validated and persisted via server-side logic (consistent with Coach Execution Engine).

**Quick Actions**
- **FR-012**: System MUST provide "Track" quick action to add a scholarship to tracked applications.
- **FR-013**: System MUST provide "Dismiss" quick action to remove a scholarship from the feed without tracking.
- **FR-014**: System MUST provide "Verify Submission" quick action to trigger the verification flow for applications; upon confirmation, status updates to Submitted.

**Zero-State**
- **FR-015**: When the Match Inbox has zero matches, System MUST display a "Coach's Prep Checklist" with actionable next steps instead of a blank empty state.

**Visual & Layout**
- **FR-016**: System MUST use a Bento grid layout—modular, non-linear blocks that adapt to content and screen size.
- **FR-017**: System MUST use serif typography for headings and sans-serif for body text.
- **FR-018**: System MUST apply the design palette: Navy (#1A1A40), Electric Mint (#00FFAB), textured Off-White.
- **FR-019**: System MUST meet WCAG AA contrast, keyboard navigation, and screen reader support for all interactive elements.

**Data & State**
- **FR-020**: System MUST consume data from the shared data layer; use trust_score and momentum_score for all sorting and prioritization logic.
- **FR-021**: All state transitions (Track, Dismiss, Verify Submission, status updates) MUST be performed via server-side actions; client reflects authoritative server state.

### Key Entities

- **Match**: A scholarship discovery result from the Advisor. Has trust_score, momentum_score, Coach's Take, and eligibility metadata. Displayed in Match Inbox.
- **Trust Shield**: Visual badge (Green/Amber/Red) derived from trust_score; indicates scholarship legitimacy per Reputation Engine.
- **Coach's Take**: Micro-summary explaining ROI and fit for a specific scholarship; generated from student profile and scholarship attributes.
- **Top 3 Tasks**: The three applications a student should focus on today; ordered by momentum_score per Coach Execution Engine.
- **Application**: A tracked scholarship application. Has lifecycle status (Drafting, Submitted, Won), deadline, and links to scholarship metadata.
- **Debt Lifted**: Aggregate dollar amount from confirmed Won scholarships; updated only after verification protocol.
- **Coach's Prep Checklist**: Zero-state content when no matches exist; actionable steps to complete profile, trigger discovery, or review eligibility.

### Assumptions

- The shared data layer exposes trust_score and momentum_score for scholarships and applications; Advisor Discovery Engine and Coach Execution Engine populate these. Implementation consumes from the project's data package.
- Real-time updates are delivered via the project's real-time subscription layer; the UI subscribes to relevant channels for matches, applications, and scouting status.
- The Coach's Take micro-summary is either pre-computed by the Advisor/Coach or generated on demand; exact source is implementation-defined.
- Bento grid layout and design system components are available; exact component library is an implementation choice.
- Server-side actions for state transitions integrate with the shared data layer and Coach Execution Engine verification protocol.
- Application lifecycle states (Drafting, Submitted, Won) align with the ApplicationStatus schema in the Core Infrastructure and Coach Execution Engine specs.
- "Active Scouting" status and domain ticker are derived from the Advisor Discovery Engine's checkpoint or progress state when Scout phase is running.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Students can view the Match Inbox with scholarships prioritized by trust and momentum within 2 seconds of page load, under normal load.
- **SC-002**: When discovery is active, the Live Pulse indicator and domain ticker appear within 5 seconds of scouting start; new matches appear in the feed within 10 seconds of discovery completion.
- **SC-003**: Students can identify their Top 3 Tasks and Next Win countdown at a glance; 90% of users locate the Coach's Game Plan section within 5 seconds of first view.
- **SC-004**: Students can complete Track, Dismiss, or Verify Submission from any card in under 3 clicks; state updates reflect within 2 seconds.
- **SC-005**: When no matches exist, 100% of users see the Coach's Prep Checklist instead of a blank state.
- **SC-006**: All dashboard views meet WCAG AA for contrast and keyboard accessibility; zero critical accessibility violations in automated audits.
- **SC-007**: Debt Lifted progress ring and Application Tracker accurately reflect server state; zero discrepancies between displayed and persisted data under normal operation.
- **SC-008**: Layout adapts to mobile and desktop viewports without horizontal scroll; Bento blocks reflow appropriately on screens 320px and above.

## Documentation References

- [Coach Execution Engine Spec](../005-coach-execution-engine/spec.md) — Top 3 Game Plan, Momentum Score, application lifecycle, verification protocol
- [Advisor Discovery Engine Spec](../004-advisor-discovery-engine/spec.md) — trust_score, Trust Report, discovery results, scouting state
- [Core Infrastructure Spec](../002-db-core-infrastructure/spec.md) — Data layer, scholarships, applications, trust_score, momentum_score
