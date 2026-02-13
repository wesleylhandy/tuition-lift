# Feature Specification: System Orchestration & State Graph

**Feature Branch**: `003-langgraph-orchestration`  
**Created**: 2025-02-13  
**Status**: Draft  
**Input**: User description: "System Orchestration & State Graph - LangGraph JS orchestration layer coordinating Advisor (Discovery Specialist) and Coach (Execution Specialist) with durable state in Supabase, supporting long-running tasks, asynchronous verification, and seamless handoffs."

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

---

### User Story 2 - Human-in-the-Loop Financial Deep Search (Priority: P2)

Before the Advisor uses sensitive financial context for a deep search, the Coach must ask the user for confirmation. The user approves or denies. Only with approval does the Advisor perform a search that uses more detailed financial context.

**Why this priority**: Critical for privacy and trust—users control when sensitive data informs external searches.

**Independent Test**: Can be tested by attempting a deep search; system must prompt for confirmation before proceeding and must not use sensitive context without approval.

**Acceptance Scenarios**:

1. **Given** Advisor needs sensitive financial context for a deep search, **When** Coach mediates the request, **Then** user is asked for explicit confirmation.
2. **Given** user denies confirmation, **When** response is received, **Then** Advisor does not use sensitive financial data in the search.
3. **Given** user confirms, **When** confirmation is received, **Then** Advisor may proceed with anonymized deep search using approved context.

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

- What happens when user profile or financial profile is incomplete at discovery trigger? System must not run Advisor search with incomplete data; Coach or onboarding flow should prompt for missing fields.
- How does the system handle concurrent "New Search" requests for the same user? Only one discovery run should be active; subsequent requests queue or return status until current run completes.
- What happens when discovery returns zero results? Coach receives empty discovery_results; milestones may be empty or suggest broadening criteria; no error state for empty results.
- How does the system handle third-party search API timeout or failure? Error logged; Safe Recovery invoked; user notified via Coach; checkpoint before verification allows retry of verification only.
- What happens when financial_profile.estimated_sai is out of valid range (-1500 to 999999)? Data must be validated before use; invalid SAI prevents discovery until corrected.

## Requirements *(mandatory)*

### Functional Requirements

**State & Persistence**
- **FR-001**: System MUST maintain a central shared state (TuitionLiftState) that is the single source of truth for orchestration, including user_profile, discovery_results, active_milestones, messages, last_active_node, and financial_profile.
- **FR-002**: System MUST persist every state transition durably so that long-running tasks survive interruptions and can be resumed.
- **FR-003**: System MUST checkpoint state after search completes but before verification so that failed verification does not trigger re-execution of the search step.
- **FR-004**: System MUST track which persona (Advisor or Coach) last modified the state via last_active_node.

**Discovery (Advisor)**
- **FR-005**: Advisor_Discovery MUST trigger on onboarding complete or explicit "New Search" request.
- **FR-006**: Advisor_Discovery MUST perform web search using financial_profile as primary filter (e.g., need-based scholarships for low SAI).
- **FR-007**: Advisor_Discovery MUST anonymize financial data before sending to third-party search APIs; raw income numbers, SSNs, or tax data must never be sent externally. Use broad brackets only (e.g., "Low Income", "Pell Eligible").
- **FR-008**: Advisor_Discovery MUST score discovery results with trust_score and source_url; results MUST include need_match_score comparing scholarship requirements to financial_profile.
- **FR-009**: Advisor_Discovery MUST hand off via a Command object to transition to Coach_Prioritization once results are verified.

**Prioritization (Coach)**
- **FR-010**: Coach_Prioritization MUST trigger when new discovery results are added or on a defined schedule (e.g., daily).
- **FR-011**: Coach_Prioritization MUST map scholarships to a step-by-step game plan (active_milestones), prioritizing by ROI—focusing on awards that provide the most Lift relative to the student's financial gap.
- **FR-012**: Coach_Prioritization MUST transition to END or await user interaction (Human-in-the-loop) when complete.

**Concurrency & Long-Running Tasks**
- **FR-013**: System MUST support invocation of discovery workflows that exceed typical request timeout limits (e.g., 10–30 seconds); long-running discovery must run asynchronously and persist progress.

**Security & PII**
- **FR-014**: All financial data at rest MUST be encrypted (e.g., application-level or database-level encryption).
- **FR-015**: System MUST store only calculated SAI and broad income brackets; never raw parent/student SSNs or full tax returns.
- **FR-016**: Coach MUST ask for user confirmation before Advisor uses sensitive financial context for a deep search; without confirmation, Advisor must not use that context.

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
- **financial_profile**: Includes estimated_sai (Number, -1500 to 999999), is_pell_eligible (Boolean), household_income_bracket (Enum). Used for filtering and anonymization in search.
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

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users receive a prioritized scholarship plan within 5 minutes of requesting discovery (end-to-end from trigger to active_milestones available), under normal load.
- **SC-002**: 100% of state transitions are persisted; no state loss on process restart or timeout; graph can resume from last checkpoint.
- **SC-003**: Zero raw financial PII (SSN, full tax data) is ever sent to external search APIs; audits confirm only anonymized brackets are used.
- **SC-004**: When a node fails, users are notified via Coach within 60 seconds; error_log is populated and Safe Recovery completes.
- **SC-005**: 95% of discovery-to-prioritization handoffs complete without requiring manual intervention under normal conditions.
- **SC-006**: Long-running discovery workflows complete successfully regardless of request timeout limits; users see results asynchronously when ready.

## Documentation References

- [LangGraph JS State Management](https://langchain-ai.github.io/langgraphjs/concepts/state/)
- [Persistence with Checkpointers](https://langchain-ai.github.io/langgraphjs/how-tos/persistence/)
- [Multi-Agent Handoffs](https://langchain-ai.github.io/langgraphjs/how-tos/multi-agent-handoffs/)
- [FAFSA 2026-2027 SAI Calculation Guide](https://studentaid.gov/sites/default/files/2026-27-fafsa-form.pdf)
- [FERPA Compliance for EdTech](https://studentprivacy.ed.gov/node/548)
