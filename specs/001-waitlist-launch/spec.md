# Feature Specification: TuitionLift Waitlist & Launch System

**Feature Branch**: `001-waitlist-launch`  
**Created**: 2026-02-13  
**Status**: Draft  
**Input**: User description: "TuitionLift Waitlist & Launch System - Professional landing page with waitlist signup for High School Seniors/Parents and Graduate School Applicants"

## Clarifications

### Session 2026-02-13

- Q: How many spots does the referrer move up per successful referral? → A: Configurable initially via env vars; admin UI deferred
- Q: When a user submits an email already on the waitlist, what should they see? → A: Generic message plus share incentive, but no position (Option C)
- Q: How is the guide delivered when a user shares their referral link? → A: Email with guide (link or attachment) sent when they share (Option A)
- Q: Should the signup form be rate-limited? → A: Yes—per IP and per email (e.g., 3 attempts per email per hour); emails validated as strictly as safely possible
- Q: Should the landing page vary by segment? → A: Single page, same flow for all; copy speaks to both segments; optional form field lets users self-categorize (e.g., HS/undergrad/masters/doctoral)
- Q: Does the referral link need to contain a unique identifier for the referrer? → A: Yes—the referral link MUST contain a unique identifier so signups can be attributed correctly (Option A)
- Q: Should the spec include a Lighthouse success criterion? → A: Yes—add "Landing page achieves Lighthouse Performance and Best Practices scores of 90+ each" (Option A)
- Q: Should FR-011 include an example for upward-momentum metaphor? → A: Yes—add example: abstract rising lines, ascending arrow, or minimalist 'lift' icon (Option A)
- Q: Should the spec spell out form failure retry UX? → A: Yes—error MUST include "Please try again"; fail fast with validation before submit; retry only for reasonable server errors (Option A + nuance)
- Q: Should the spec explicitly forbid PII in client-side outputs? → A: Yes—no email or other PII in browser console, user-facing error messages, or client-side logs (Option A)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Join the Waitlist (Priority: P1)

A visitor arrives from social media or direct traffic and wants early access to TuitionLift. They see a professional landing page communicating "The Lift"—removing education debt through AI guidance (The Advisor) and execution support (The Coach). They enter their email and click "Get Early Access" to join the waitlist.

**Why this priority**: Core conversion flow; without signup capability, the entire landing page has no measurable outcome.

**Independent Test**: Can be fully tested by completing the email signup form and verifying the signup is recorded. Delivers the primary business value of capturing leads.

**Acceptance Scenarios**:

1. **Given** a visitor on the landing page, **When** they enter a valid email and click "Get Early Access", **Then** they are added to the waitlist and see a success state
2. **Given** a visitor on the landing page, **When** they enter an invalid email format, **Then** they see a clear validation message and cannot submit
3. **Given** a visitor on the landing page, **When** they submit the form, **Then** they receive immediate feedback (success or error) within 3 seconds

---

### User Story 2 - Understand the Value Proposition (Priority: P1)

A visitor wants to understand what TuitionLift offers before signing up. They see a 3-step value section explaining: (1) Agentic Discovery—finding funds others miss, (2) Anti-Scam Shield—verified sources only, (3) The Playbook—daily coaching delivered to their inbox.

**Why this priority**: Value communication drives conversion; visitors must trust the offer before committing their email.

**Independent Test**: Can be tested by verifying all three value points are visible and readable on desktop and mobile viewports.

**Acceptance Scenarios**:

1. **Given** a visitor on the landing page, **When** they scroll or view the page, **Then** they can read all three value steps without obstruction
2. **Given** a visitor on a mobile device, **When** they view the value section, **Then** content remains readable and accessible (thumb-friendly tap targets)
3. **Given** a visitor, **When** they view the page, **Then** the visual design conveys "Premium Academic Fintech"—trustworthy, modern, professional

---

### User Story 3 - Conversion Loop & Viral Incentive (Priority: P2)

After signing up, a new waitlist member sees their position in line (e.g., "You are #24 in line") and is offered a reward for sharing: "Share this link to jump 10 spots and unlock the '2026 Scholarship Prep Guide' immediately."

**Why this priority**: Viral mechanics amplify organic growth; increases signup volume without paid acquisition.

**Independent Test**: Can be tested by signing up, verifying position display, and confirming the share incentive and unlock mechanics are presented.

**Acceptance Scenarios**:

1. **Given** a user has just signed up, **When** the success state loads, **Then** they see their waitlist position (e.g., "#24 in line")
2. **Given** a user sees the success state, **When** they view the share incentive, **Then** they understand they can jump spots by sharing and unlock a bonus guide
3. **Given** a user shares the link, **When** a referred visitor signs up, **Then** the original user’s position improves by the configurable jump amount
4. **Given** a user shares their referral link, **When** the share action completes, **Then** the Unlock Asset (e.g., 2026 Scholarship Prep Guide) is sent to their email within 5 minutes

---

### User Story 4 - Welcome Email & First Coach Interaction (Priority: P2)

After signing up, the system triggers a welcome email that delivers the first "Coach" interaction—supportive, motivational content that reinforces the value of TuitionLift.

**Why this priority**: Immediate email delivery validates the signup and starts the relationship; reduces abandonment and builds anticipation.

**Independent Test**: Can be tested by signing up with a real email and verifying receipt of the welcome email within 5 minutes.

**Acceptance Scenarios**:

1. **Given** a user has successfully joined the waitlist, **When** the signup completes, **Then** a welcome email is sent within 5 minutes
2. **Given** the welcome email, **When** the user opens it, **Then** they see content in the "Coach" persona—supportive, energetic, and clear
3. **Given** the signup flow, **When** the system triggers the email, **Then** no personal data beyond the email is logged or exposed

---

### Edge Cases

- What happens when the user enters an email already on the waitlist? The system MUST show a generic friendly message (e.g., "You're already on the list!") plus the share incentive, but MUST NOT display their position
- How does the system handle form submission failures (e.g., temporary outage)? System MUST validate before submission (fail fast); for reasonable server errors, user sees a clear error message including "Please try again" (or equivalent) and the form MUST remain usable for retry
- How does the system handle bot or automated signups? Invisible controls prevent automated submissions from being recorded; rate limits (per IP and per email) throttle abuse
- What happens when the user submits with an empty or whitespace-only email? Validation prevents submission and shows an inline error

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST capture and persist waitlist signups (email address) with a timestamp and optional position/rank
- **FR-002**: System MUST validate email format as strictly as safely possible (format, domain, disposable/throwaway detection where feasible) before accepting signup; reject invalid formats with clear user-facing feedback
- **FR-002a**: System MUST validate form inputs before submission (fail fast); retry messaging ("Please try again") and form usability apply only to reasonable server errors, not validation failures
- **FR-003**: System MUST protect the signup form from automated/bot submissions using invisible controls that do not affect human users
- **FR-004**: System MUST protect the signup form from cross-site request forgery
- **FR-005**: System MUST display a success state after signup showing the user’s waitlist position and the share-to-jump-spots incentive
- **FR-006**: System MUST trigger a welcome email to the user’s address within 5 minutes of successful signup, with content in the Coach persona
- **FR-006a**: System MUST send the Unlock Asset (e.g., 2026 Scholarship Prep Guide) via email (link or attachment) when a user shares their referral link
- **FR-007**: System MUST NOT log or expose personally identifiable information in client-side or debug outputs; specifically, no email or other PII in browser console, user-facing error messages, or client-side logs
- **FR-007a**: System MUST rate-limit signups per IP and per email (e.g., 3 attempts per email per hour); limits MUST be configurable
- **FR-008**: The landing page MUST present a hero section with email capture and "Get Early Access" as the primary call-to-action; an optional self-categorization field (e.g., segment: High School / Undergraduate / Masters / Doctoral) MAY be offered to help users identify their stage
- **FR-009**: The landing page MUST present a 3-step value section: Agentic Discovery, Anti-Scam Shield, and The Playbook
- **FR-010**: The landing page MUST be fully usable on mobile devices with touch-friendly controls (minimum 44px tap targets for primary actions)
- **FR-011**: The visual design MUST convey "Premium Academic Fintech"—trustworthy, modern, professional—and support upward-momentum visual metaphor where appropriate (e.g., abstract rising lines, ascending arrow, or minimalist "lift" icon)
- **FR-012**: The share-to-jump-spots mechanism MUST assign positions and allow referred signups to improve the referrer’s position by a configurable jump amount (initially via configuration; admin UI deferred)
- **FR-013**: When a duplicate email is submitted, the system MUST display a generic friendly message and the share incentive, but MUST NOT reveal the user’s waitlist position

### Key Entities

- **Waitlist Entry**: A signup record containing email, timestamp, optional position/rank, optional referrer identifier, and optional segment (self-categorization: e.g., High School, Undergraduate, Masters, Doctoral)
- **Referral Link**: A shareable link that MUST contain a unique identifier for the referrer; when a new signup arrives via this link, the referrer’s position improves
- **Unlock Asset**: The "2026 Scholarship Prep Guide" (or equivalent) offered to users who share—delivered via email (link or attachment) when they share their referral link

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete waitlist signup in under 60 seconds from landing on the page
- **SC-002**: 95% of valid signup attempts succeed on first try (excluding duplicate-email cases)
- **SC-003**: Welcome emails reach the user’s inbox within 5 minutes for 99% of successful signups
- **SC-004**: Page loads and becomes interactive within 3 seconds on typical mobile connections (3G-equivalent)
- **SC-005**: Landing page meets accessibility standards (WCAG 2.1 AA) for text contrast, focus management, and keyboard navigation
- **SC-006**: Bot/automated signup attempts are blocked without impacting legitimate human submissions
- **SC-007**: At least 10% of waitlist signups use the share link within 7 days of joining (viral loop engagement)
- **SC-008**: Landing page achieves Lighthouse Performance and Best Practices scores of 90+ each (verified in pre-release checks)

## Assumptions

- Target segments span HS levels, college/undergrad, masters, doctoral; copy speaks broadly to all. A single page with optional self-categorization keeps the flow simple
- "The Lift" positioning (Advisor + Coach personas) is already defined; the landing page communicates rather than redefines it
- The share-to-jump-spots jump amount is configurable (initially via configuration; admin UI deferred)
- The 2026 Scholarship Prep Guide (or equivalent unlock) exists or will be created as a deliverable asset
- Email deliverability depends on proper sending infrastructure; the system is responsible for triggering the email, not guaranteed delivery across all providers
