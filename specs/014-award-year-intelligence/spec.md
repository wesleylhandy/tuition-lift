# Feature Specification: User-Specific Award Year Logic and Intelligence Persistence

**Feature Branch**: `014-award-year-intelligence`  
**Created**: 2025-03-06  
**Status**: Draft  
**Input**: User description: "Implement User-Specific Award Year Logic and Intelligence Persistence for TuitionLift."

## Clarifications

### Session 2025-03-06

- Q: Where should the merit-first SAI threshold be stored for "configurable without code deployment"? → A: Supabase config table
- Q: What range of years should users be able to select for Target Award Year? → A: Current year through 4 years ahead (e.g., 2025–2029)
- Q: What metadata should be stored for cycle-aware verification? → A: Separate `scholarship_cycle_verifications` table (1:many); columns: scholarship_id, academic_year, verified_at
- Q: Which trust_score threshold should DB-first discovery use (60 vs 80)? → A: trust_score ≥ 60 (Vetted Commercial and High Trust)
- Q: What should the Coach do when no Alternative Path data exists for a Squeezed Middle user? → A: Omit the comparison; continue with other Coach content

## Summary

Make the user's target award year the primary driver for all search, organization, and application logic—replacing system-clock-derived academic years. Persist need-match scores when users track scholarships from discovery. Extend the discovery engine to query existing high-trust scholarships before external search, add cycle-aware verification for scholarships with past deadlines, and ensure the Coach surfaces alternative-path ROI comparisons for Squeezed Middle students. Require Target Award Year selection as the first data-gathering step in onboarding.

**Discovery Criteria Expansion (C1)**: Extend the Advisor's search criteria beyond GPA, major, income bracket, Pell status, and activities. Include state (for local/regional scholarships), institutions applied to or saved (institution-specific awards), first-generation college status, parent employer (employer-specific scholarships), and optional identity-based eligibility (race, creed, religion) as broad categories only—never raw PII to external APIs (Constitution §4). Support geographic scope (local, regional, national) and major type (intended vs. enrolled) when profile data is available. This spec fills the gap left by completed 002, 004, and 008 specs.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Award-Year-Driven Search and Applications (Priority: P1)

A student who has selected a target award year (e.g., 2027–2028) expects all scholarship discovery, tracking, and application organization to use that year—not the current calendar year. When they Track or Scout a scholarship, the application is associated with their chosen award year. Search results reflect scholarships relevant to their graduation timeline.

**Why this priority**: Award-year dominance is the foundation; without it, students planning for future cycles receive mismatched results and applications.

**Independent Test**: Can be fully tested by a user with award year 2027 completing onboarding, triggering discovery, and tracking a scholarship—then verifying the application record uses academic year "2027-2028" and discovery queries target 2027–2028 cycle data.

**Acceptance Scenarios**:

1. **Given** a user has selected target award year (e.g., 2026 or 2027), **When** they Track or Scout a scholarship, **Then** the application record uses academic year derived from their profile award year (format "YYYY-YYYY"), not the system clock.
2. **Given** a user's profile award year, **When** the Advisor generates search queries, **Then** the user's specific award year is injected so results target the correct cycle (e.g., 2026–2027 or 2027–2028).
3. **Given** a user views their tracked applications or Match Inbox, **When** data is filtered or organized by year, **Then** the user's profile award year is used consistently.
4. **Given** all year-related display or storage, **When** the system presents or persists academic years, **Then** the format is unified as "YYYY-YYYY" across the application.

---

### User Story 2 - Need-Match Score Persistence (Priority: P1)

A student who tracks a scholarship from the Discovery Feed expects the Advisor's relevance score (how well the scholarship matches their financial need) to be saved with the application. This score supports prioritization and sorting in their dashboard.

**Why this priority**: Persisting need-match scores preserves Advisor intelligence; without it, the score is lost when moving from discovery to application.

**Independent Test**: Can be fully tested by triggering discovery, receiving results with need-match scores, tracking a scholarship from the feed, and verifying the application record contains the persisted score.

**Acceptance Scenarios**:

1. **Given** a user tracks a scholarship from the Discovery Feed (where the Advisor has computed a need-match score), **When** the application is created or updated, **Then** the need-match score from the discovery result is persisted to the application record.
2. **Given** an application with a persisted need-match score, **When** the user views their tracked scholarships or prioritization lists, **Then** the score is available for ordering and display.
3. **Given** a user tracks a scholarship via Scout (manual URL/name entry) or another path where no discovery score exists, **When** the application is created, **Then** the need-match score may be null; the system handles missing scores gracefully.

---

### User Story 3 - Merit-First Mode for High-SAI Students (Priority: P2)

A student with an estimated SAI above a configurable threshold (e.g., 15,000) receives discovery results that prioritize Need-Blind awards and institutional merit tiers over Pell-based grants. The system adapts to their financial profile.

**Why this priority**: Squeezed Middle students (009) need merit-first behavior; this extends the logic with a configurable SAI threshold.

**Independent Test**: Can be fully tested by a user with SAI above the threshold completing discovery and verifying that Need-Blind and merit-tier scholarships are prioritized over Pell-based grants.

**Acceptance Scenarios**:

1. **Given** a user's estimated SAI exceeds the configurable merit-first threshold, **When** the Advisor searches and ranks results, **Then** Need-Blind awards and institutional merit tiers are prioritized over Pell-based grants.
2. **Given** the merit-first threshold is configurable, **When** the threshold value changes, **Then** the system uses the updated value without code deployment.
3. **Given** a user's SAI is at or below the threshold, **When** discovery runs, **Then** standard need-based prioritization applies (no merit-first pivot).

---

### User Story 4 - DB-First Discovery and Cycle-Aware Verification (Priority: P2)

The Advisor checks the existing scholarships catalog for high-trust matches before invoking external search. Scholarships with deadlines in the past are flagged for re-verification before being suggested for a new award year.

**Why this priority**: Reduces external API usage, improves speed, and ensures cycle accuracy for reused scholarship data.

**Independent Test**: Can be fully tested by seeding the scholarships table with high-trust entries, triggering discovery, and verifying the Advisor queries the database first; and by having a scholarship with a past deadline and verifying it is flagged for re-verification when suggested for a new cycle.

**Acceptance Scenarios**:

1. **Given** the scholarships table contains high-trust matches for the user's profile and award year, **When** the Advisor runs discovery, **Then** it queries the database for existing matches before invoking external search.
2. **Given** a scholarship has a deadline in the past (relative to the user's target award year), **When** the Advisor considers suggesting it for that award year, **Then** the scholarship is flagged for re-verification before inclusion.
3. **Given** a scholarship has been verified for a specific cycle, **When** that cycle is stored, **Then** the system can determine whether the scholarship needs re-verification for a different award year.

---

### User Story 5 - Alternative Path ROI for Squeezed Middle (Priority: P3)

A student in the Squeezed Middle SAI bracket receives Coach-provided comparisons of alternative paths (e.g., Trade School vs. 4-Year) to support informed financial decisions.

**Why this priority**: Extends 009's Alternative ROI Engine; lower priority because it builds on existing Coach flows.

**Independent Test**: Can be fully tested by a Squeezed Middle user receiving Coach recommendations that include side-by-side Trade School vs. 4-Year comparisons.

**Acceptance Scenarios**:

1. **Given** a user falls within the Squeezed Middle SAI bracket, **When** the Coach generates recommendations or Game Plans, **Then** the Coach may include "Alternative Path" comparisons (e.g., Trade School vs. 4-Year) where data is available.
2. **Given** alternative path data is presented, **When** the user views it, **Then** the comparison is clearly labeled and avoids misrepresenting potential outcomes (per 009).

---

### User Story 6 - Target Award Year as First Onboarding Step (Priority: P1)

A new user must select their Target Award Year before providing academic or financial details. This ensures all subsequent discovery and application logic uses the correct cycle from the start.

**Why this priority**: Award year is the primary driver; collecting it first prevents mismatched data and rework.

**Independent Test**: Can be fully tested by starting onboarding and verifying that Target Award Year selection is required and presented as the first user-facing data collection step (or first required field) before academic or financial intake.

**Acceptance Scenarios**:

1. **Given** a user is in the onboarding flow, **When** they reach the first data-gathering step, **Then** Target Award Year selection is required before they can advance.
2. **Given** Target Award Year is not yet selected, **When** the user attempts to proceed to academic or financial steps, **Then** the system prevents advancement or prompts for award year first.
3. **Given** the user selects a Target Award Year, **When** the selection is saved, **Then** it is persisted to their profile and used for all subsequent discovery and application logic.

---

### User Story 7 - Expanded Discovery Criteria (Priority: P2)

A student with state, saved institutions, first-generation status, or parent employer expects discovery to surface scholarships matching those criteria—local/regional, institution-specific, first-gen, and employer-sponsored. The Advisor uses all available profile attributes (as anonymized categories) to generate broader, more relevant search queries.

**Why this priority**: Current criteria (GPA, major, income, Pell, activities) miss institution-level, geographic, socioeconomic, and affirmative-action scholarships. Expanding criteria improves match quality.

**Independent Test**: Can be fully tested by a user with state=CA and saved institutions triggering discovery and verifying queries include "California scholarships" and institution names; or a first-gen user verifying "first-generation" appears in query angles.

**Acceptance Scenarios**:

1. **Given** a user's profile includes state (e.g., CA), **When** the Advisor generates search queries, **Then** at least one query targets local/regional scholarships for that state.
2. **Given** a user has saved institutions (user_saved_schools), **When** discovery runs, **Then** queries include institution-specific scholarship angles for those schools.
3. **Given** a user's profile indicates first-generation college status, **When** discovery runs, **Then** queries include first-generation scholarship angles.
4. **Given** a user's profile includes parent employer (or employer category), **When** discovery runs, **Then** queries include employer-sponsored scholarship angles.
5. **Given** optional identity-based eligibility categories (e.g., minority-eligible) are present, **When** passed to query generation, **Then** only broad labels are used—never raw PII (Constitution §4).

---

### Edge Cases

- What happens when a user has no award year in their profile? (Block discovery and tracking until award year is set; prompt during onboarding or profile completion.)
- How does the system handle a user who changes their award year after tracking scholarships? (Existing applications retain their academic_year; new tracking uses the updated award year; consider surfacing "You have applications for a different year" if applicable.)
- What happens when need-match score is unavailable (e.g., Scout path)? (Application is created without it; prioritization falls back to other signals such as trust_score, deadline, or momentum_score.)
- How does the system handle scholarships with no verified_for_cycle or ambiguous cycle? (Flag for re-verification; do not suggest as active until verified for the user's award year.)
- What happens when the DB-first lookup returns no matches? (Proceed to external search as today; no change to fallback behavior.)
- How does the merit-first threshold interact with 009's merit_filter_preference? (Merit-first mode activates when SAI exceeds threshold; user toggle for "Merit only" vs "Show all" remains per 009.)
- What happens when no Alternative Path data exists for a Squeezed Middle user? (Omit the comparison; do not show placeholder or empty section; continue with other Coach content.)
- What happens when profile has no state, saved institutions, or expanded criteria? (Discovery uses only existing attributes; no error; queries remain based on GPA, major, income, Pell, activities.)
- How does the system handle identity-based attributes for PII? (Only broad category labels—e.g., "minority-eligible"—never raw race, religion, or creed to external APIs.)

## Requirements *(mandatory)*

### Functional Requirements

**Award-Year Dominance**
- **FR-001**: The user's profile target award year MUST be the primary driver for all search, organization, and application logic. The system MUST NOT use the current system clock to derive academic year for application creation or discovery when the user has a profile award year.
- **FR-002**: When a user Tracks or Scouts a scholarship, the application's academic year MUST be derived from the user's profile award year. The mapping from award year (e.g., 2026) to academic year string (e.g., "2026-2027") MUST be consistent and unambiguous.
- **FR-003**: The Advisor's query generation MUST inject the user's specific award year so that search targets the correct cycle (e.g., 2026–2027 or 2027–2028) based on the student's graduation timeline.
- **FR-004**: All academic year strings displayed or stored MUST use the unified format "YYYY-YYYY" across the application.

**Intelligence Persistence**
- **FR-005**: The system MUST persist a need-match score (decimal) on the application record when a user tracks a scholarship from the Discovery Feed and the discovery result includes a need-match score from the Advisor.
- **FR-006**: When tracking from Discovery Feed, the need-match score from the LangGraph checkpoint (or equivalent discovery result) MUST be written to the application record. When tracking via other paths (e.g., Scout), the score MAY be null.
- **FR-007**: When a user's estimated SAI exceeds a configurable threshold (e.g., 15,000), the system MUST activate Merit-First Mode: prioritize Need-Blind awards and institutional merit tiers over Pell-based grants. The threshold MUST be configurable without code deployment.

**Hybrid Discovery**
- **FR-008**: The Advisor MUST query the scholarships table for existing high-trust matches that fit the user's profile and award year BEFORE invoking external search tools.
- **FR-009**: The system MUST support cycle-aware versioning for scholarships: any scholarship with a deadline in the past (relative to the user's target award year) MUST be flagged for re-verification by the Advisor before being suggested for that award year.
- **FR-010**: The Coach MUST provide "Alternative Path" comparisons (e.g., Trade School vs. 4-Year) for students in the Squeezed Middle SAI bracket when data is available. When no alternative path data exists, the Coach MUST omit the comparison and continue with other content; no placeholder or empty section.

**Onboarding**
- **FR-011**: The Onboarding Wizard MUST require selection of Target Award Year as the first user-facing data collection step (or first required field) before academic or financial intake. Users MUST NOT advance to academic or financial steps without a selected award year.
- **FR-012**: The Target Award Year selector MUST offer a range from the current calendar year through 4 years ahead (e.g., 2025–2029).

**Discovery Criteria Expansion (C1)**
- **FR-013**: The Advisor's query generation MUST include the user's state (when available in profile) so search targets local and regional scholarships. State MUST be passed to query generation as an anonymized attribute (e.g., state code).
- **FR-014**: The Advisor's query generation MUST include institutions the user has applied to or saved (user_saved_schools) when available, to target institution-specific scholarships.
- **FR-015**: When profile includes first-generation college status, parent employer (or employer category), or optional identity-based eligibility categories, the Advisor MUST include those angles in query generation. Identity-based attributes MUST use broad labels only—never raw PII to external APIs (Constitution §4).
- **FR-016**: Query generation MUST vary by geographic scope (local, regional, national) when state or preference is available.

### Key Entities

- **Profile (extended)**: Includes target award year. Used as the primary source for deriving academic year and cycle for all user-specific operations.
- **Application (extended)**: Includes academic year (derived from profile award year) and need-match score (persisted when tracking from Discovery Feed). Uniqueness remains per (user, scholarship, academic year).
- **Scholarship (extended)**: Referenced by `scholarship_cycle_verifications` for cycle-aware verification. Scholarships with past deadlines are flagged for re-verification before suggestion for a new award year.
- **Scholarship Cycle Verification**: New table `scholarship_cycle_verifications` (1:many with scholarships). Columns: `scholarship_id`, `academic_year` (e.g., "2025-2026"), `verified_at`. Supports per-cycle verification history and re-verification checks.
- **Discovery Result**: Produced by Advisor; includes need-match score. When user tracks from feed, score is persisted to application.
- **Merit-First Config**: Configurable SAI threshold; when user SAI exceeds it, Merit-First Mode activates.
- **AnonymizedProfile (extended)**: Includes state, saved institution names (or IDs for lookup), first_gen, parent_employer_category, identity_eligibility_categories—all as search-safe attributes for query generation.

## Assumptions

- The profiles table already supports an award year field (009); this feature makes it the primary driver and ensures it is collected first in onboarding.
- The applications table will be extended to store need-match score; discovery results already produce this score (004).
- A new `scholarship_cycle_verifications` table (1:many with scholarships) stores per-cycle verification: `scholarship_id`, `academic_year`, `verified_at`. Enables "verified for cycle X?" checks and re-verification logic without extending the scholarships table.
- Merit-first threshold (e.g., 15,000) will be stored in a Supabase config table; 009's sai_zone_config and merit_tier_config patterns may be extended or reused.
- DB-first lookup uses existing scholarships table; high-trust for DB-first is trust_score ≥ 60 (Vetted Commercial and High Trust per Constitution §10).
- Alternative Path data sources (Trade School, Community College) follow 009's curated catalog approach.
- Profile may be extended (002/008) to support first_generation, parent_employer_category, identity_eligibility_categories; 014 specifies query-generation behavior when those fields exist.
- State is already in profiles (002); user_saved_schools exists (009); no new tables required for C1 query expansion.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of application records created via Track or Scout use academic year derived from the user's profile award year when that profile has an award year set.
- **SC-002**: When a user tracks a scholarship from the Discovery Feed with a need-match score, the score is persisted to the application record in 100% of cases.
- **SC-003**: Users with SAI above the merit-first threshold receive at least 70% of top-ranked discovery results as Need-Blind or merit-tier when Merit-First Mode is active. *Definition*: "Top-ranked" = first 10 results returned to the user by Advisor ranking; "70%" = at least 7 of those 10 have merit_tag in {need_blind, merit_only} or equivalent merit-tier classification.
- **SC-004**: The Advisor queries the scholarships table for high-trust matches before invoking external search in 100% of discovery runs.
- **SC-005**: Scholarships with deadlines in the past (relative to user's award year) are never suggested as active without re-verification.
- **SC-006**: New users cannot complete onboarding without selecting a Target Award Year; the selection is required before academic or financial intake.
- **SC-007**: All academic year values use the "YYYY-YYYY" format consistently across the web app and agent packages.
- **SC-008**: When profile includes state, discovery queries include at least one local/regional angle for that state in 100% of runs.
- **SC-009**: When profile includes saved institutions, discovery queries include institution-specific angles in 100% of runs.

## Documentation References

- [Squeezed Middle ROI Spec](../009-squeezed-middle-roi/spec.md) — award_year, merit-first, SAI zones, Alternative ROI
- [Advisor Discovery Engine Spec](../004-advisor-discovery-engine/spec.md) — need_match_score, QueryGenerator, Trust Filter
- [Quick Onboarder Spec](../008-quick-onboarder/spec.md) — onboarding flow, step structure
- [DB Core Infrastructure Spec](../002-db-core-infrastructure/spec.md) — applications, profiles, scholarships schema
- [TuitionLift Constitution](../../.specify/memory/constitution.md) — §8 Dynamic Cycle Checks, §10 Reputation Engine
