# Feature Specification: Advisor Discovery Engine

**Feature Branch**: `004-advisor-discovery-engine`  
**Created**: 2025-02-13  
**Status**: Draft  
**Input**: User description: "Create the Advisor Discovery Engine: A LangGraph-powered search and verification system for TuitionLift."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Privacy-Safe Scholarship Search (Priority: P1)

A student who has completed onboarding triggers discovery. The system transforms their profile (GPA, major, SAI) into 3–5 distinct search queries using anonymized attributes. The student's name and SSN are explicitly scrubbed before any search is sent externally. Deep web search returns scholarship candidates; every result is verified for current-cycle eligibility (2026/2027); ambiguous deadlines are flagged for manual review.

**Why this priority**: Privacy and cycle accuracy are non-negotiable. Students trust the system only if no PII leaves and deadlines are current.

**Independent Test**: Can be fully tested by running discovery with a complete profile (including name and SSN) and verifying (a) no name or SSN appears in outbound search logs, (b) 3–5 distinct queries are generated from profile attributes, and (c) all results are either verified for 2026/2027 or flagged as ambiguous.

**Acceptance Scenarios**:

1. **Given** a student profile with GPA, major, SAI, name, and SSN, **When** discovery runs, **Then** only anonymized attributes (GPA, major, SAI brackets) are used to generate search queries; name and SSN never leave the system.
2. **Given** the profile, **When** queries are generated, **Then** 3–5 distinct search queries are produced from the profile attributes.
3. **Given** raw search results, **When** verification runs, **Then** every result has either a verified 2026/2027 deadline or is flagged for manual review when dates are ambiguous.
4. **Given** a search result with an unclear or missing deadline, **When** verification cannot confirm cycle eligibility, **Then** the result is flagged (not discarded) and routed for manual review.

---

### User Story 2 - Trust-Scored Results with Transparent Rationale (Priority: P1)

Every scholarship returned by discovery receives a trust score (0–100) from a multi-factor reputation engine. Factors include domain type (.edu/.gov vs .com), site longevity, and automatic disqualification for fee-based scams. Each scholarship is accompanied by a Trust Report that explains how the score was computed.

**Why this priority**: Students must understand why a result is trusted or not; the Professional Advisor persona requires analytical, cautious output.

**Independent Test**: Can be tested by running discovery and verifying that every result has a trust_score and a Trust Report; fee-required scholarships score 0 and are excluded from active listings.

**Acceptance Scenarios**:

1. **Given** any scholarship in the discovery output, **When** the user views it, **Then** a Trust Report explains the trust score (e.g., domain type, longevity, fee check).
2. **Given** a scholarship requiring an upfront fee (application, processing, or guarantee fee), **When** scored, **Then** it receives trust_score 0 and is excluded from active listings (Constitution §10).
3. **Given** .edu or .gov sources, **When** scored, **Then** they receive higher trust weights than .com or .org.
4. **Given** new or low-data opportunities, **When** scored below 60, **Then** they are flagged with a "Verify with Caution" warning while remaining visible.

---

### User Story 3 - SAI-Aware Prioritization and Gap Alignment (Priority: P2)

The system prioritizes "Last-Dollar" grants and scholarships where the student's SAI falls within the eligibility window. Results are ranked by how well the student's financial profile aligns with each scholarship's need-based criteria.

**Why this priority**: Maximizes relevance for need-based students; reduces noise from scholarships they cannot qualify for.

**Independent Test**: Can be tested by running discovery for a student with known SAI and verifying that Last-Dollar and SAI-eligible scholarships appear higher in the prioritized list.

**Acceptance Scenarios**:

1. **Given** a student with SAI within a scholarship's eligibility range, **When** results are ranked, **Then** Last-Dollar and need-based scholarships with matching SAI criteria are prioritized over others.
2. **Given** a student's SAI outside a scholarship's range, **When** results are ranked, **Then** such scholarships are deprioritized or excluded when the gap is too large.
3. **Given** discovery output, **When** presented to the user, **Then** scholarships are ordered by alignment to financial need (SAI and gap) alongside trust score.

---

### User Story 4 - Durable State and Resumable Discovery (Priority: P2)

Discovery runs in phases: Scout (search) and Verify. State is checkpointed after the Scout phase so that if verification fails or times out, the system can retry verification without re-running expensive searches. Search batches are rate-limited to avoid external API throttling.

**Why this priority**: Reduces cost and improves reliability; long-running discovery must survive interruptions.

**Independent Test**: Can be tested by simulating a verification failure after Scout completes, then resuming—Scout must not re-run; only verification retries.

**Acceptance Scenarios**:

1. **Given** Scout phase completes successfully, **When** state is persisted, **Then** a checkpoint exists so that verification can be retried without re-executing search.
2. **Given** verification fails after Scout, **When** the workflow resumes, **Then** search is not re-run; verification is retried using checkpointed search results.
3. **Given** multiple search batches, **When** executing, **Then** batches are rate-limited to prevent external API throttling.
4. **Given** discovery runs, **When** state is updated, **Then** all updates align with the shared orchestration state (TuitionLiftState) defined in the Orchestration spec.

---

### Edge Cases

- What happens when the student profile is incomplete (e.g., missing GPA or SAI)? System must not run discovery until required attributes are present; the orchestration layer should route to onboarding or prompt for missing data.
- How does the system handle zero search results? Discovery returns empty results; no error state; Coach receives empty discovery_results and may suggest broadening criteria.
- What happens when external search fails or times out? Error is logged; state is updated; Safe Recovery (per Orchestration spec) notifies user; checkpoint before verification allows retry of verification only if Scout had partially completed.
- How does the system handle scholarships with past due dates? They are not shown as "Active"; they may be flagged as "Potentially Expired" for user awareness (Constitution §8).
- What happens when all generated queries return no results? Same as zero results—empty discovery_results; no error for empty results.

## Requirements *(mandatory)*

### Functional Requirements

**Anonymized Search & Privacy**
- **FR-001**: System MUST transform the student's profile (GPA, major, SAI) into 3–5 distinct search queries using anonymized attributes only.
- **FR-002**: System MUST explicitly scrub the student's name and SSN before any query is sent to external search; raw PII must never leave the system (Constitution §4).
- **FR-003**: System MUST use broad brackets only for financial context (e.g., "Pell Eligible", "Low SAI") when generating queries; never raw income or SSN.

**Search & Verification**
- **FR-004**: System MUST execute deep web searches focusing on the current and upcoming scholarship cycles (e.g., 2026/2027).
- **FR-005**: System MUST verify every result for cycle eligibility (deadline aligns with current/upcoming academic year); results with ambiguous or unverifiable deadlines MUST be flagged for manual review, not silently included (Cycle Sniper Logic).
- **FR-006**: System MUST NOT hardcode academic years; cycle and due-date logic MUST be computed dynamically from the current date (Constitution §8).

**Reputation Engine**
- **FR-007**: System MUST assign each scholarship a trust score (0–100) using a multi-factor model: domain type (.edu/.gov vs .com), site longevity, and fee check.
- **FR-008**: System MUST auto-fail (trust_score 0, exclude from active listings) any scholarship requiring an upfront fee—application, processing, or "guarantee" fee (Constitution §10).
- **FR-009**: System MUST produce a Trust Report for every scholarship explaining how the trust score was computed.

**Prioritization & Output**
- **FR-010**: System MUST prioritize Last-Dollar grants and need-based scholarships where the student's SAI fits the eligibility window; rank by SAI and gap alignment.
- **FR-011**: System MUST output in the Professional Advisor persona: analytical, cautious, and authoritative tone; every result includes a Trust Report.

**State & Persistence**
- **FR-012**: System MUST use the shared orchestration state (TuitionLiftState) as defined in the Orchestration spec; discovery_results and related fields MUST align with that schema.
- **FR-013**: System MUST checkpoint state after the Scout phase (before verification) so that verification retries do not re-run search.
- **FR-014**: System MUST rate-limit search batches to prevent external API throttling.

**Data Output**
- **FR-015**: System MUST write verified scholarship results to the scholarships entity in the shared data layer.
- **FR-016**: System MUST preserve search metadata (source URL, snippet, scoring factors) for each result; metadata MUST be stored alongside the scholarship record in a structured, queryable form.

### Key Entities

- **TuitionLiftState**: Shared orchestration state (from Orchestration spec). Includes user_profile, discovery_results, active_milestones, messages, last_active_node, financial_profile.
- **discovery_results**: Array of scholarship objects produced by the Advisor. Each has trust_score, source_url, need_match_score, Trust Report, and cycle verification status.
- **Scholarship (verified)**: Persisted to scholarships table. Attributes: title, amount, deadline, url, trust_score, category. Search metadata (source URL, snippet, scoring factors) stored in metadata field.
- **Trust Report**: Human-readable explanation of trust score for a scholarship; includes domain type, longevity, fee check outcome, and score rationale.
- **user_profile**: Validated student data (GPA, major, SAI brackets) used for query generation; never includes name or SSN in external calls.

### Assumptions

- The orchestration layer and shared state (TuitionLiftState) exist as defined in the Orchestration spec.
- The shared data layer provides a scholarships entity with support for title, amount, deadline, url, trust_score, category, and a metadata field for search provenance.
- External search is available; exact search provider is an implementation choice.
- Checkpointing mechanism supports persisting state after Scout phase; implementation follows Orchestration spec and persistence requirements.
- SAI validation and range (-1500 to 999999) follow federal guidance; FAFSA 2026–2027 applies.
- "Last-Dollar" refers to scholarships/grants that fill the gap after federal aid; eligibility often tied to SAI thresholds.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero instances of student name or SSN in outbound search traffic; audits confirm only anonymized attributes are used.
- **SC-002**: 100% of discovery results have a trust score and Trust Report; fee-required scholarships never appear as active.
- **SC-003**: 100% of results are either verified for current/upcoming cycle (2026/2027) or flagged for manual review; no unverified results shown as active.
- **SC-004**: When verification fails after Scout completes, resuming the workflow does not re-run search; verification retries only.
- **SC-005**: Verified results are written to the scholarships entity with search metadata preserved; data is queryable for Trust Filter and Coach prioritization.
- **SC-006**: Users receive discovery results within 5 minutes of triggering discovery (end-to-end), under normal load and rate limits.

## Documentation References

- [Orchestration Spec](../003-langgraph-orchestration/spec.md) — TuitionLiftState, checkpoint behavior, Advisor/Coach handoffs
- [DB Core Infrastructure Spec](../002-db-core-infrastructure/spec.md) — Scholarships entity, profiles (SAI, Pell)
- [TuitionLift Constitution](../../.specify/memory/constitution.md) — §4 PII, §8 Cycle Checks, §10 Reputation Engine
