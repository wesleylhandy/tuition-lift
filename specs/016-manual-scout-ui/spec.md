# Feature Specification: Manual Scout Flyer-to-Fact UI and Dashboard Integration

**Feature Branch**: `016-manual-scout-ui`  
**Created**: 2025-03-08  
**Status**: Draft  
**Input**: User description: "Implement the Manual Scout Flyer-to-Fact UI and Dashboard Integration. Backend work completed in spec 007-scout-vision-ingestion."

## Clarifications

### Session 2025-03-08

- Q: Should the Manual Scout modal be gated behind authentication? → A: Authenticated only — Scout entry is hidden or disabled when not logged in.
- Q: What if extraction runs longer than expected or the backend is unresponsive? → A: Cancel option with timeout — User can cancel after ~30s; system auto-fails with retry option after ~60s.
- Q: Should Scout submissions be rate-limited per user? → A: Yes, per-user limit — 10–20 successful Scout submissions per user per scholarship cycle; users can request more; may become a premium feature.
- Q: On mobile, should the Scout experience use a dedicated route or a responsive modal? → A: Responsive modal — Same modal component; scales to full-screen on narrow viewports (e.g., ≤640px); no route change.
- Q: When extraction fails and the user chooses "enter manually," what does that mean? → A: Verification view with empty form — User sees the same side-by-side layout; right panel form is empty; user fills all fields and confirms.

## Vision & Objective

Provide a high-fidelity manual intake workspace that supports URL, PDF, and image ingestion. The UI facilitates a side-by-side verification flow where AI-extracted facts are presented for user confirmation before persistence, building on the backend capabilities delivered in spec 007-scout-vision-ingestion.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Scout Entry from Dashboard (Priority: P1)

An authenticated student sees a prominent Scout action on the dashboard and uses it to open the Manual Scout workspace.

**Why this priority**: Primary entry point—without discoverable access, the Scout flow is unreachable.

**Auth**: Scout entry is hidden or disabled when the user is not authenticated.

**Independent Test**: Can be tested by verifying the Scout entry is visible on the dashboard, clicking it opens the Manual Scout modal, and closing returns to the dashboard without side effects.

**Acceptance Scenarios**:

1. **Given** the student is authenticated and on the dashboard, **When** they view the screen, **Then** a prominent Scout action (floating action button or equivalent) is visible in the bottom-right area.
2. **Given** the Scout action is visible, **When** the student clicks it, **Then** the Manual Scout modal opens with the title "Manual Scout" and subtitle "Flyer-to-Fact Workspace".
3. **Given** the Manual Scout modal is open, **When** the student clicks the close control, **Then** the modal dismisses and focus returns to the dashboard.

---

### User Story 2 - Input Selection View (Priority: P1)

A student chooses how to provide scholarship information: by pasting a URL, uploading a PDF, or capturing/uploading a photo.

**Why this priority**: Core interaction—students must be able to select their preferred input method before any extraction occurs.

**Independent Test**: Can be tested by opening the Scout modal and verifying all three input options are present, visually distinct, and that selecting each triggers the appropriate next step (URL input, file picker, or camera/photo picker).

**Acceptance Scenarios**:

1. **Given** the Manual Scout modal is open, **When** the student views the input selection, **Then** three primary cards are displayed: Paste URL, Upload PDF, and Snap Photo, each with a clear icon and micro-copy.
2. **Given** the student selects "Paste URL", **When** the selection is made, **Then** the system presents a URL input field or equivalent flow.
3. **Given** the student selects "Upload PDF", **When** the selection is made, **Then** the system presents a file picker accepting PDF documents.
4. **Given** the student selects "Snap Photo", **When** the selection is made, **Then** the system presents the ability to take a photo or upload an image.
5. **Given** the input selection view is displayed, **When** the student views it, **Then** the layout maintains a premium academic aesthetic with large icons and clear micro-copy.

---

### User Story 3 - Side-by-Side Verification Flow (Priority: P1)

A student reviews AI-extracted scholarship data alongside the source document, edits as needed, and confirms to save.

**Why this priority**: Central value proposition—user verification ensures accuracy and trust before persistence.

**Independent Test**: Can be tested by submitting a URL, PDF, or image, waiting for extraction to complete, verifying the side-by-side layout appears with document preview and pre-filled form, then confirming to persist.

**Acceptance Scenarios**:

1. **Given** extraction has completed, **When** the student views the result, **Then** a side-by-side layout is displayed: left panel shows the uploaded document or image preview; right panel shows a form with fields for Name, Amount, Deadline, URL, and Eligibility Requirements.
2. **Given** the right panel form is displayed, **When** the student views AI-extracted values, **Then** those values are visually distinguished (e.g., ghost text or highlight) to indicate they require user confirmation.
3. **Given** the student is on the verification screen, **When** they edit any field, **Then** the edited value is used for persistence.
4. **Given** the student has reviewed and optionally edited the data, **When** they click Confirm, **Then** the scholarship record is persisted and an application with "Tracked" status is created.
5. **Given** the student is on the verification screen, **When** they cancel or close without confirming, **Then** no records are persisted and any temporary data is discarded.

---

### User Story 4 - Processing Feedback (Priority: P2)

A student sees clear feedback during extraction and verification, reducing uncertainty about whether the system is working.

**Why this priority**: Builds trust during multi-second extraction; reduces abandonment when users assume the system has failed.

**Independent Test**: Can be tested by triggering extraction and verifying that a processing state is shown with step indicators (e.g., reading document, verifying) until the verification view appears.

**Acceptance Scenarios**:

1. **Given** the student has submitted a URL, PDF, or image, **When** processing starts, **Then** the input selection view is replaced by a processing overlay showing extraction progress.
2. **Given** processing is underway, **When** the student views the overlay, **Then** step indicators communicate progress (e.g., reading document, searching, verifying).
3. **Given** processing exceeds ~30 seconds, **When** the student views the overlay, **Then** a cancel control is available.
4. **Given** extraction exceeds ~60 seconds or the backend is unresponsive, **When** the timeout occurs, **Then** the system presents an error state with a retry option.
5. **Given** extraction completes, **When** the verification view is ready, **Then** a clear visual transition occurs from the processing state to the side-by-side verification layout.

---

### User Story 5 - Responsive and Accessible Experience (Priority: P2)

A student on a mobile device or using keyboard/assistive technology can complete the Scout flow without barriers.

**Why this priority**: Ensures equal access per WCAG 2.1 AA and usability on devices where flyers are commonly photographed.

**Independent Test**: Can be tested by resizing to mobile viewport (modal scales to full-screen), using keyboard-only navigation through the flow, and verifying contrast and focus visibility.

**Acceptance Scenarios**:

1. **Given** the student is on a mobile or narrow viewport (e.g., ≤640px), **When** the Manual Scout modal is open, **Then** the same modal component scales to a full-screen workspace suitable for the device without a route change.
2. **Given** the student uses a keyboard, **When** the modal is open, **Then** all interactive elements (cards, form fields, buttons) are reachable and operable via keyboard.
3. **Given** the student uses assistive technology, **When** they navigate the form, **Then** fields have appropriate labels and the Confirm action meets high-contrast requirements.
4. **Given** the student views the modal, **When** it opens or transitions between views, **Then** smooth, intentional animations provide clear feedback without obstructing interaction.

---

### Edge Cases

- What happens when the user uploads an unsupported file type? The system rejects the file with a clear message and does not proceed to extraction.
- What happens when extraction fails or returns no usable data? The system presents an error or "No data found" state with the option to retry or enter manually. "Enter manually" transitions the user to the same verification view (side-by-side layout) with empty form fields; the user fills all fields and confirms.
- What happens when extraction runs too long or the backend is unresponsive? The user can cancel after ~30 seconds; the system auto-fails with a retry option after ~60 seconds.
- What happens when the extracted deadline does not align with the user's award year? The system flags the scholarship appropriately (e.g., "Potentially Expired" or cycle mismatch) per Constitution dynamic cycle checks, and the user is informed before confirming.
- What happens when the document preview cannot be rendered (e.g., unsupported format)? The left panel shows a fallback (e.g., file name, placeholder) so the user can still verify the right-panel form.
- What happens when the user has an existing scholarship with a fuzzy title match? The system notifies the user and offers the choice to add anyway or cancel, per spec 007. Duplicate prevention also uses URL-based upsert: same URL updates existing scholarship.
- What happens when the user has reached their Scout submission limit (10–20 successful submissions per scholarship cycle)? The system presents a friendly message, offers the option to request more, and blocks further submissions until the limit is raised or the cycle resets.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a prominent Scout entry (floating action button or equivalent) in the bottom-right area of the dashboard that opens the Manual Scout modal. The Scout entry MUST be visible and operable only when the user is authenticated; it MUST be hidden or disabled when not logged in.
- **FR-002**: System MUST display the Manual Scout modal with title "Manual Scout" and subtitle "Flyer-to-Fact Workspace" when the Scout entry is activated.
- **FR-003**: System MUST present an input selection view with three distinct options: Paste URL, Upload PDF, and Snap Photo, each with a clear icon and micro-copy in a premium academic aesthetic.
- **FR-004**: System MUST trigger extraction when the user provides a URL, PDF, or image, invoking the backend capabilities defined in spec 007.
- **FR-005**: System MUST display a side-by-side verification layout when extraction completes (or when the user chooses "enter manually" after extraction failure): left panel shows document/image preview (or fallback); right panel shows a form with Name, Amount, Deadline, URL, and Eligibility Requirements. When extraction fails or returns no data, "enter manually" presents the same verification view with empty form fields.
- **FR-006**: System MUST visually distinguish AI-extracted values in the verification form so users know which fields require confirmation.
- **FR-007**: System MUST allow the user to edit all verification form fields before confirming.
- **FR-008**: System MUST persist the scholarship and create an application with "Tracked" status only when the user explicitly confirms.
- **FR-009**: System MUST verify the extracted deadline aligns with the user's award year (e.g., 2026-2027) before or at confirmation, flagging mismatches appropriately.
- **FR-010**: System MUST display a processing overlay with step indicators during extraction. The overlay MUST offer a cancel control after ~30 seconds; if extraction exceeds ~60 seconds or the backend is unresponsive, the system MUST auto-fail and present a retry option.
- **FR-011**: System MUST use a single responsive modal component that scales to a full-screen workspace on narrow viewports (e.g., ≤640px); no dedicated route or page change; the same modal is used across breakpoints.
- **FR-012**: System MUST support full keyboard navigability for all interactive elements within the Scout flow.
- **FR-013**: System MUST ensure the Confirm action and key interactions meet high-contrast requirements for accessibility.
- **FR-014**: System MUST use smooth modal entrance and view-transition animations that do not obstruct usability.
- **FR-015**: System MUST enforce a per-user limit of 10–20 successful Scout submissions per scholarship cycle. The limit MUST be configurable without redeploy (see plan/data-model for implementation). When the limit is reached, the system MUST display a friendly message (e.g., "You've reached your Scout limit for this cycle. Request more or wait until next year."), block further submissions, and offer the option to request more. Future premium tier may raise the limit.
- **FR-016**: System MUST record scholarship provenance via `source` when Scout confirms: set `source = 'manual'` for Scout-originated scholarships. Enables "Added from Scout" display and future cross-source deduplication (see data-model.md §2).

### Key Entities

- **Manual Scout Modal**: The primary UI shell for the Flyer-to-Fact workspace; contains input selection and verification views.
- **Input Selection View**: The initial view offering Paste URL, Upload PDF, and Snap Photo options.
- **Verification View**: The side-by-side layout displaying document preview (left) and pre-filled verification form (right).
- **Extracted Scholarship Data**: Transient data from AI extraction (Name, Amount, Deadline, URL, Eligibility) held in memory until user confirmation; persists to scholarship and application entities per spec 007.

## Assumptions

- Manual Scout is available only to authenticated users; the Scout entry is hidden or disabled when not logged in.
- Backend extraction, verification, Trust Score, and persistence logic from spec 007-scout-vision-ingestion is available and operational.
- The dashboard layout and shell from existing specs (e.g., 006, 010) provide the context for the Scout entry placement.
- The user's award year is available in their profile or session for cycle verification.
- File type and size limits from spec 007 apply; the UI reflects those limits in error messaging.
- Scout submissions are limited per user per scholarship cycle; limit configurable without redeploy (default 15). **"Request more" MVP**: UI shows the option when limit reached; blocks further submissions. Backend flow (support ticket, premium upgrade) deferred; button may link to contact or show "Coming soon." Admin can raise limit via config.
- Premium academic aesthetic aligns with the design system established in spec 010.
- **Paste URL card**: Accepts both URLs and scholarship names; the 007 backend treats name input as a search query (manual_research node). No separate "name only" card—same flow as 007.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can open the Manual Scout modal from the dashboard in one click from the Scout entry.
- **SC-002**: Users can complete the full Scout flow (select input → extract → verify → confirm) in under 90 seconds for typical documents under normal conditions.
- **SC-003**: The verification form clearly distinguishes AI-extracted values in 100% of extraction completions.
- **SC-004**: Zero scholarship or application records are created without explicit user confirmation.
- **SC-005**: The Scout flow is fully keyboard-navigable and meets WCAG 2.1 AA contrast requirements for key actions.
- **SC-006**: The responsive modal scales to full-screen on narrow viewports (e.g., ≤640px, including 375px mobile) without horizontal scroll, obscured content, or route change.
