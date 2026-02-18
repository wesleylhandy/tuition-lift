# Feature Specification: Unified Manual Scout & Vision Ingestion

**Feature Branch**: `007-scout-vision-ingestion`  
**Created**: 2025-02-18  
**Status**: Draft  
**Input**: User description: "Unified Manual Scout & Vision Ingestion — extend agents and dashboard with a seamless Scout interface where users can ingest scholarship data via URL, PDF, or Image (flyers/screenshots). The Advisor Brain acts as a Research Assistant to extract data, verify it against the web, and pre-fill the application tracker."

## Vision & Objective

Provide a seamless "Scout" interface where users can ingest scholarship data via URL, PDF, or Image (flyers/screenshots). The Professional Advisor acts as a Research Assistant to extract data, verify it against the web, and pre-fill the application tracker. The Encouraging Coach provides supportive feedback during the process.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Add Scholarship by Name or URL (Priority: P1)

A student enters a scholarship name or URL in the "Add Scholarship" modal. The system searches official sources, verifies cycle freshness, calculates a Trust Score, and presents the extracted or found data for confirmation before saving.

**Why this priority**: Core entry point—the majority of manual adds will be by URL or name. This unlocks the full Scout flow without requiring file uploads.

**Independent Test**: Can be fully tested by entering a known scholarship URL or name, observing the search-and-verify flow, and confirming the data appears for user confirmation before persistence.

**Acceptance Scenarios**:

1. **Given** the student has the "Add Scholarship" modal open, **When** they enter a valid scholarship URL, **Then** the system displays a processing overlay showing steps (e.g., "Searching official sources...", "Calculating Trust Score...").
2. **Given** the student enters a scholarship name, **When** the system finds matches, **Then** the best-matched data is presented for verification.
3. **Given** extracted or found data exists, **When** the processing completes, **Then** the data appears as editable or highlightable fields that the user must explicitly confirm before saving.
4. **Given** the student confirms the data, **When** they save, **Then** the scholarship is created and added to their tracked applications.
5. **Given** the student cancels or dismisses the modal before confirming, **When** they close, **Then** no scholarship or application record is created.

---

### User Story 2 - Add Scholarship by Uploading Document (Priority: P1)

A student drags and drops a PDF, PNG, or JPG file (flyer, screenshot, or scanned document) into the Scout drop zone. The system extracts scholarship data from the document, verifies it against the web when a URL is present, calculates a Trust Score, and presents the extracted data for confirmation.

**Why this priority**: Key differentiator—captures scholarships from physical flyers and screenshots that automated discovery cannot reach.

**Independent Test**: Can be tested by uploading a PDF or image containing scholarship details, verifying extraction of Name, Reward, Deadline, Eligibility, and URL, and confirming the verification and Trust Score steps complete before presentation.

**Acceptance Scenarios**:

1. **Given** the student has the "Add Scholarship" modal open, **When** they drag a PDF, PNG, or JPG into the drop zone, **Then** the system accepts the file and displays a processing overlay (e.g., "Reading Document...", "Searching official sources...", "Calculating Trust Score...").
2. **Given** the document contains extractable scholarship data, **When** extraction completes, **Then** the system presents Name, Reward, Deadline, Eligibility, and URL (when available) as editable or highlightable fields.
3. **Given** data is missing or ambiguous, **When** extraction completes, **Then** the system flags those fields as "Research Required" so the user is aware and can edit before saving.
4. **Given** the document contains a URL, **When** extraction completes, **Then** the system verifies that URL for cycle freshness (current or upcoming academic year) before presenting the Trust Score.
5. **Given** the student confirms and saves, **When** the save completes, **Then** the scholarship is created and the application is added to their tracker.

---

### User Story 3 - Real-Time Processing Feedback (Priority: P2)

A student sees clear, persona-aligned feedback during Scout processing. The Coach provides encouraging messages (e.g., "Nice scouting! I'm scanning that flyer now...") and the Advisor provides factual updates (e.g., "I've extracted a $2,000 award from the image. I also verified the deadline is March 15, 2026.").

**Why this priority**: Builds trust and reduces "is anything happening?" anxiety during extraction and verification, which can take several seconds.

**Independent Test**: Can be tested by triggering a Scout flow and verifying that a processing overlay appears with step-by-step feedback that matches the persona protocol (Coach for encouragement, Advisor for verification facts).

**Acceptance Scenarios**:

1. **Given** the student has submitted a URL, name, or file, **When** processing starts, **Then** a processing overlay (HUD) appears with real-time step indicators.
2. **Given** processing is underway, **When** the document is being read (for file uploads), **Then** the overlay shows a "Reading Document..." step.
3. **Given** processing is underway, **When** web verification occurs, **Then** the overlay shows a "Searching official sources..." step.
4. **Given** processing is underway, **When** Trust Score is calculated, **Then** the overlay shows a "Calculating Trust Score..." step.
5. **Given** persona integration, **When** appropriate moments arise, **Then** Coach messages encourage the user (e.g., "Nice scouting!") and Advisor messages state verification facts (e.g., "I've extracted...", "I verified the deadline...").

---

### User Story 4 - Verification Step and User Confirmation (Priority: P1)

All extracted or found scholarship data is presented to the user for verification before persistence. The user can review, edit if needed, and must explicitly confirm before the data is saved to scholarships and applications.

**Why this priority**: Ensures user agency and accuracy—raw extraction or search results may contain errors; user confirmation is a guardrail per Constitution data integrity.

**Independent Test**: Can be tested by completing a Scout flow and verifying that no scholarship or application record exists until the user clicks "Save" or "Confirm" on the verification screen.

**Acceptance Scenarios**:

1. **Given** extraction or search has completed, **When** the user views the result, **Then** all extracted fields (Name, Reward, Deadline, Eligibility, URL) appear as editable or highlightable "ghost text" or form fields.
2. **Given** the user views the verification screen, **When** they edit a field, **Then** the edited value is used for the save.
3. **Given** the user views the verification screen, **When** they click "Confirm" or "Save", **Then** the scholarship is created and the application is added to their tracker.
4. **Given** the user dismisses or cancels the verification step, **When** they close without confirming, **Then** no scholarship or application is created and any temporary data is discarded.

---

### User Story 5 - Deduplication and Cycle Freshness (Priority: P2)

The system checks for duplicates before saving and verifies cycle freshness. Scholarships with past due dates or that match existing entries are flagged or prevented appropriately.

**Why this priority**: Prevents clutter and outdated entries; aligns with Constitution Trust Filter and dynamic cycle checks.

**Independent Test**: Can be tested by attempting to add a scholarship that already exists (by fuzzy title match) or one with an expired due date, and verifying the system flags or prevents the duplicate or expired entry.

**Acceptance Scenarios**:

1. **Given** the user has confirmed Scout data, **When** the system detects a fuzzy match to an existing scholarship title in their scope, **Then** the user is notified (e.g., "This may already be in your list") and offered the choice to add anyway or cancel.
2. **Given** extracted or found data includes a due date in the past, **When** the system evaluates it, **Then** the scholarship is flagged as "Potentially Expired" (per Constitution dynamic cycle checks) and the user is informed before saving.
3. **Given** a URL was extracted and verified, **When** the verification finds the official source has a due date in the current or upcoming academic year, **Then** the scholarship is marked as active and eligible for the Trust Score.

---

### Edge Cases

- What happens when the user uploads an unsupported file type (e.g., DOCX, TXT)? The system rejects the file with a clear message (e.g., "Please upload PDF, PNG, or JPG only").
- What happens when extraction fails or returns no usable data? The system presents an error or "No data found" state with the option to retry or enter manually.
- What happens when the URL is invalid or unreachable? The system flags URL verification as failed and presents the extracted data with a "Verify with Caution" warning if Trust Score cannot be calculated.
- What happens when the document is a scanned image with poor quality? The system extracts what it can, flags unclear fields as "Research Required", and allows the user to edit before saving.
- What happens when the user uploads a very large file? The system enforces a reasonable file size limit and rejects with a clear message if exceeded.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a unified "Add Scholarship" modal with (a) an input field accepting scholarship name or URL, and (b) a drag-and-drop area accepting PDF, PNG, or JPG files.
- **FR-002**: System MUST extract scholarship data (Name, Reward, Deadline, Eligibility, URL) from uploaded documents when possible.
- **FR-003**: System MUST flag extracted fields as "Research Required" when data is missing or ambiguous.
- **FR-004**: System MUST verify extracted or provided URLs against the web for cycle freshness (current or upcoming academic year).
- **FR-005**: System MUST calculate a Trust Score (0–100) for all scholarships before presentation, per Constitution Reputation Engine.
- **FR-006**: System MUST display a real-time processing overlay (HUD) showing steps: Reading Document (for uploads), Searching official sources, Calculating Trust Score.
- **FR-007**: System MUST present all extracted or found data for user verification before persistence; no scholarship or application record MUST be created until the user explicitly confirms.
- **FR-008**: System MUST support editing of extracted fields during verification.
- **FR-009**: System MUST run a fuzzy-match check against existing scholarship titles before saving to prevent duplicate entries.
- **FR-010**: System MUST flag scholarships with past due dates as "Potentially Expired" per Constitution dynamic cycle checks.
- **FR-011**: System MUST use Coach persona for encouraging messages and Advisor persona for verification facts during Scout processing.
- **FR-012**: System MUST persist verified scholarship and application records only after user confirmation.
- **FR-013**: System MUST reject unsupported file types with a clear user-facing message.
- **FR-014**: System MUST enforce a reasonable file size limit for uploads.

### Key Entities

- **Scout Input**: User-provided scholarship name, URL, or uploaded file (PDF, PNG, JPG). Represents the raw entry point for manual ingestion.
- **Extracted Scholarship Data**: Temporary representation of Name, Reward, Deadline, Eligibility, URL, and optional Trust Score before user confirmation. Held in memory until confirmed.
- **Scholarship**: Persisted record of a scholarship opportunity, aligned with existing scholarships entity. Created only after user confirmation.
- **Application**: Persisted tracking record linking user to scholarship, aligned with existing applications entity. Created when user confirms Scout data.

## Assumptions

- Users have authenticated sessions when accessing the Scout interface.
- Existing `scholarships` and `applications` entities (per 002/006) are the persistence targets.
- Trust Score calculation follows Constitution Section 10 (Reputation Engine).
- File size limit is defined in planning; a reasonable default is 10 MB for typical flyers/screenshots.
- Fuzzy-match threshold for deduplication is defined in planning; default is conservative (high similarity required) to avoid false positives.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can add a scholarship by URL or name and see verification results within 30 seconds under normal conditions.
- **SC-002**: Users can add a scholarship by uploading a PDF or image and see extracted data for verification within 60 seconds for typical documents (≤5 pages or single image).
- **SC-003**: 95% of supported document uploads (PDF, PNG, JPG within size limit) complete extraction without system error.
- **SC-004**: Zero scholarship or application records are created without explicit user confirmation.
- **SC-005**: Duplicate scholarship entries (fuzzy title match) are flagged before save in 100% of cases.
- **SC-006**: Scholarships with past due dates are flagged as "Potentially Expired" in 100% of cases before or at save.
