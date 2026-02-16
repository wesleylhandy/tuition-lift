# Feature Specification: System Orchestration & State Graph

**Feature Branch**: `003-langgraph-orchestration`  
**Created**: 2025-02-13  
**Status**: Draft  
**Input**: User description: "System Orchestration & State Graph - LangGraph JS orchestration layer coordinating Advisor (Discovery Specialist) and Coach (Execution Specialist) with durable state in Supabase, supporting long-running tasks, asynchronous verification, and seamless handoffs."

## Clarifications

### Session 2025-02-16

- Q: Source of household_income_bracket for FinancialProfile (002 alignment)? → A: Compute from SAI at read; NOT stored in profiles; orchestration derives at load per 002 FR-014a
- Q: Should 003 expose discovery_run_id with discovery results for downstream consumers (e.g., 006 dismissals)? → A: Add discovery_run_id to discovery_completions and/or discovery results payload so 006 can scope dismissals by run

### Session 2025-02-13

- Q: When a user triggers a second "New Search" while discovery is already in progress, what should the second request do? → A: Return status immediately—surface "discovery in progress" with link to live run; user can refresh
- Q: Which set of brackets should household_income_bracket use? → A: Standard federal tiers (e.g., Low / Moderate / Middle / Upper-Middle / High)
- Q: When does the Advisor need a deep search (requiring HITL confirmation) vs. a normal anonymized search? → A: When Advisor uses SAI range filter—even anonymized, SAI bands (e.g., 0–2000) are more specific than tiers; confirm before using
- Q: During async discovery (up to 5 minutes), how should the system keep the user informed? → A: Status message + polling/refresh during wait; notification (bell or toaster) when discovery completes so user can multitask and return when ready
- Q: How should "normal load" be quantified for SC-001 acceptance testing? → A: Single-user / sequential requests—SLA applies when no other discovery runs are active; concurrent load deferred to later phase
- Q: Should Advisor search queries use placeholders for user-identifying info and never send raw names/addresses? → A: Yes—use placeholders only (e.g., {{USER_STATE}}, {{USER_CITY}}); never send raw names or addresses to search APIs
- Q: When user triggers discovery with incomplete profile, what should happen? → A: Hybrid—required user_profile fields must be complete (error + instructions if missing); optional/financial fields may be missing (warnings only; search runs with available data; user can add later to refine)
- Q: When discovery returns zero scholarships, how should the Coach present this to the user? → A: Friendly "No matches yet" message; Coach explains why when possible and suggests profile/query updates (broaden filters, add financial data)
- Q: Does Supabase default encryption satisfy FR-014, or is additional application-level encryption needed? → A: Add application-level encryption for financial fields in profiles
- Q: Should discovery flow have an explicit success criterion for Lighthouse 90+? → A: Yes, add explicit SC (discovery flow meets Lighthouse 90+ Performance and Best Practices)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Discovery to Prioritization Flow (Priority: P1)

A student who has completed onboarding requests scholarship discovery. The Advisor searches for scholarships filtered by their financial profile (using anonymized brackets only), scores results by reputation, and hands off to the Coach. The Coach maps scholarships to a step-by-step game plan prioritizing by ROI relative to the student's financial gap. The student receives a prioritized list of next steps.

**Why this priority**: Core value proposition—transforming raw discovery into actionable, personalized scholarship plans.

**Independent Test**: Can be fully tested by invoking discovery with a complete user profile and financial profile, then verifying that discovery results are scored and transformed into prioritized milestones with ROI-based ordering.

**Acceptance Scenarios**:

1. **Given** onboarding complete with validated user profile and financial profile, **When** user requests "New Search" or discovery is triggered, **Then** Advisor performs search using anonymized financial context and returns scored scholarship results.
2. **Given** discovery results are available, **When** Coach_Prioritization runs, **Then** scholarships are mapped to active milestones ordered by ROI (Lift relative to financial gap).
3. **Given** Advisor completes search, **When** handoff occurs, **Then** a Command object transitions the graph to Coach_Prioritization.
4. **Given** Coach produces milestones, **When** processing completes, **Then** graph transitions to END or awaits user interaction (Human-in-the-loop).
5. **Given** discovery is running asynchronously, **When** the user is elsewhere in the app, **Then** the user receives a notification (bell or toaster) when discovery completes and may return to view results at their convenience.

---

### User Story 2 - Human-in-the-Loop Financial Deep Search (Priority: P2)

Before the Advisor uses an SAI range filter in search (e.g., "scholarships for SAI 0–2000"), the Coach must ask the user for confirmation. SAI bands are more specific than broad income tiers; users control when this level of financial detail informs external searches. The user approves or denies. Only with approval does the Advisor include SAI range in the search.

**Why this priority**: Critical for privacy and trust—users control when financial detail beyond basic tiers is used.

**Independent Test**: Can be tested by attempting a deep search; system must prompt for confirmation before proceeding and must not use sensitive context without approval.

**Acceptance Scenarios**:

1. **Given** Advisor needs SAI range filter for search (e.g., SAI 0–2000), **When** Coach mediates the request, **Then** user is asked for explicit confirmation.
2. **Given** user denies confirmation, **When** response is received, **Then** Advisor does not use SAI range; only broad income tiers are used.
3. **Given** user confirms, **When** confirmation is received, **Then** Advisor may proceed with search including SAI range filter.

---

### User Story 3 - Fault Recovery and Resumability (Priority: P3)

When a node fails, the state is updated with an error log and the graph routes to a Safe Recovery node. The Coach persona notifies the user. The system checkpoints after search but before verification so that if verification fails, the Advisor does not re-run expensive searches.

**Why this priority**: Ensures reliability and cost efficiency—durable state and checkpoint behavior prevent duplicate work and inform users of issues.

**Independent Test**: Can be tested by simulating node failure and verifying error_log is populated, Safe Recovery runs, user is notified via Coach, and re-runs do not duplicate search.

**Acceptance Scenarios**:

1. **Given** a node fails during execution, **When** error is caught, **Then** state is updated with error_log and graph routes to Safe Recovery.
2. **Given** Safe Recovery is invoked, **When** it runs, **Then** user is notified via the Coach persona.
3. **Given** search completed but verification failed, **When** graph is resumed, **Then** checkpoint exists after search and Advisor does not re-run search; verification is retried.

---

### User Story 4 - Scheduled Prioritization Refresh (Priority: P4)

On a defined schedule (e.g., daily), Coach_Prioritization runs to refresh the milestone plan using any new discovery results or updated user context. The student's active milestones stay current without manual "New Search" triggers.

**Why this priority**: Keeps plans relevant over time; supports passive users who don't actively request updates.

**Independent Test**: Can be tested by triggering a scheduled run with existing discovery results and verifying milestones are refreshed.

**Acceptance Scenarios**:

1. **Given** discovery results and user profile exist, **When** scheduled prioritization runs, **Then** active_milestones are recalculated based on current data.
2. **Given** no new discovery results, **When** scheduled run executes, **Then** existing milestones may be re-prioritized or confirmed; no duplicate discovery is triggered.

---

### Edge Cases

- What happens when user profile or financial profile is incomplete at discovery trigger? Required user_profile fields (e.g., major, state) must be present—if missing, return error with instructions to complete. Optional/financial fields (SAI, Pell status, income bracket) may be missing—surface warnings but allow search to run with available data; user can add later to refine results.
- How does the system handle concurrent "New Search" requests for the same user? Only one discovery run should be active at a time; subsequent requests return status immediately (surface "discovery in progress" with link to live run; user can refresh).
- What happens when discovery returns zero results? Coach presents a friendly "No matches yet" message; explains why when possible (e.g., narrow filters); suggests actionable next steps (broaden filters, add financial data, update profile); no error state—empty results are a valid outcome.
- How does the system handle third-party search API timeout or failure? Error logged; Safe Recovery invoked; user notified via Coach; checkpoint before verification allows retry of verification only.
- What happens when financial_profile.estimated_sai is out of valid range (-1500 to 999999)? Data must be validated before use; invalid SAI prevents discovery until corrected.

## Requirements *(mandatory)*

### Functional Requirements

**State & Persistence**
- **FR-001**: System MUST maintain a central shared state (TuitionLiftState) that is the single source of truth for orchestration, including user_profile, discovery_results, active_milestones, messages, last_active_node, financial_profile, and error_log.
- **FR-002**: System MUST persist every state transition durably so that long-running tasks survive interruptions and can be resumed.
- **FR-003**: System MUST checkpoint state after search completes but before verification so that failed verification does not trigger re-execution of the search step.
- **FR-004**: System MUST track which persona (Advisor or Coach) last modified the state via last_active_node.

**Discovery (Advisor)**
- **FR-005**: Advisor_Discovery MUST trigger on onboarding complete or explicit "New Search" request.
- **FR-006**: Advisor_Discovery MUST perform web search using financial_profile as primary filter (e.g., need-based scholarships for low SAI).
- **FR-007**: Advisor_Discovery MUST anonymize financial data before sending to third-party search APIs; raw income numbers, SSNs, or tax data must never be sent externally. Use broad brackets only (e.g., "Low Income", "Pell Eligible").
- **FR-007a**: Advisor_Discovery MUST NOT send raw student names or full addresses to search APIs; use placeholders only (e.g., {{USER_STATE}}, {{USER_CITY}}) for geo or identifiers.
- **FR-008**: Advisor_Discovery MUST score discovery results with trust_score and source_url; results MUST include need_match_score comparing scholarship requirements to financial_profile.
- **FR-009**: Advisor_Discovery MUST hand off via a Command object to transition to Coach_Prioritization once results are verified.
- **FR-009a**: System MUST expose discovery_run_id (uuid) with discovery results and/or discovery_completions so downstream consumers (e.g., 006) can scope dismissals by run (soft dismiss: hidden for current run only; reappears on new discovery).

**Prioritization (Coach)**
- **FR-010**: Coach_Prioritization MUST trigger when new discovery results are added or on a defined schedule (e.g., daily).
- **FR-011**: Coach_Prioritization MUST map scholarships to a step-by-step game plan (active_milestones), prioritizing by ROI—focusing on awards that provide the most Lift relative to the student's financial gap.
- **FR-012**: Coach_Prioritization MUST transition to END or await user interaction (Human-in-the-loop) when complete.
- **FR-012b**: When discovery_results is empty, Coach MUST present a friendly "No matches yet" message; explain why when possible; suggest actionable next steps (e.g., broaden filters, add financial data, update profile). Empty results are a valid outcome—no error state.

**Profile Validation**
- **FR-012a**: Before triggering discovery, the system MUST validate required user_profile fields (as defined per data model—e.g., major, state). If any required field is missing, the system MUST return an error with instructions to complete it. Optional and financial_profile fields may be missing; the system MUST surface warnings but MAY allow search to proceed; users can add financial data later to refine results.

**Concurrency & Long-Running Tasks**
- **FR-013**: System MUST support invocation of discovery workflows that exceed typical request timeout limits (e.g., 10–30 seconds); long-running discovery must run asynchronously and persist progress.
- **FR-013a**: When a user triggers "New Search" while a discovery run is already active for that user, the system MUST return immediately with a status indicating discovery in progress and a link or reference to the live run; the user may refresh to see updated results.
- **FR-013b**: During async discovery, the system MUST surface a status message (e.g., "Discovery in progress…") and support polling/refresh. When discovery completes, the system MUST notify the user via a notification bell or toaster so they can multitask and choose when to return to view results.

**Security & PII**
- **FR-014**: All financial data at rest MUST be encrypted. Application-level encryption is required for financial fields in profiles (e.g., SAI); database-level encryption provides defense-in-depth. Note: household_income_bracket is not stored (computed from SAI at read per 002).
- **FR-015**: System MUST store only calculated SAI and broad income brackets; never raw parent/student SSNs or full tax returns.
- **FR-016**: Coach MUST ask for user confirmation before Advisor uses SAI range filter in search (e.g., SAI bands like 0–2000); without confirmation, Advisor must not include SAI range—only broad income tiers may be used.

**Recovery & Errors**
- **FR-017**: When a node fails, state MUST be updated with error_log and execution routed to a Safe Recovery node.
- **FR-018**: Safe Recovery MUST notify the user via the Coach persona.
- **FR-019**: System MUST support real-time tracing of agent handoffs for observability and debugging.

### Key Entities

- **TuitionLiftState**: Central orchestration state. Includes: user_profile, discovery_results, active_milestones, messages, last_active_node, financial_profile.
- **user_profile**: Validated student data (GPA, Major, State) sourced from profiles; used for scholarship matching.
- **discovery_results**: Array of scholarship objects. Each has trust_score, source_url, and need_match_score (comparing requirements to financial_profile).
- **active_milestones**: Prioritized list of upcoming tasks for the Coach; ordered by ROI (Lift relative to financial gap).
- **messages**: Message history for cross-agent communication (Advisor ↔ Coach).
- **last_active_node**: String identifying which persona last modified the state.
- **financial_profile**: Includes estimated_sai (Number, -1500 to 999999), is_pell_eligible (Boolean), household_income_bracket (Enum: Low / Moderate / Middle / Upper-Middle / High—standard federal tiers). household_income_bracket is computed from SAI at read time; NOT stored in profiles (per 002 FR-014a). Used for filtering and anonymization in search.
- **Command**: Object used for handoff between Advisor and Coach; triggers transition to Coach_Prioritization.
- **error_log**: Record of failures; populated when a node fails; used for recovery and user notification.

### Assumptions

- Stateful orchestration framework supports checkpointing, node transitions, and conditional routing.
- Durable persistence layer stores checkpoints in a database aligned with existing infrastructure.
- Asynchronous execution is triggered via a job/workflow system to bypass request timeout limits.
- Observability/tracing is available for agent handoffs.
- SAI validation follows federal Student Aid Index range (-1500 to 999999); FAFSA 2026-2027 guidance applies.
- FERPA and student privacy regulations apply; minimal PII storage and anonymization rules align with EdTech compliance expectations.
- need_match_score is a comparative score (e.g., 0–100) derived from financial_profile vs. scholarship requirements; exact formula is implementation-defined.
- Scheduled prioritization default is daily (24-hour); exact schedule is configurable.
- SC-001 (5-minute SLA) applies under single-user / sequential conditions; concurrent load and throughput targets are deferred to a later phase.
- Required user_profile fields (e.g., major, state) are defined in the data model; financial_profile fields are optional for initial discovery and may be added later to refine results.
- Application-level encryption for financial profile fields (SAI, income bracket) is required per FR-014; implementation details in plan.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users receive a prioritized scholarship plan within 5 minutes of requesting discovery (end-to-end from trigger to active_milestones available) when no other discovery runs are active for that user (single-user / sequential; concurrent load targets deferred to later phase).
- **SC-002**: 100% of state transitions are persisted; no state loss on process restart or timeout; graph can resume from last checkpoint.
- **SC-003**: Zero raw financial PII (SSN, full tax data) is ever sent to external search APIs; audits confirm only anonymized brackets are used.
- **SC-004**: When a node fails, users are notified via Coach within 60 seconds; error_log is populated and Safe Recovery completes.
- **SC-005**: 95% of discovery-to-prioritization handoffs complete without requiring manual intervention under normal conditions.
- **SC-006**: Long-running discovery workflows complete successfully regardless of request timeout limits; users see results asynchronously when ready.
- **SC-007**: Discovery flow (trigger, status poll, results view) meets Lighthouse Performance and Best Practices scores of 90+ each, verified in pre-release checks.

## Documentation References

- [LangGraph JS State Management](https://langchain-ai.github.io/langgraphjs/concepts/state/)
- [Persistence with Checkpointers](https://langchain-ai.github.io/langgraphjs/how-tos/persistence/)
- [Multi-Agent Handoffs](https://langchain-ai.github.io/langgraphjs/how-tos/multi-agent-handoffs/)
- [FAFSA 2026-2027 SAI Calculation Guide](https://studentaid.gov/sites/default/files/2026-27-fafsa-form.pdf)
- [FERPA Compliance for EdTech](https://studentprivacy.ed.gov/node/548)
