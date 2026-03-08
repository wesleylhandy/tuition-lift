# Feature Specification: Unified MVP — Deep-Scout, Data Integrity, and Account Alignment

**Feature Branch**: `015-unified-mvp`  
**Created**: 2025-03-08  
**Status**: Draft  
**Input**: User description: "Unified MVP: Deep-Scout Intelligence, UI-Agent Integration, and Data-Circuit Fixes. User Account modal for updating onboarding categories, adding institutions. Manual discovery trigger without /discovery endpoint or clear navigation to it."

## Clarifications

### Session 2025-03-08

- Q: What is the source of the unique scholarship identifier (external ID, content hash, UUID, URL)? → A: Content-derived hash as base; dedicated agent or tool for identity resolution when year-over-year variations complicate whether two records represent the same scholarship.
- Q: When Coach's Take generation fails (timeout, API error), what should be shown on the card? → A: Generic placeholder (e.g., "Review this opportunity—details in your Match Inbox").
- Q: After a discovery run completes, can the user immediately re-trigger, or is there rate limiting/cooldown? → A: Configurable via DB (cooldown/cap). Discovery should accept search terms or new input to justify re-runs; scholarships do not change frequently—redundant runs without new information risk system overload.
- Q: At what thresholds should Debt Lifted use K/M abbreviation (e.g., $12.5K)? → A: Configurable. Some contexts may show full amount, others abbreviated. Default: K at 1,000, M at 1M (e.g., 12.55K, 1.275M).
- Q: When the user closes the account modal with unsaved changes, what should happen? → A: Confirm on close—show confirmation ("Discard changes?" Cancel/Confirm) before closing.
- Q: Is the merit-first SAI threshold (e.g., 15,000) the actual default or just an example? → A: Default 10,000; configurable via DB on a year-by-year basis.
- Q: What fields constitute "required" for profile completeness (for protected route redirect)? → A: Award year, major, state, and GPA. SAI is optional—only available after FAFSA; missing SAI must NOT block access.
- Q: When discovery is triggered while a run is in progress, what should happen? → A: Block: disable trigger and show "Discovery in progress" until current run completes.
- Q: What are the concrete deep-scout resource limits (depth, links/page, per run)? → A: Configurable; defaults to Balanced (max depth 2, 50 links/page, 500/run).
- Q: What is the max college list size (institutions)? → A: Configurable; default max 10 (may allow more in future). No pagination needed at default.
- Q: When discovery returns 0 scholarships, what should the Match Inbox show? → A: Dedicated empty-state message (e.g., "No matches yet") plus CTA to adjust profile or trigger discovery with different input.
- Q: When a discovery run fails (API error, timeout, LLM unavailable), what should the user see and be able to do? → A: Inline error message on dashboard + visible retry control (user can retry immediately).
- Q: When deep-scout extraction hits external failures on some pages (403, timeout, CAPTCHA, rate-limit), what should happen? → A: Continue silently with partial results; no notice to the user.
- Q: When merit-first mode is active but discovery finds no merit/need-blind scholarships (only need-based), what should the user see? → A: Fallback to full mixed ranking (merit + need) without any notice.
- Q: Should discovery runs emit observable signals for monitoring and debugging? → A: Yes—emit structured logs and/or metrics (duration, success/fail, record count); no dashboard required for MVP.

## Summary

Unify TuitionLift's MVP by fixing critical data integrity issues in the discovery-to-dashboard pipeline, expanding the Advisor's ability to extract scholarships from aggregation sites and institutional lists, aligning user profile and college list data with Coach prioritization, and exposing account management and discovery controls directly from the dashboard.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reliable Track and Dismiss with Correct Scholarship Identity (Priority: P1)

A student views discovery results in the Match Inbox and uses Track or Dismiss. The system correctly associates each action with the intended scholarship record. Track creates or updates the correct application; Dismiss hides the correct scholarship from the feed. No orphaned or mis-targeted records occur.

**Why this priority**: Without correct scholarship identity propagation, Track and Dismiss fail silently or target wrong records, breaking user trust and data integrity.

**Independent Test**: Can be fully tested by running discovery, verifying each result has a stable identifier, performing Track and Dismiss, and confirming the correct database records are created/updated without orphaned applications or mismatched dismissals.

**Acceptance Scenarios**:

1. **Given** discovery returns verified scholarships, **When** each result is surfaced to the UI, **Then** each result includes a unique scholarship identifier that persists through the pipeline to the API and UI.
2. **Given** a student clicks Track on a scholarship card, **When** the action completes, **Then** an application record is created or updated correctly linked to that scholarship.
3. **Given** a student clicks Dismiss on a scholarship card, **When** the action completes, **Then** the scholarship is removed from the feed for the current run and the correct record is recorded for future filtering.
4. **Given** the discovery API returns results, **When** the UI consumes them, **Then** scholarship identifier mapping is consistent end-to-end so Track and Dismiss target the intended records.

---

### User Story 2 - Coach's Take on Every Match Card (Priority: P1)

A student views a scholarship card in the Match Inbox. Each card displays a one-sentence "Coach's Take"—a personalized ROI micro-summary that synthesizes trust, financial fit, and merit relevance (e.g., "High-value merit match: Your 3.8 GPA makes you a top-tier candidate here."). The Coach persona generates this summary rather than falling back to a generic Trust Report.

**Why this priority**: Coach's Take differentiates TuitionLift by providing actionable, personable guidance; Trust Report alone is Advisor-focused and less motivating.

**Independent Test**: Can be fully tested by viewing match cards after discovery and verifying each displays a distinct Coach's Take sentence that reflects the student's profile (GPA, SAI, merit) and the scholarship's characteristics.

**Acceptance Scenarios**:

1. **Given** a scholarship appears in the Match Inbox, **When** the student views the card, **Then** a Coach's Take micro-summary is displayed.
2. **Given** the Coach persona synthesizes trust report, need-match score, and merit tag, **When** generating the Coach's Take, **Then** the output is a single sentence focused on ROI and relevance to the student.
3. **Given** multiple scholarships with different trust and merit profiles, **When** displayed, **Then** each Coach's Take is distinct and tailored to that scholarship and the student's profile.

---

### User Story 3 - Match Inbox Displays Full Agent Data (Priority: P1)

A student views the Match Inbox. Scholarship cards show all relevant agent-provided data: categories, verification status (e.g., "Verified 2026" or "Potentially Expired"), and other metadata. No consumer bug discards or overwrites these fields with empty arrays or nulls.

**Why this priority**: Missing categories and verification status misrepresents scholarship quality and cycle relevance; users cannot make informed decisions.

**Independent Test**: Can be fully tested by running discovery that returns results with categories and verification status, and verifying the Match Inbox displays them correctly without substitution by empty or hardcoded values.

**Acceptance Scenarios**:

1. **Given** discovery results include categories for each scholarship, **When** displayed in the Match Inbox, **Then** categories are shown on the card.
2. **Given** discovery results include verification status (e.g., Verified 2026, Potentially Expired), **When** displayed in the Match Inbox, **Then** verification status is visible on the card.
3. **Given** the pipeline from discovery to Match Inbox, **When** data flows through, **Then** categories and verification_status are passed through without being discarded or replaced with empty arrays or nulls.
4. **Given** discovery completes with 0 scholarships, **When** the student views the Match Inbox, **Then** a dedicated empty-state message is shown with a CTA to adjust profile or trigger discovery with different input.

---

### User Story 4 - Deep-Scout: Extract Scholarships from Aggregation and Institutional Lists (Priority: P1)

A student triggers discovery. The Advisor encounters scholarship aggregation sites (e.g., Bold.org, scholarships.com) or institutional scholarship lists (e.g., St. John's, Virginia Tech). The system follows child links to extract individual scholarship records instead of treating the parent page as a single result.

**Why this priority**: Aggregation and institutional sites hold the majority of actionable scholarships; shallow parsing leaves value on the table.

**Independent Test**: Can be fully tested by running discovery against known aggregation or institutional list URLs and verifying individual scholarship records are extracted and verified rather than a single parent record.

**Acceptance Scenarios**:

1. **Given** the Advisor encounters a known aggregation or institutional scholarship list page, **When** parsing, **Then** the system crawls child links to extract individual scholarship records.
2. **Given** extracted child records, **When** verified for the user's award year, **Then** each record passes through cycle verification (due dates, eligibility).
3. **Given** the user is in-state for an opportunity, **When** ranking results, **Then** in-state opportunities receive higher priority (e.g., 1.2× weight).
4. **Given** recursive extraction may produce many records, **When** processing, **Then** the system limits resource consumption to avoid overflow (e.g., sub-graphs, bounded depth).
5. **Given** deep-scout encounters external failures (403, timeout, CAPTCHA, rate-limit) on some pages, **When** processing, **Then** the system continues with partial results silently; no user-facing notice.

---

### User Story 5 - Verification Badges on Match Cards (Priority: P2)

A student views scholarship cards. Each card displays a verification badge indicating cycle status—e.g., "Verified 2026" for current-cycle opportunities or "Potentially Expired" when due dates are in the past or ambiguous.

**Why this priority**: Surface cycle-awareness directly on cards so students can quickly assess relevance without digging into details.

**Independent Test**: Can be fully tested by displaying cards with varied verification statuses and confirming the correct badge is shown for each.

**Acceptance Scenarios**:

1. **Given** a scholarship verified for the current award year, **When** displayed, **Then** a "Verified [Year]" badge is shown.
2. **Given** a scholarship with past or ambiguous due dates, **When** displayed, **Then** a "Potentially Expired" badge is shown.
3. **Given** verification badges, **When** rendered, **Then** they meet accessibility standards (visible, readable, sufficient contrast).

---

### User Story 6 - College List and Commitment Logic (Priority: P1)

A student maintains a list of colleges with status (Applied, Accepted, Committed). When a student marks a school as Committed, the Coach elevates institutional scholarships for that school to Critical severity in the Game Plan.

**Why this priority**: Committed students have immediate need for school-specific aid; prioritization must reflect that.

**Independent Test**: Can be fully tested by adding institutions with various statuses, marking one as Committed, and verifying institutional scholarships for that school appear as Critical in the Coach's Game Plan.

**Acceptance Scenarios**:

1. **Given** a student has a college list, **When** they add an institution, **Then** they can set status to Applied, Accepted, or Committed.
2. **Given** a student marks an institution as Committed, **When** the Coach generates the Game Plan, **Then** institutional scholarships for that school are elevated to Critical severity.
3. **Given** multiple institutions with different statuses, **When** the Coach ranks tasks, **Then** Committed-school institutional awards appear highest when applicable.

---

### User Story 7 - Debt Lifted Header Reflects Won Applications (Priority: P2)

A student views the global header on the dashboard. The "Debt Lifted" counter shows the sum of award amounts for applications the student has marked as Won.

**Why this priority**: Quick visibility of progress; currently may be misaligned or hardcoded.

**Independent Test**: Can be fully tested by creating Won applications with known amounts and verifying the header displays the correct sum.

**Acceptance Scenarios**:

1. **Given** a student has applications with status Won and known award amounts, **When** they view the header, **Then** Debt Lifted equals the sum of amounts for those applications.
2. **Given** no Won applications, **When** the student views the header, **Then** Debt Lifted shows zero or an appropriate empty state.
3. **Given** a student updates an application to Won with an amount, **When** the header refreshes, **Then** Debt Lifted updates to include the new amount.

---

### User Story 8 - Merit-First Mode for High-SAI Students (Priority: P2)

A student with estimated SAI above the configured threshold (default 10,000; configurable via DB per award year) receives search results focused on need-blind and institutional merit tiers. Need-based scholarships are deprioritized or filtered per user preference. Upon Tracking, need_match_score and merit_tag are persisted for long-term Coach prioritization.

**Why this priority**: Squeezed Middle students (high SAI, limited liquidity) need merit-focused discovery; persisting tags enables ongoing Coach logic.

**Independent Test**: Can be fully tested by completing onboarding with SAI above threshold, triggering discovery, and verifying merit/need-blind results dominate and Track persists the relevant tags.

**Acceptance Scenarios**:

1. **Given** a user's estimated SAI exceeds the merit-lean threshold (default 10,000), **When** discovery runs, **Then** search logic prioritizes need-blind and institutional merit scholarships.
2. **Given** a student Tracks a scholarship, **When** the action completes, **Then** need_match_score and merit_tag (when available) are saved with the application for long-term sorting and Coach prioritization.
3. **Given** merit-first mode is active, **When** the Coach generates the Game Plan, **Then** merit-tagged and need-blind applications are prioritized appropriately.
4. **Given** merit-first mode is active but discovery finds no merit or need-blind scholarships, **When** results are ranked, **Then** the system falls back to full mixed ranking (merit + need) without notice.

---

### User Story 9 - User Account Modal for Profile and College List (Priority: P1)

A student accesses their account settings from the dashboard. A modal (or equivalent surface) allows them to update onboarding categories (major, state, GPA, SAI, etc.), add or edit institutions in their college list, and manage related profile data. Changes persist and affect subsequent discovery and Coach behavior.

**Why this priority**: Users must correct or update profile data; onboarding is one-time; ongoing edits require an accessible control surface.

**Independent Test**: Can be fully tested by opening the account modal, editing categories and institutions, saving, and verifying discovery and Coach output reflect the changes.

**Acceptance Scenarios**:

1. **Given** a student is on the dashboard, **When** they open the account modal, **Then** they can view and edit onboarding categories (major, state, GPA, SAI, Pell, etc.).
2. **Given** the account modal is open, **When** they add or edit institutions, **Then** they can set name and status (Applied, Accepted, Committed) and persist changes.
3. **Given** the student saves profile or institution changes, **When** changes persist, **Then** subsequent discovery and Coach prioritization use the updated data.
4. **Given** the account modal, **When** rendered, **Then** it meets accessibility standards. **Given** unsaved changes exist, **When** the user attempts to close, **Then** a confirmation ("Discard changes?" Cancel/Confirm) is shown before closing.

---

### User Story 10 - Manual Discovery Trigger and Clear Navigation (Priority: P1)

A student wants to run discovery again without navigating to a dedicated discovery page. The dashboard provides a clear control (e.g., button, link) to manually trigger discovery. Alternatively, a clearly labeled path to the discovery flow (e.g., link to /discovery) is always visible.

**Why this priority**: Discovery is core value; users must be able to re-run it easily from the dashboard.

**Independent Test**: Can be fully tested by locating the trigger control or navigation path from the dashboard and successfully initiating discovery without needing to type a URL.

**Acceptance Scenarios**:

1. **Given** a student is on the dashboard, **When** they look for discovery controls, **Then** a manual "Run Discovery" (or equivalent) trigger is visible and actionable.
2. **Given** the student triggers discovery from the dashboard, **When** the action runs, **Then** discovery executes without requiring navigation to a dedicated discovery route.
3. **Given** a dedicated discovery route exists, **When** the student cannot find the inline trigger, **Then** a clear, visible path (e.g., link) to that route is available from the dashboard.
4. **Given** discovery is triggered, **When** it runs, **Then** the user receives appropriate feedback (e.g., loading state, success/error notification).
5. **Given** a discovery run fails (API error, timeout, LLM unavailable), **When** the failure is detected, **Then** an inline error message is shown on the dashboard with a visible retry control; the user may retry immediately.

---

### User Story 11 - Protected Routes and Incomplete Profile Redirect (Priority: P1)

A user attempts to access the dashboard or scout-related routes. If unauthenticated, they are redirected to sign-in. If authenticated but profile is incomplete (missing required fields: major, state, GPA—SAI is optional and does not block access), they are redirected to onboarding until complete.

**Why this priority**: Security and data quality; incomplete profiles produce poor discovery results.

**Independent Test**: Can be fully tested by accessing protected routes as unauthenticated, authenticated with incomplete profile, and complete profile, and verifying the correct redirects occur.

**Acceptance Scenarios**:

1. **Given** a user is not authenticated, **When** they attempt to access the dashboard or scout routes, **Then** they are redirected to sign-in.
2. **Given** a user is authenticated but profile is incomplete (required fields missing), **When** they attempt to access the dashboard or scout routes, **Then** they are redirected to onboarding.
3. **Given** a user completes onboarding, **When** they access protected routes, **Then** they reach the intended destination.

---

### Edge Cases

- What happens when deep-scout extraction encounters a loop or circular links? The system must cap depth or detect cycles to avoid infinite recursion.
- What happens when the Coach's Take generation fails (e.g., timeout, API error)? The system must show a generic placeholder (e.g., "Review this opportunity—details in your Match Inbox") without breaking the card display.
- What happens when a user adds many institutions? Max count is configurable (default 10); at default, no pagination needed. Higher limits may require pagination in future.
- What happens when Debt Lifted sum would be very large? Formatting (full amount vs abbreviated) is configurable by context. Default abbreviation thresholds: K at 1,000, M at 1M (e.g., 12.55K, 1.275M).
- What happens when discovery is triggered while a previous run is still in progress? The system MUST block: disable the trigger and show "Discovery in progress" until the current run completes.
- What happens when a user wants to re-run discovery frequently? Discovery rate limits (cooldown, per-day cap) are configurable via DB to prevent system overload. Discovery should accept search terms or new input to justify re-runs; redundant runs without new information are discouraged.
- What happens when discovery returns 0 scholarships? The Match Inbox shows a dedicated empty-state message (e.g., "No matches yet") plus a CTA to adjust profile or trigger discovery with different input.
- What happens when a discovery run fails (API error, timeout, LLM unavailable)? The system shows an inline error message on the dashboard with a visible retry control; the user may retry immediately.
- What happens when deep-scout extraction hits external failures (403, timeout, CAPTCHA, rate-limit) on some pages? The system continues silently with partial results; no notice to the user.
- What happens when merit-first mode is active but discovery finds no merit/need-blind scholarships? The system falls back to full mixed ranking (merit + need) without any notice.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST attach a unique scholarship identifier to every discovery result and propagate it through the pipeline so Track and Dismiss target the correct records. The identifier is derived from a content hash (e.g., URL + canonical fields). A dedicated agent or tool SHOULD resolve identity when year-over-year variations make it ambiguous whether two records represent the same scholarship (deferred to post-MVP).
- **FR-002**: The system MUST generate a Coach's Take (one-sentence ROI micro-summary) for each discovery result using the Coach persona, synthesizing trust report, need-match score, and merit tag.
- **FR-003**: The Match Inbox consumer MUST pass through categories and verification_status from discovery results without discarding or replacing them with empty arrays or nulls.
- **FR-003a**: When discovery returns 0 scholarships, the Match Inbox MUST display a dedicated empty-state message with a CTA to adjust profile or trigger discovery with different input.
- **FR-004**: The Advisor MUST extract individual scholarship records from aggregation pages and institutional scholarship lists by following child links, subject to bounded depth or resource limits.
- **FR-005**: The system MUST verify each extracted scholarship for the user's award year and apply cycle-aware logic (e.g., flag past due dates as "Potentially Expired").
- **FR-006**: In-state opportunities MUST receive higher priority (e.g., 1.2× weight) when ranking discovery results.
- **FR-007**: Match cards MUST display verification badges (e.g., "Verified [Year]", "Potentially Expired") reflecting cycle status.
- **FR-008**: The system MUST support a college list with institutions having name and status (Applied, Accepted, Committed). Max institutions per list is configurable; default 10 (no pagination needed at default; may be increased in future).
- **FR-009**: When a user marks an institution as Committed, the Coach MUST elevate institutional scholarships for that school to Critical severity in the Game Plan.
- **FR-010**: The Debt Lifted counter in the global header MUST equal the sum of award amounts for applications with status Won. Display formatting (full amount vs K/M abbreviation) is configurable by context; default thresholds: K at 1,000, M at 1M.
- **FR-011**: When a user's estimated SAI exceeds the merit-lean threshold (default 10,000; configurable via DB per award year), discovery MUST prioritize need-blind and institutional merit scholarships. When no merit or need-blind results exist, discovery MUST fall back to full mixed ranking (merit + need) without notice.
- **FR-012**: Upon Track, the system MUST persist need_match_score and merit_tag with the application for long-term Coach prioritization.
- **FR-013**: The system MUST provide a User Account modal (or equivalent) for editing onboarding categories and managing institutions (add, edit, status). When unsaved changes exist and the user attempts to close, the system MUST show a confirmation ("Discard changes?" Cancel/Confirm) before closing.
- **FR-014**: The dashboard MUST provide a manual discovery trigger and/or a clear, visible path to the discovery flow.
- **FR-014a**: When a discovery run fails (API error, timeout, LLM unavailable), the system MUST display an inline error message on the dashboard with a visible retry control; the user may retry immediately.
- **FR-018**: When discovery is already in progress, the system MUST disable the trigger and show "Discovery in progress" until the current run completes; no parallel or queued runs.
- **FR-019**: Discovery rate limits (cooldown, per-day cap) MUST be configurable via DB to prevent system overload from redundant runs. Discovery may accept search terms or new input to justify re-runs; MVP scope for search/input params is implementation-defined.
- **FR-015**: Protected routes (dashboard, scout) MUST require authentication and redirect unauthenticated users to sign-in.
- **FR-016**: Protected routes MUST redirect authenticated users with incomplete profiles to onboarding until required fields are complete. Required fields for completeness are award_year, major, state, and GPA. SAI is optional (available post-FAFSA); missing SAI must NOT trigger redirect.
- **FR-017**: Deep-scout extraction MUST use bounded depth or resource limits to avoid overflow or infinite loops. Limits are configurable; defaults: max depth 2, 50 child links per page, 500 extracted records per run.
- **FR-017a**: When deep-scout encounters external failures (403, timeout, CAPTCHA, rate-limit) on some pages, the system MUST continue with partial results silently; no user-facing notice.
- **FR-017b**: Discovery runs MUST emit structured logs and/or metrics (duration, success/fail, record count) for monitoring and debugging; no dashboard required for MVP.

### Key Entities

- **Scholarship**: Represents a single scholarship opportunity; has unique identifier (content-derived hash, with agent/tool for identity resolution when year-over-year variations apply), categories, verification status, trust score, need_match_score, merit_tag.
- **Application**: Tracks a student's relationship to a scholarship (Tracked, Drafting, etc.); linked to scholarship identifier; stores need_match_score and merit_tag when Tracking.
- **Institution**: A college or school on the student's list; has name, status (Applied, Accepted, Committed).
- **Discovery Result**: A verified scholarship with identifier, categories, verification_status, trust_report, coach_take, need_match_score, merit_tag.
- **Profile**: User's onboarding and academic data (major, state, GPA, SAI, Pell, etc.) used for discovery and Coach prioritization.

## Assumptions

- Merit-lean SAI threshold default is 10,000; configurable via DB on a year-by-year basis.
- "Won" status for applications aligns with existing Coach/Application Tracker lifecycle (e.g., outcome confirmed).
- Aggregation and institutional list patterns (Bold.org, scholarships.com, .edu pages) are identifiable; new patterns may require extension.
- The account modal may be implemented as a modal, drawer, or dedicated settings page; choice is implementation-defined.
- Discovery trigger may be inline (button) or via navigation; at least one clear path must exist.
- Scholarship identity resolution: content hash is the base; a dedicated agent or tool handles cases where year-over-year changes make identity ambiguous.
- Profile completeness for protected route redirect: award_year, major, state, GPA required. SAI optional (post-FAFSA); discovery runs without SAI; when present, SAI enhances merit/need matching.
- Deep-scout limits are configurable; default is Balanced: max depth 2, 50 links/page, 500 per run.
- College list max size is configurable; default 10 institutions (may allow more in future).
- Discovery rate limits (cooldown, per-day cap) are configurable via DB. Scholarships do not change frequently; redundant runs without new information risk system overload. Discovery may accept search terms or new input to justify re-runs; MVP scope for such params is implementation-defined.
- Discovery runs emit structured logs and/or metrics (duration, success/fail, record count) for monitoring and debugging; no dashboard required for MVP.
- Debt Lifted formatting (full vs abbreviated) is configurable by context. Default: K at 1,000, M at 1M (e.g., 12.55K, 1.275M).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Track and Dismiss actions correctly target the intended scholarship in 100% of test cases; no orphaned or mis-linked application records.
- **SC-002**: Every Match Inbox card displays a Coach's Take; no fallback to Trust Report alone when Coach synthesis is available.
- **SC-003**: Categories and verification_status appear on Match cards for all discovery results that include them; no empty or null substitution.
- **SC-004**: Deep-scout extraction successfully extracts at least 3× more individual scholarships from known aggregation/institutional pages than shallow parsing, without resource overflow.
- **SC-005**: Users can complete profile and institution updates via the account modal in under 2 minutes.
- **SC-006**: Users can trigger discovery from the dashboard in under 10 seconds (locate control and initiate).
- **SC-007**: Protected routes redirect unauthenticated and incomplete-profile users correctly in 100% of access attempts.
- **SC-008**: Debt Lifted header reflects the correct sum of Won application amounts within one refresh cycle.
