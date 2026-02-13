# Feature Specification: @repo/db Core Infrastructure

**Feature Branch**: `002-db-core-infrastructure`  
**Created**: 2025-02-13  
**Updated**: 2025-02-13 (Financial Aid Layer)  
**Status**: Draft  
**Input**: User description: "Create a shared, strongly-typed database package named @repo/db within the Turborepo packages/ directory. This package serves as the single source of truth for the TuitionLift data layer, ensuring that the Next.js frontend (The Body) and the LangGraph agent (The Brain) always operate on identical data structures and validation rules. Includes centralized schema management, type safety, validation layer, shared client factory, referral tracking, and RLS policies."

## Clarifications

### Session 2025-02-13

- Q: How should the system handle concurrent writes to the same record? → A: Optimistic locking (record has version/timestamp; concurrent write fails if version changed; caller retries)
- Q: What should happen when a user joins the waitlist with an invalid or unknown referral code? → A: Allow without attribution—user joins successfully; referred_by is left empty; no error shown
- Q: When the shared schema package is updated but some consuming apps are not yet redeployed, how should the system behave? → A: Backward-compatible only—migrations must be additive (new columns nullable, new tables); never remove or rename in one step
- Q: Can a user have more than one application for the same scholarship? → A: One per (user, scholarship, academic_year); drafts allowed before submission; same scholarship may be applied to again in a future academic year when available
- Q: Should this package define observability requirements or leave observability to consuming applications? → A: Delegate to consumers—package does not log or emit metrics; consuming applications handle observability
- Q: Does FR-003 (validation schemas for every table) apply to Checkpoints? → A: Exclude Checkpoints—package defines Zod schemas for Waitlist, Profiles, Scholarships, Applications only; Checkpoints are opaque, managed by LangGraph
- Q: Who should implement optimistic locking retry logic when a concurrent write fails? → A: Consumers implement retry—package provides updated_at and typed client; consuming apps implement .eq('updated_at', oldValue) and retry logic
- Q: What must the client expose when the database connection fails or times out? → A: Throw/reject with message only; stack traces and other error details remain server-side and must be logged safely (not exposed to client)
- Q: Should we add an explicit verification step for FR-008 (no SSN or full home addresses in schema)? → A: Code review checklist—PR review must confirm migrations do not add SSN or full-address columns; document in spec/plan
- Q: Where should developer quickstart documentation for @repo/db live? → A: Keep in specs—quickstart.md stays in specs/002-db-core-infrastructure/; package README links to it

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Single Source of Truth for Data (Priority: P1)

As a developer building the frontend or agent, I need a shared package that defines all database schemas in one place so that both the user-facing application and the AI agent always read and write data using identical structures and never drift out of sync.

**Why this priority**: Without a single source of truth, the frontend and agent could disagree on field names, types, or constraints—leading to runtime errors and data corruption. This is the foundational requirement.

**Independent Test**: Can be fully tested by defining a schema change in the package and verifying both consuming applications receive the same structure; value is guaranteed consistency.

**Acceptance Scenarios**:

1. **Given** a schema definition exists, **When** the frontend and agent each import the data layer package, **Then** both receive identical type definitions and constraints for every table.
2. **Given** a schema change is made in the shared package, **When** the package is published or linked, **Then** all consuming applications must resolve to the updated definition without manual sync.

---

### User Story 2 - Validation Before Writes (Priority: P1)

As a developer, I need all data validated against defined schemas before it enters the database so that invalid, malformed, or malicious payloads never reach persistent storage.

**Why this priority**: Validation prevents bad data from corrupting the database and protects against injection and schema violations. This is critical for data integrity.

**Independent Test**: Can be tested by attempting to insert invalid data (wrong type, missing required field, out-of-range value) and verifying the operation fails with a clear validation error before any database write.

**Acceptance Scenarios**:

1. **Given** a record fails validation (e.g., invalid email, missing required field), **When** a write is attempted, **Then** the operation is rejected before database access and returns a clear validation error.
2. **Given** a record passes validation, **When** a write is attempted, **Then** the operation proceeds to the database and persists successfully.

---

### User Story 3 - Shared Client for Server and Client Contexts (Priority: P2)

As a developer, I need a single database client that works correctly in both server-side contexts (e.g., API routes, server components) and client-side contexts (e.g., browser) without duplicating configuration or risking security misconfigurations.

**Why this priority**: Environment-specific initialization (credentials, URLs) must be handled automatically so developers do not accidentally expose sensitive configuration to the client.

**Independent Test**: Can be tested by importing the client in a server context and a client context, verifying both obtain a working connection with appropriate credentials for that context.

**Acceptance Scenarios**:

1. **Given** the database client is used in a server context, **When** a query is executed, **Then** the connection uses server-appropriate credentials and succeeds.
2. **Given** the database client is used in a client (browser) context, **When** a query is executed, **Then** the connection uses client-appropriate credentials without exposing server-only secrets.

---

### User Story 4 - Referral Tracking for Viral Growth (Priority: P2)

As a product manager, I need the waitlist to support referral codes and referred-by tracking so that users can share unique links and we can attribute signups to their referrers for viral growth campaigns.

**Why this priority**: Referral mechanics are a core growth lever; implementing them at the data layer ensures they are available to all consuming applications from day one.

**Independent Test**: Can be tested by joining the waitlist with a referral code, verifying the referred-by relationship is stored, and that referrer counts can be queried.

**Acceptance Scenarios**:

1. **Given** a user joins the waitlist with a referral code, **When** the record is stored, **Then** the system stores both the user's unique referral code and the referrer identifier.
2. **Given** a referrer exists on the waitlist, **When** their referral count is queried, **Then** the system returns the correct number of users who joined via their code.

---

### User Story 5 - Row-Level Security and Profile Privacy (Priority: P1)

As a student (end user), I need my profile data to be readable only by me so that my academic and personal information is never exposed to other users or unauthorized parties.

**Why this priority**: Profile data contains sensitive information (intended major, GPA, interests); privacy is non-negotiable for student trust and compliance.

**Independent Test**: Can be tested by attempting to read another user's profile without that user's authentication context and verifying the request is denied.

**Acceptance Scenarios**:

1. **Given** a user is authenticated, **When** they request their own profile, **Then** the system returns the profile data.
2. **Given** a user is authenticated, **When** they attempt to request another user's profile, **Then** the system denies access and returns no data.
3. **Given** any table in the data layer, **When** access is attempted, **Then** Row Level Security policies are enforced and only authorized access is allowed.

---

### User Story 6 - Financial Aid Context for Need-Based Matching (Priority: P2)

As a student, I need my profile to store my Student Aid Index (SAI), Pell-eligibility status, and household context so that the system can match me to need-based scholarships and provide accurate aid-related guidance.

**Why this priority**: Need-based scholarship discovery and the Trust Filter require financial aid context. SAI (replacing EFC) and Pell eligibility are the primary federal aid metrics; household size affects aid formulas and need-based criteria.

**Independent Test**: Can be tested by storing SAI, Pell status, and household size in a profile, then querying need-based scholarships filtered by eligibility criteria.

**Acceptance Scenarios**:

1. **Given** a user has completed FAFSA, **When** they save their SAI (in range -1500 to 999999), **Then** the system stores it and makes it available for need-based matching.
2. **Given** a user's Pell-eligibility status (eligible, ineligible, or unknown), **When** the profile is updated, **Then** the system stores the marker for scholarship filtering.
3. **Given** a user provides household size and number in college, **When** the profile is updated, **Then** the system stores this context for aid-related logic.

---

### Edge Cases

- What happens when the database connection fails or times out? **Resolved:** The client must surface a clear, user-facing error message rather than hanging indefinitely. Stack traces and internal error details must remain server-side and be logged safely; they must NOT be exposed to the client.
- How does the system handle concurrent writes to the same record? **Resolved:** Optimistic locking—records include a version or timestamp; a write fails if the version has changed since read; the caller must retry with fresh data.
- What happens when a referral code does not exist? **Resolved:** Allow signup without attribution—the user joins successfully, referred_by is left empty, and no error is shown to the user.
- How does the system handle schema migrations when consumers are not yet upgraded? **Resolved:** Migrations must be backward-compatible only—additive changes (new columns as nullable, new tables); never remove or rename in a single step so consumers can deploy independently.
- How does the system validate SAI? Values must be in range -1500 to 999999 (federal SAI range); out-of-range values are rejected with a validation error.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST maintain all database schema definitions in a single, centralized location that is the authoritative source for all consuming applications.
- **FR-002**: The system MUST generate strongly-typed definitions from the schema and export them for use in frontend and agent code so that type errors are caught at build time.
- **FR-003**: The system MUST define validation schemas for Waitlist, Profiles, Scholarships, and Applications and validate all data against these schemas before any database write. Checkpoints are excluded—they are opaque and managed by LangGraph.
- **FR-004**: The system MUST export a shared database client that automatically initializes with environment-appropriate configuration for server vs. client contexts.
- **FR-004a**: In client (browser) contexts, connection or query errors MUST expose only a safe, user-facing message; stack traces and internal error details MUST remain server-side and be logged safely, never exposed to the browser.
- **FR-005**: The waitlist entity MUST support `referral_code` (unique per user) and `referred_by` (link to referrer) to enable viral referral tracking.
- **FR-005a**: When a user joins the waitlist with an invalid or unknown referral code, the system MUST allow signup, leave referred_by empty, and NOT surface an error to the user.
- **FR-006**: All tables MUST enforce Row Level Security policies so that access is restricted to authorized users only.
- **FR-007**: Profile data MUST be readable only by the authenticated owner; no other user or system role may access another user's profile.
- **FR-008**: The system MUST NOT store sensitive PII such as Social Security numbers or full home addresses in this schema. Compliance is enforced via PR review checklist—migrations must not add such columns.
- **FR-009**: The system MUST support persistence of agent checkpoints (thread_id, checkpoint_id, checkpoint payload) for resumable agent sessions.
- **FR-010**: The scholarships entity MUST support fields for title, amount, deadline, URL, trust score, and category to support the Trust Filter and discovery workflows.
- **FR-011**: Records that support concurrent writes (e.g., Profiles, Applications) MUST use optimistic locking (version or timestamp); writes MUST fail when the record has changed since read, and callers MUST retry with fresh data. The package provides `updated_at` and typed client; consuming applications implement the `.eq('updated_at', oldValue)` check and retry logic.
- **FR-012**: Schema migrations MUST be backward-compatible only—additive changes (new columns nullable, new tables allowed); removal or renaming of columns/tables MUST be done in separate steps after all consumers are upgraded.
- **FR-013**: Applications MUST enforce uniqueness per (user, scholarship, academic_year). At most one application per combination; drafts are allowed before submission; a user may apply to the same scholarship again when it is offered in a future academic year.
- **FR-014**: The profiles entity MUST support a Financial Aid Layer: Student Aid Index (SAI) in range -1500 to 999999, Pell-eligibility markers (eligible, ineligible, unknown), household size, and number in college. All fields nullable; validation MUST reject out-of-range SAI.

### Key Entities

- **Waitlist**: Represents users who have signed up for early access. Key attributes: unique email, referral code (one per user), referred-by (optional link to another waitlist entry).
- **Profiles**: Represents extended user profile data linked to authentication. Key attributes: full name, intended major, GPA, state, interests; Financial Aid Layer: SAI (-1500 to 999999), Pell-eligibility status (eligible/ineligible/unknown), household size, number in college. Readable only by owner.
- **Scholarships**: Represents scholarship opportunities. Key attributes: title, amount, deadline, URL, trust score, category.
- **Applications**: Represents a user's application to a scholarship. Key attributes: user, scholarship, academic_year, status (includes draft), priority score. Uniqueness: at most one application per (user, scholarship, academic_year); drafts allowed before submission; same scholarship may be applied to again in a future academic year.
- **Checkpoints**: Represents persisted agent state for resumable sessions. Key attributes: thread identifier, checkpoint identifier, serialized checkpoint payload.

### Assumptions

- The monorepo layout includes a shared packages directory where this package will live; consuming applications (frontend and agent) are configured to depend on it.
- All five entities (Waitlist, Profiles, Scholarships, Applications, Checkpoints) are in scope for the initial release; additional entities will be added via subsequent specs.
- Referral codes are unique per user and sufficiently distinguishable to avoid collisions at expected waitlist scale.
- Checkpoint payloads are opaque; the package stores and retrieves them without interpreting their contents.
- Observability (logging, metrics, tracing) is delegated to consuming applications; the package does not log or emit metrics.
- Developer quickstart documentation lives in specs/002-db-core-infrastructure/quickstart.md; the package README MUST link to it.
- SAI (Student Aid Index) replaces EFC per federal aid rules; valid range is -1500 to 999999. Pell-eligibility status reflects FAFSA-derived or user-entered determination; thresholds vary by academic year and are computed by consuming applications.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Frontend and agent both consume the same shared package and experience zero schema or type drift during normal development cycles.
- **SC-002**: 100% of write operations validate data before persistence; invalid payloads are rejected with clear error messages.
- **SC-003**: Profile access attempts by non-owners result in zero data exposure (verified by security audit or automated tests).
- **SC-004**: Referral signups are correctly attributed; referrer counts can be computed accurately for any waitlist user.
- **SC-005**: Developers can add a new data field and have it usable in both frontend and agent within 15 minutes.
- **SC-006**: Need-based scholarship matching can filter by SAI range, Pell-eligibility status, and household context using profile data.
