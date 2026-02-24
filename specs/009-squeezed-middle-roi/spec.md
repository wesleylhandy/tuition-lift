# Feature Specification: Squeezed Middle & Alternative ROI Engine

**Feature Branch**: `009-squeezed-middle-roi`  
**Created**: 2025-02-24  
**Status**: Draft  
**Input**: User description: "Extend TuitionLift to support the 'Squeezed Middle' and Alternative ROI Engine."

## Summary

Extend TuitionLift to serve students who exceed need-based aid thresholds but lack liquidity to pay tuition out of pocket. Pivot the Advisor and Coach personas to prioritize high-value merit-based awards, institutional automatic grants, and trade-school/alternative education ROI.

## Clarifications

### Session 2025-02-24

- Q: Merit-first behavior — when SAI exceeds threshold, should need-based results be filtered (hidden) or deprioritized (shown below merit)? → A: User toggle — Let the user choose between "Merit only" (filter) and "Show all" (deprioritize).
- Q: ROI Auditor — how does a parent access and use the system? → A: Parent as separate role — Parent has a distinct account type; student can unlink at any time; parents can add income information or manual scholarship information but cannot edit other profile parts nor engage the agents.
- Q: Merit tiers — how are "merit tiers" defined for matching? → A: Fixed tiers with documented cutoffs — Predefined tiers (e.g., Top / Strong / Standard) with GPA/test ranges; documented for matching. Design must allow future enhancement (tier structure may be revisited).
- Q: Alternative-path institution source — where does Trade School / Community College / City College data come from? → A: Hybrid — Curated base catalog seeded from reputable .edu sources, plus optional search for additional institutions.
- Q: Year-5 income data scope — which majors/careers are covered? → A: Common majors and trade paths only — Top 50–100 majors and common trade paths; others show "Data not available"; design must allow extension via search/crawl from reputable sources.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The Merit Hunter (Priority: P1)

A high-achieving student with a high Student Aid Index (SAI) wants to filter out need-based results and focus exclusively on merit-based scholarships that reward performance—GPA, test scores, and achievements—rather than financial need.

**Why this priority**: Merit-first logic is the core differentiator for the Squeezed Middle; without it, high-SAI users receive irrelevant need-based recommendations and lose trust.

**Independent Test**: Can be fully tested by a user with SAI above the configured threshold completing intake, selecting "Merit only" or "Show all" via the toggle, and receiving a scholarship list dominated by merit-only opportunities—with need-based either filtered or deprioritized per their choice.

**Acceptance Scenarios**:

1. **Given** a user's SAI exceeds the configurable threshold (default 15,000), **When** the Advisor searches for scholarships, **Then** need-blind and merit-only awards are prioritized; need-based results are filtered (hidden) when user selects "Merit only" or deprioritized (shown below) when user selects "Show all".
2. **Given** a user with high SAI has completed intake with GPA, SAT/ACT, and extracurricular "spikes", **When** results are ranked, **Then** merit tiers are used to match and surface the most relevant scholarships.
3. **Given** search results are returned, **When** the Coach generates a Daily Game Plan, **Then** Merit-Only and Need-Blind tagged results appear first in the plan.

---

### User Story 2 - The ROI Auditor (Priority: P2)

A middle-class parent (linked to a student profile) wants to compare the debt-to-income ratio of a 4-year degree versus a 2-year trade school or community college so the family can make a solvent financial decision.

**Why this priority**: Alternative pathfinding addresses affordability anxiety directly; families need transparent ROI comparisons to choose confidently.

**Independent Test**: Can be fully tested by a parent with a linked student profile viewing side-by-side comparisons of net price, projected debt, and year-5 income for 4-year vs. alternative paths (trade school, community college, city college).

**Acceptance Scenarios**:

1. **Given** a parent is linked to a student profile, **When** viewing education options, **Then** the system displays Trade Schools, Community Colleges, and City Colleges as valid high-ROI alternatives alongside traditional 4-year institutions.
2. **Given** multiple institution types are in scope, **When** comparing options, **Then** the user can see Net Price (factoring Automatic Merit vs. Sticker Price) and remaining cost after scholarships (awarded or potential); potential awards MUST be clearly labeled to avoid misrepresentation.
3. **Given** career outcome data is available, **When** viewing each path, **Then** projected year-5 income is shown to support debt-to-income ratio evaluation.
4. **Given** a parent is linked, **When** they use the system, **Then** they may add income information or manual scholarship entries but cannot edit other profile parts nor engage the Advisor or Coach agents.
5. **Given** a student has linked a parent, **When** the student chooses to unlink, **Then** the parent loses access to the student's profile immediately.

---

### User Story 3 - The Major Pivot (Priority: P3)

An undecided student wants the Coach to ask discerning personality questions to suggest majors and schools that fit their natural strengths.

**Why this priority**: Enables discovery for students who may not have considered alternative paths; lower priority because it extends existing Coach flows rather than addressing core Squeezed Middle pain.

**Independent Test**: Can be fully tested by an undecided user engaging with Coach questions and receiving major/school suggestions aligned with their indicated strengths and interests.

**Acceptance Scenarios**:

1. **Given** a user indicates they are undecided about major/school, **When** the Coach interacts with them, **Then** the Coach poses personality and interest questions to discern strengths.
2. **Given** the user has answered Coach questions, **When** recommendations are generated, **Then** majors and schools suggested align with the user's indicated natural strengths and interests.

---

### Edge Cases

- What happens when a user's SAI is exactly at the threshold? (Treat as above-threshold for merit-first behavior.)
- What happens when no merit-based scholarships match the user's profile? (Surface alternative path options and indicate that merit results are limited; never show empty state without guidance.)
- What happens when Automatic Merit data is unavailable for an institution? (Display Sticker Price only and indicate "Merit data not available.")
- How does the system avoid misrepresenting scholarship impact on remaining cost? (Distinguish confirmed/awarded scholarships from potential; never imply guaranteed funding for unawarded scholarships.)
- What happens when year-5 income data is missing for a career path? (Omit from comparison or display "Data not available" rather than a placeholder value.)
- How does the system handle extracurricular data before external search? (All such data MUST be scrubbed of PII—no raw names or identifying details sent to third-party APIs.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When a user's SAI exceeds a configurable threshold (default 15,000), the Advisor MUST prioritize need-blind and merit-only scholarships; the user MUST be able to toggle between "Merit only" (filter need-based) and "Show all" (deprioritize need-based below merit).
- **FR-002**: The intake form MUST capture GPA, SAT/ACT scores, and "Spikes" (e.g., Water Polo, Leadership, specialty achievements) to match against merit tiers; merit tiers MUST use fixed, documented cutoffs (e.g., Top / Strong / Standard) with GPA/test ranges; the tier structure MUST be designed to allow future enhancement or revision.
- **FR-003**: The system MUST scout and display Trade Schools, Community Colleges, and City Colleges as valid high-ROI alternatives alongside 4-year institutions; the base catalog MUST be curated and seeded from reputable .edu sources; optional search MAY extend the catalog with additional institutions.
- **FR-004**: For every institution, the system MUST calculate and display Net Price by factoring Automatic Merit versus Sticker Price where data is available. The system MUST allow users to see what remains for a given institution after scholarships (awarded or potentially awarded) are applied; such views MUST avoid misrepresentation (e.g., distinguish confirmed vs. potential awards, avoid implying guaranteed funding).
- **FR-005**: The Coach MUST integrate projected year-5 income data into recommendations when comparing paths (4-year vs. alternative education); coverage MUST include common majors and trade paths (e.g., top 50–100); design MUST allow extension via search/crawl from reputable sources for additional career paths.
- **FR-006**: The Advisor MUST tag search results as "Merit-Only" or "Need-Blind" so the Coach can prioritize them in Daily Game Plans.
- **FR-007**: The Coach MUST prioritize Merit-Only and Need-Blind tagged results when building the user's Daily Game Plan.
- **FR-008**: All extracurricular and achievement data MUST be scrubbed of PII before any external search or third-party API call; only anonymized or placeholder values may leave the system.
- **FR-009**: The system MUST support a Parent role as a distinct account type linked to a student profile; the student MUST be able to unlink a parent at any time.
- **FR-010**: Parents MUST be able to add income information and manual scholarship entries to the linked student's profile; they MUST NOT edit other profile parts nor engage the Advisor or Coach agents.

### Key Entities

- **SAI Threshold**: Configurable value (default 15,000) that determines whether merit-first logic applies for a given user.
- **Merit Profile**: Aggregated intake data—GPA, SAT/ACT, Spikes—used to match against merit tiers. Merit tiers use fixed cutoffs (Top / Strong / Standard) with documented GPA/test ranges; design must support future tier changes.
- **Institution Record**: Represents an education option (4-year, trade school, community college, city college) with Sticker Price, Automatic Merit, and computed Net Price. Alternative-path institutions are sourced from a curated catalog seeded from .edu sources, with optional search for additional institutions.
- **Scholarship Tag**: Classification (Merit-Only, Need-Blind, Need-Based) applied by the Advisor to each result.
- **Career Outcome**: Projected year-5 income for a given major/career path, used for ROI comparison. Base coverage for common majors and trade paths only; extensible via search/crawl from reputable sources.
- **Parent Account**: Distinct role linked to a student profile; can add income and manual scholarships only; cannot edit other profile fields or engage agents; student may unlink at any time.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users with SAI above threshold see at least 80% of top-ranked scholarship results as Merit-Only or Need-Blind when merit-first logic is active.
- **SC-002**: Users can complete intake including GPA, test scores, and at least two Spikes in under 5 minutes.
- **SC-003**: Side-by-side ROI comparison (4-year vs. alternative path) displays Net Price and year-5 income for at least 3 path types when data is available.
- **SC-004**: Daily Game Plans for merit-eligible users surface Merit-Only and Need-Blind opportunities in the first 3 actionable items.
- **SC-005**: Zero raw PII in extracurricular/achievement data is sent to external search or third-party APIs; all such calls use placeholders or anonymized values.

## Assumptions

- SAI and financial data are already captured in TuitionLift's intake; this feature extends how they are used for filtering and prioritization.
- Merit tier cutoffs (GPA/test ranges) will be documented in the implementation plan; the tier model may be revisited for future enhancements.
- Alternative-path institution catalog is hybrid: curated base seeded from reputable .edu sources, with optional search for additional institutions.
- Automatic Merit and Sticker Price data are available from authoritative sources (institutional, federal, or third-party) for a meaningful subset of institutions.
- Year-5 income data (e.g., BLS/NACE) is available for common majors and trade paths; coverage is extensible via search/crawl from reputable sources.
- The Advisor and Coach personas already exist; this feature extends their behavior rather than introducing new personas.
