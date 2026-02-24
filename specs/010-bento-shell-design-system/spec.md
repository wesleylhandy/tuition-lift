# Feature Specification: TuitionLift Bento Shell and Design System

**Feature Branch**: `010-bento-shell-design-system`  
**Created**: 2025-02-24  
**Status**: Draft  
**Input**: User description: "Implement the TuitionLift Bento Shell and Design System"

## Overview

Deliver a high-fidelity 'Premium Academic' shell and design system for the TuitionLift dashboard, enabling a consistent, accessible, and visually distinctive experience. The implementation establishes the foundational layout, color palette, typography, and placeholder containers that subsequent feature specs will populate with real data and functionality.

**Reference Wireframes**: `specs/wireframes/TuitionLift__dashboard.png`, `specs/wireframes/TuitionLift__Calendar-expanded.png`

## Clarifications

### Session 2025-02-24

- Q: Should the dashboard route be behind authentication (login required) or accessible to unauthenticated visitors? → A: Protected—dashboard requires authentication; unauthenticated users are redirected to login.
- Q: Should the welcome message area and bottom stats row be in scope for this spec? → A: In scope—include both as placeholder/skeleton shells.
- Q: When a section fails to load, should the shell show a distinct error state or keep showing the loading skeleton? → A: Distinct error state per section with retry; user-friendly messages only—no application internals, stack traces, or technical details exposed.
- Q: Should "textured" Clarity Off-White be a visual pattern or a warm solid color? → A: Warm solid—no pattern; use a warm off-white hex value only.
- Q: Should the header include the TuitionLift logo and tagline? → A: Yes—include logo and "Scholarship Command Center" tagline; use a replaceable placeholder asset until the final logo is available.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Premium Academic Dashboard Shell (Priority: P1)

A returning user opens the dashboard and sees a cohesive, branded layout with the global header, welcome area, bento grid structure (three content sections), and bottom stats row. The visual identity (colors, typography, spacing) conveys a premium academic feel before any dynamic content loads.

**Why this priority**: Establishes the core shell and design system; all other dashboard features depend on this foundation.

**Independent Test**: Can be fully tested by loading the dashboard route and verifying the shell layout, color palette, typography, and placeholder sections render correctly. Delivers a recognizable TuitionLift brand experience.

**Acceptance Scenarios**:

1. **Given** an unauthenticated user navigates to the dashboard, **When** the request is processed, **Then** they are redirected to the login route.
2. **Given** an authenticated user navigates to the dashboard, **When** the page loads, **Then** they see a global header with TuitionLift branding (logo + tagline), search bar, notification center, and Debt Lifted progress ring area.
3. **Given** the dashboard loads, **When** content is not yet available, **Then** the welcome area, three main sections (Today's Game Plan, Discovery Feed, Deadline Calendar), and bottom stats row display loading skeletons in their designated positions.
4. **Given** the dashboard renders, **When** the user views any text, **Then** headers use the serif font and body/utility text uses the sans-serif font per the design system.
5. **Given** the dashboard renders, **When** the user views the page, **Then** the palette (Navy, Electric Mint, Slate, Off-White) is applied consistently across the shell.

---

### User Story 2 - Use Accessible Interactive Elements (Priority: P2)

A user with accessibility needs (screen reader, keyboard navigation, or motor impairment) can navigate the dashboard shell. All interactive elements meet minimum touch target size and color contrast requirements.

**Why this priority**: Required for WCAG 2.1 AA compliance and inclusive access. Builds on P1 shell.

**Independent Test**: Can be tested by running accessibility audits (e.g., axe-core) and verifying touch target sizes. Delivers compliance with legal and ethical standards.

**Acceptance Scenarios**:

1. **Given** a content section fails to load, **When** the error state is displayed, **Then** the user sees a friendly message and retry control; no stack traces, paths, or technical internals are visible.
2. **Given** the dashboard is displayed, **When** an accessibility audit runs, **Then** all interactive elements pass WCAG 2.1 AA contrast and semantics checks.
3. **Given** any tappable/clickable element, **When** measured, **Then** the minimum touch target is 44×44px.
4. **Given** body text, **When** measured, **Then** the base font size is at least 16px.
5. **Given** the user focuses interactive elements via keyboard, **Then** focus indicators are visible and logical tab order is preserved.

---

### User Story 3 - Responsive Bento Grid Adapts to Viewport (Priority: P3)

A user views the dashboard on a tablet or mobile device. The bento grid reflows to accommodate smaller viewports while preserving the shell structure and design system tokens.

**Why this priority**: Ensures usability across devices; lower priority than core desktop shell and accessibility.

**Independent Test**: Can be tested by resizing the viewport or using device emulation. Delivers a usable layout across common breakpoints.

**Acceptance Scenarios**:

1. **Given** the user views the dashboard on desktop, **When** the layout renders, **Then** the bento grid displays in the intended multi-column arrangement (12-column base).
2. **Given** the viewport narrows (e.g., tablet), **When** the layout reflows, **Then** sections stack or resize without horizontal overflow.
3. **Given** the viewport is mobile-sized, **When** the layout renders, **Then** the global header and content sections remain usable and readable.

---

### Edge Cases

- What happens when the Debt Lifted value is zero or extremely large? Display format handles edge values without layout breakage.
- How does the search bar behave when focused before any search functionality exists? Shell provides the input with placeholder; behavior is placeholder-only for this spec.
- How does the notification center display when count is zero? Icon is visible; badge/count is hidden or shows zero appropriately.
- What happens when a section's loading skeleton is shown indefinitely? Skeleton design is recognizable and does not imply completed content.
- What happens when a section fails to load? Per-section error state with user-friendly message and retry; no technical details exposed.

## Requirements *(mandatory)*

### Functional Requirements

#### Design System

- **FR-001**: The design system MUST define a color palette comprising Navy (#1A1A40), Electric Mint (#00FFAB), Slate (#64748B), and 'Clarity' Off-White (warm solid, no pattern; e.g., #fafaf9).
- **FR-002**: The design system MUST define typography: serif font for headers, sans-serif font for body and utility text.
- **FR-003**: The design system MUST expose custom colors through a central configuration (e.g., theme or config file) for consistent use across components.
- **FR-004**: All interactive elements MUST have a minimum touch target of 44×44px.
- **FR-005**: Body text base font size MUST be at least 16px.
- **FR-006**: Color contrast MUST meet WCAG 2.1 AA (4.5:1 for normal text, 3:1 for large text).
- **FR-007**: Focus indicators MUST be visible and never removed without a replacement.

#### Layout Components

- **FR-008**: The dashboard route MUST be protected; unauthenticated users MUST be redirected to login.
- **FR-009**: A Global Header MUST be present, containing: branding (logo + "Scholarship Command Center" tagline), a search bar, a notification center, and a Debt Lifted progress ring area. The logo MUST be a replaceable placeholder (e.g., SVG or image) until the final brand asset is available; swapping the asset MUST NOT require layout changes.
- **FR-010**: The Debt Lifted progress ring MUST display a numeric value (e.g., $47,250) with appropriate styling; the ring MUST visually indicate progress toward a goal.
- **FR-011**: A responsive Bento Grid container MUST span 12 columns (base) and reflow for smaller viewports.
- **FR-012**: The shell MUST include a welcome message area (e.g., "Welcome back, [Name]" and progress copy such as "You're $X closer to your goal") as a placeholder/skeleton until real data is available.
- **FR-013**: The shell MUST include a bottom stats row with four metric slots (e.g., APPLICATIONS, MATCH SCORE, ACTIVE DEADLINES, TOTAL POTENTIAL) as placeholder/skeleton shells.
- **FR-014**: The shell MUST include three content containers: "Today's Game Plan," "Discovery Feed," and "Deadline Calendar."
- **FR-015**: Each content container (welcome area, stats row, Game Plan, Discovery Feed, Deadline Calendar) MUST support a loading skeleton state when content is not yet available.
- **FR-016**: Loading skeletons MUST reflect the approximate structure of their respective sections (list-like for Game Plan, card-like for Discovery Feed, calendar-like for Deadline Calendar, text-line for welcome, four-card row for stats).
- **FR-017**: Components MUST be generic and reusable where possible to support future feature specs.
- **FR-018**: Each content section MUST support a distinct error state when load fails; the error state MUST display a user-friendly message and a retry control. Error messages MUST NOT expose application internals (stack traces, API codes, paths, or technical details).

### Key Entities

- **Design Tokens**: Color values, typography families, spacing scales—defined centrally for consistency.
- **Shell Layout**: The structural container (header + welcome area + bento grid + stats row) that wraps dashboard content.
- **Placeholder Section**: Each shell (welcome area, stats row, Today's Game Plan, Discovery Feed, Deadline Calendar) with loading skeleton capability.

### Data Dependencies (for plan.md)

The welcome area and stats row will be populated by existing or future data sources. No DB schema changes are required for this spec (shells are placeholders). When populating real data, plan.md or dedicated feature specs should reference:

| Shell Element | Likely Data Source | Notes |
|---------------|--------------------|-------|
| Welcome (user name) | Profiles (display_name / first_name) | See 002-db-core-infrastructure, 008-quick-onboarder |
| Welcome (Debt Lifted $) | Aggregated from Applications/Scholarships | Calculation defined in Coach/Discovery specs |
| APPLICATIONS | Applications count (in progress) | 006-scholarship-inbox-dashboard, application state |
| MATCH SCORE | User profile + scholarship matching | Advisor/Discovery engine |
| ACTIVE DEADLINES | Applications with due dates in range | Applications, scholarships |
| TOTAL POTENTIAL | Sum of scholarship amounts matched | Discovery engine, scholarships |

If any aggregate or profile field is missing, the implementation plan for populating these shells should propose the minimal DB/extensions needed—not this shell spec.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users see the complete shell (header + bento grid + three sections) within 2 seconds of navigation on a typical connection.
- **SC-002**: An automated accessibility audit (WCAG 2.1 AA) passes with zero critical or serious violations on the dashboard shell.
- **SC-003**: All tap targets measure at least 44×44px when verified manually or via tooling.
- **SC-004**: The layout adapts without horizontal scrolling at viewport widths of 375px, 768px, and 1280px.
- **SC-005**: Color contrast ratios meet 4.5:1 for normal text and 3:1 for large text when measured with a contrast checker.
- **SC-006**: A developer can add a new bento section by composing existing generic components without duplicating layout or design token logic.

## Assumptions

- Implementation will use Next.js (App Router), Tailwind CSS with central theme/config for custom colors, and Lucide-react for icons, per user specification.
- The serif font is Playfair Display and the sans-serif font is Inter, per wireframes; font loading strategy will be defined in plan.md.
- "Clarity" Off-White is a warm solid color (no texture or pattern); exact value aligns with #fafaf9 or similar per existing design tokens in the codebase.
- The Debt Lifted progress ring shows a single value (e.g., $47,250); the full goal amount and progress calculation logic may be defined in a separate spec.
- Search bar and notification center are non-functional placeholders for this spec; interaction behavior will be specified in subsequent specs.
- Redirect target for unauthenticated /dashboard is /onboard; a dedicated landing page and login route will be addressed in a future spec.
- Logo placeholder is used until the final TuitionLift brand logo exists; plan.md will define a replaceable asset (e.g., SVG) that can be swapped without layout changes.
- Loading skeletons are the default/initial state for the welcome area, stats row, and three bento sections until their respective feature specs deliver real data.
- Welcome area and stats row placeholders do not require DB schema changes; data contracts for populating them will be defined when those features are implemented (plan.md or linked specs).
- Error messages for failed section loads use generic, actionable copy (e.g., "Something went wrong. Try again."); implementation must never surface internals in production.
