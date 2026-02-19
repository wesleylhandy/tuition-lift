# Feature Specification: Quick Onboarder Wizard

**Feature Branch**: `008-quick-onboarder`  
**Created**: 2026-02-18  
**Status**: Draft  
**Input**: User description: "Create a 'Quick Onboarder' Wizard for TuitionLift that handles Identity, Academic, and Financial intake. We need to be modular so that we can easily replace in a future iteration with a more permanent solution."

## Clarifications

### Session 2026-02-18

- Q: Which academic profile fields are required to advance to the Financial Pulse step? → A: Only Intended Major and State; Full Name and GPA optional.
- Q: Validation behavior for invalid or malformed input? → A: Email must not allow malformed values (block with error). Optional fields (Full Name, GPA, SAI, Pell) are skippable. SAI is not required but very helpful. GPA can exceed 4.0 (weighted scales); weighted vs unweighted distinction may be refined in a future iteration.
- Q: Loading behavior during async actions (save, discovery trigger)? → A: Show skeleton loading indicator during save/trigger; block duplicate submit.
- Q: Explicit accessibility requirement for onboarding? → A: Yes—add explicit WCAG 2.1 AA requirement for onboarding flow.
- Q: Rate limiting for signup? → A: Yes—rate limit signup attempts per email (e.g., 3–5 per hour).
- Q: Store both GPA types for scholarship matching? → A: Yes—profile supports weighted and unweighted GPA separately (two nullable fields); user may provide one or both.

## Vision & UX Objective

Build a high-trust, 3-step onboarding flow to move a user from authentication to a functional dashboard. The UI must be minimalist, centered, and mobile-friendly. Each step is guided by the Coach persona—supportive, energetic, and clear—with one-line tips that reduce anxiety and encourage completion.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Identity (Account Creation) (Priority: P1)

A new user creates an account using email and password. Upon successful account creation, the system automatically advances them to the Academic Profile step—no manual navigation required.

**Why this priority**: Without an account, no other onboarding steps are possible. This is the gate to the entire flow.

**Independent Test**: Can be fully tested by completing email/password signup and verifying the user is immediately presented with the Academic Profile step; value is seamless progression.

**Acceptance Scenarios**:

1. **Given** a user is on the onboarding flow, **When** they enter a valid email and password and submit, **Then** the system creates their account and advances them to the Academic Profile step.
2. **Given** a user enters an invalid email or weak password, **When** they submit, **Then** the system displays a clear validation error and does not advance.
3. **Given** a user submits valid credentials, **When** account creation succeeds, **Then** the user is redirected to Step 2 with no intermediate confirmation screen.

---

### User Story 2 - Academic Profile Intake (Priority: P1)

A user who has just created an account provides their academic context: Intended Major and State (required), and optionally Full Name and GPA—weighted and/or unweighted, one or both. A Coach tip reassures them (e.g., "Don't worry if you don't know your exact GPA—an estimate works for now!"). The system persists all provided data to the user's profile; weighted and unweighted are stored separately for scholarship matching.

**Why this priority**: Academic context is required for scholarship discovery. The Coach persona reduces friction and encourages honest estimates.

**Independent Test**: Can be fully tested by completing the Academic Profile step and verifying the data is persisted; profile must be retrievable and correct.

**Acceptance Scenarios**:

1. **Given** a user is on the Academic Profile step, **When** they fill Intended Major and State (required) and optionally Full Name and GPA—weighted and/or unweighted, one or both—and submit, **Then** the system saves the data and advances them to the Financial Pulse step.
2. **Given** the Academic Profile step is shown, **When** the user views it, **Then** a Coach tip is displayed to encourage completion and reduce anxiety.
3. **Given** a user enters an invalid GPA (e.g., negative or unreasonably high), **When** they submit, **Then** the system displays a validation error or allows skip (GPA is optional).
4. **Given** Intended Major or State is missing, **When** the user submits, **Then** the system indicates what is required and does not advance until both are provided.

---

### User Story 3 - Financial Pulse Intake and Discovery Launch (Priority: P1)

A user provides their financial context: Estimated SAI (Student Aid Index) and Pell Eligibility (yes/no/unknown or equivalent). The SAI field includes explanatory help (e.g., a "What is this?" tooltip) so users understand what to enter. A Coach tip contextualizes the step. The primary call-to-action is "Finish & Start Discovery"—completing onboarding and triggering the first Advisor Brain search loop. Upon success, the user is navigated to the dashboard.

**Why this priority**: Financial context enables need-based scholarship matching. Launching discovery immediately after onboarding gives users immediate value and momentum.

**Independent Test**: Can be fully tested by completing the Financial Pulse step, clicking "Finish & Start Discovery", and verifying the user reaches the dashboard with onboarding marked complete and discovery triggered.

**Acceptance Scenarios**:

1. **Given** a user is on the Financial Pulse step, **When** they view the SAI field, **Then** explanatory help (e.g., "What is this?" tooltip) is available to clarify what SAI means.
2. **Given** a user fills Estimated SAI and Pell Eligibility and clicks "Finish & Start Discovery", **When** the submission succeeds, **Then** the system records onboarding as complete, triggers the first Advisor Brain search, and navigates the user to the dashboard.
3. **Given** the Financial Pulse step is shown, **When** the user views it, **Then** a Coach tip is displayed.
4. **Given** SAI is optional and skippable, **When** the user enters an out-of-range value, **Then** the system displays a validation error and either blocks until corrected or allows skip. SAI is not required but very helpful for matching.
5. **Given** onboarding completes, **When** the user arrives at the dashboard, **Then** they do not see the onboarding flow again—the system treats them as fully onboarded.

---

### User Story 4 - Progress and Visual Feedback (Priority: P2)

A user sees clear progress through the wizard: a high-contrast progress bar indicates which step they are on (1 of 3, 2 of 3, 3 of 3). The layout is centered, compact, and works on mobile devices.

**Why this priority**: Progress feedback reduces abandonment and builds confidence that the flow is finite and achievable.

**Independent Test**: Can be tested by advancing through each step and verifying the progress indicator updates correctly and the layout remains usable on mobile viewports.

**Acceptance Scenarios**:

1. **Given** a user is on any step of the onboarding flow, **When** they view the screen, **Then** a progress indicator shows their current step (e.g., Step 1 of 3).
2. **Given** a user advances to Step 2 or 3, **When** the step loads, **Then** the progress indicator updates to reflect the new step.
3. **Given** a user views the onboarding flow on a mobile device, **When** they interact with it, **Then** the layout is usable—no horizontal scroll, touch targets are adequate, and content is readable.

---

### User Story 5 - Modular Design for Future Replacement (Priority: P3)

The onboarding wizard is designed as a modular flow so that it can be replaced in a future iteration with a more permanent or extended solution without requiring a full rewrite of the application.

**Why this priority**: Reduces technical debt and allows the product to evolve onboarding (e.g., add steps, change validation, integrate different auth) without high refactor cost.

**Independent Test**: Can be assessed by code/architecture review: the onboarding flow is isolated from core dashboard and discovery logic; replacing it does not require changes to unrelated features.

**Acceptance Scenarios**:

1. **Given** the onboarding wizard exists, **When** a product decision is made to replace it with a different flow, **Then** the replacement can be implemented without modifying discovery, dashboard, or profile persistence logic beyond the onboarding boundary.
2. **Given** the system records onboarding completion, **When** the user completes the flow, **Then** the completion flag is the sole signal used by the application to determine "onboarded" status—no hardcoded step checks elsewhere.

---

### Edge Cases

- What happens when a user closes the browser mid-onboarding and returns? → System retains partial progress where possible (e.g., account exists, profile may be incomplete); user resumes from the appropriate step based on what data is already stored.
- What happens when the user is already authenticated and navigates to the onboarding URL? → If onboarding is already complete, redirect to dashboard; otherwise show the step where they left off.
- What happens when validation fails on submit (network error, duplicate email)? → System displays a clear, user-friendly error message; user remains on the current step and can retry or correct input.
- What happens when signup rate limit is exceeded? → System displays a clear message (e.g., "Too many attempts; try again later"); user cannot complete signup until the limit window resets.
- What happens during save or discovery trigger (async in progress)? → System shows a skeleton loading indicator; duplicate submit is blocked until the action completes.
- What happens when the "Finish & Start Discovery" action fails (e.g., discovery trigger error)? → System records onboarding complete so the user is not stuck in the wizard; surfaces a message that discovery will start soon or offers a manual retry from the dashboard.
- What happens when a user has no SAI or uncertain Pell status? → System allows completion; both are optional and skippable. Discovery still runs with available context (may produce broader matches). Coach tip conveys that SAI is very helpful when known.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support account creation via email and password. Signup attempts MUST be rate-limited per email (e.g., 3–5 attempts per hour).
- **FR-002**: System MUST automatically advance the user from the Identity step to the Academic Profile step upon successful account creation.
- **FR-003**: System MUST collect Intended Major and State (required to advance) and Full Name and GPA (optional) in the Academic Profile step; persist all provided values. GPA is captured as weighted and/or unweighted—two separate optional fields; user may provide one or both for scholarship matching (some scholarships require one type and not the other).
- **FR-004**: System MUST collect Estimated SAI and Pell Eligibility in the Financial Pulse step; both are optional and skippable. SAI field MUST provide explanatory help (e.g., "What is this?" tooltip) and Coach tip should convey that SAI is very helpful for matching.
- **FR-005**: System MUST display a Coach tip on each step—one-line, supportive micro-copy that reduces anxiety and encourages completion.
- **FR-006**: System MUST provide a "Finish & Start Discovery" call-to-action that, when completed successfully, records onboarding as complete, triggers the first Advisor Brain search, and navigates the user to the dashboard.
- **FR-007**: System MUST record an onboarding-complete flag when the user successfully finishes the wizard; this flag is the canonical signal for "user has completed onboarding."
- **FR-008**: System MUST validate required inputs strictly: email format and password strength must not allow malformed values; invalid input blocks advance with clear error. Optional fields (Full Name, GPA, SAI, Pell) are skippable. When an optional field is provided, invalid values (e.g., GPA negative, SAI out of range) block advance until corrected or removed (removed = user clears the field to skip validation). GPA: unweighted 0–4, weighted 0–6; SAI has valid range (-1500–999999) when provided.
- **FR-009**: System MUST display a visible progress indicator showing the current step (e.g., 1 of 3, 2 of 3, 3 of 3).
- **FR-010**: System MUST present the onboarding flow in a compact, centered layout that is mobile-friendly (no horizontal scroll, 44px min touch targets per WCAG, readable content).
- **FR-015**: System MUST meet WCAG 2.1 AA accessibility requirements for the onboarding flow (keyboard navigation, focus management, screen reader support, color contrast).
- **FR-011**: System MUST be designed so the onboarding wizard can be replaced in a future iteration without requiring changes to discovery, dashboard, or profile persistence logic beyond the onboarding boundary.
- **FR-012**: System MUST redirect users who have already completed onboarding away from the wizard to the dashboard.
- **FR-013**: System MUST allow users who closed mid-flow to resume from the appropriate step based on stored data.
- **FR-014**: System MUST show a skeleton loading indicator during async actions (profile save, discovery trigger) and block duplicate submit until the action completes.

### Key Entities

- **User Account**: Represents authenticated identity; created in Step 1; email and password credentials.
- **Profile**: Persistent user record containing academic context (full name, intended major, GPA—weighted and unweighted stored separately when provided, state of residence) and financial context (estimated SAI, Pell eligibility); created/updated in Steps 2 and 3.
- **Onboarding State**: Tracks completion; when true, user is considered fully onboarded and is redirected to dashboard if they access onboarding again.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete the full onboarding flow (Identity → Academic → Financial) in under 3 minutes on first attempt.
- **SC-002**: 90% of users who start Step 1 reach Step 2 (account creation success rate).
- **SC-003**: 85% of users who complete Step 2 reach Step 3 (Academic Profile completion rate).
- **SC-004**: 80% of users who complete Step 3 successfully trigger discovery and land on the dashboard (Financial Pulse completion and discovery launch rate).
- **SC-005**: The onboarding layout achieves Lighthouse Mobile Usability score of 90+ (touch targets, readable text, no horizontal scroll).
- **SC-006**: Coach tips are present and legible on all three steps; user testing confirms they reduce perceived friction.

## Assumptions

- Account creation uses email and password (no social login or magic link in this iteration).
- Full Name and GPA are optional in the Academic Profile step; Coach tip encourages GPA estimate when user is uncertain.
- SAI and Pell Eligibility are optional and skippable; SAI is very helpful for need-based matching. Discovery can run with partial financial data. Profile stores weighted and unweighted GPA as separate optional fields; user may provide one or both; some scholarships require one type for matching.
- A persistent user profile store already exists and supports the required fields (academic and financial context); this spec does not define the schema.
- The Advisor Brain search loop and dashboard exist and are reachable; this spec assumes integration points.
- Visual style (centered card, progress bar color, typography) will be defined in the technical plan; this spec focuses on functional requirements.
