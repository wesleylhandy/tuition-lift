# Data Model: System Orchestration & State Graph

**Branch**: `003-langgraph-orchestration` | **Date**: 2025-02-13  
**Spec**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

## Overview

This feature introduces **TuitionLiftState**—the central LangGraph state schema persisted via checkpoints. It does not add new domain tables to the database; it defines the graph state structure, derived entities, and how they map to existing `@repo/db` tables (profiles, scholarships, checkpoints). One net-new table is recommended for completion notifications.

---

## 1. TuitionLiftState (LangGraph Annotation.Root)

The shared orchestration state. Serialized into checkpoints by LangGraph. All fields use appropriate reducers.

| Field                 | Type                    | Reducer   | Source / Notes                                      |
|-----------------------|-------------------------|-----------|------------------------------------------------------|
| user_profile          | UserProfile             | overwrite | From `profiles` table; GPA, major, state             |
| discovery_results     | DiscoveryResult[]      | overwrite | From Advisor search + verification                   |
| active_milestones    | ActiveMilestone[]      | overwrite | From Coach prioritization; ROI-ordered              |
| messages             | BaseMessage[]          | append    | LangChain message history; cross-agent comms        |
| last_active_node      | string                 | overwrite | "Advisor_Search" \| "Advisor_Verify" \| "Coach_Prioritization" \| "SafeRecovery" |
| financial_profile     | FinancialProfile       | overwrite | Derived from profiles + SAI; anonymized for search   |
| error_log             | ErrorLogEntry[]        | append    | Populated on node failure                           |

---

## 2. UserProfile (Embedded)

| Field        | Type    | Notes                                           |
|-------------|---------|-------------------------------------------------|
| id          | uuid    | auth.users.id / profiles.id                     |
| gpa         | number  | 0–4.00; from profiles.gpa                      |
| major       | string  | profiles.intended_major                         |
| state       | string  | US state code; profiles.state                   |

**Source**: `profiles` table. Loaded when thread starts or onboarding completes.

---

## 3. FinancialProfile (Embedded)

| Field                    | Type    | Range / Notes                                      |
|--------------------------|---------|----------------------------------------------------|
| estimated_sai            | number  | -1500 to 999999; from profiles.sai                |
| is_pell_eligible         | boolean | Derived from profiles.pell_eligibility_status      |
| household_income_bracket | enum    | Low \| Moderate \| Middle \| Upper-Middle \| High |

**Source**: Derived from `profiles`. `household_income_bracket` computed from SAI at read time; NOT stored in profiles (002 FR-014a). Use federal tiers (Low / Moderate / Middle / Upper-Middle / High).

**Anonymization for search**: Map to strings: "Low Income", "Pell Eligible", etc. Never send raw SAI unless HITL confirmed.

---

## 4. DiscoveryResult (Embedded)

| Field             | Type   | Notes                                          |
|-------------------|--------|------------------------------------------------|
| id                | string | Unique per result                              |
| discovery_run_id  | uuid   | Per-run identifier; passed to 006 for dismissals scoping |
| title             | string | Scholarship title                              |
| url               | string | source_url                                     |
| trust_score       | number | 0–100; Reputation Engine (Constitution §10)     |
| need_match_score  | number | 0–100; match vs financial_profile               |

**Source**: Advisor_Verify node; scored per Trust Filter and need criteria. discovery_run_id from orchestration run; same value in discovery_completions for that run.

---

## 5. ActiveMilestone (Embedded)

| Field          | Type   | Notes                                  |
|----------------|--------|----------------------------------------|
| id             | string | Unique per milestone                    |
| scholarship_id | uuid   | FK to scholarships                     |
| title          | string | Human-readable task                    |
| priority       | number | ROI-based order                        |
| status         | string | e.g., pending \| in_progress \| done  |

**Source**: Coach_Prioritization node.

---

## 6. ErrorLogEntry (Embedded)

| Field     | Type   | Notes                    |
|-----------|--------|--------------------------|
| node      | string | Failed node name         |
| message   | string | Error message            |
| timestamp | string | ISO timestamp            |

**Source**: Populated when a node throws; routed to SafeRecovery.

---

## 7. Graph Node Names (Canonical)

| Node                 | Role   | Trigger                                      |
|----------------------|--------|----------------------------------------------|
| Advisor_Search       | Advisor| Onboarding complete, "New Search"; web search only |
| Advisor_Verify       | Advisor| After Advisor_Search; scores, Trust Filter; returns Command |
| Coach_Prioritization| Coach  | New discovery_results, cron (daily)          |
| SafeRecovery        | Coach  | On any node failure                          |

---

## 8. Thread / Run Identity

| Concept    | Storage                      | Notes                                      |
|------------|-----------------------------|--------------------------------------------|
| thread_id  | LangGraph configurable       | Maps to user session; e.g. `user_${userId}` |
| checkpoint | checkpoints table (002)      | Opaque; LangGraph PostgresSaver            |

---

## 9. New Table: discovery_completions (Optional)

For notification delivery (bell/toaster) when discovery completes. Includes discovery_run_id for 006 dismissals scoping.

| Field             | Type        | Constraints                    | Notes                        |
|-------------------|-------------|--------------------------------|------------------------------|
| id                | uuid        | PK                             |                              |
| discovery_run_id   | uuid       | NOT NULL, UNIQUE               | Per-run identifier; exposed to 006 for dismissals scoping |
| user_id           | uuid        | NOT NULL, FK auth.users        |                              |
| thread_id         | text        | NOT NULL                       | Matches LangGraph thread_id  |
| status            | text        | NOT NULL                       | running \| completed \| failed |
| completed_at      | timestamptz | nullable                       | Set when status=completed    |
| created_at        | timestamptz | NOT NULL, default now()        |                              |

**Purpose**: Frontend polls or Supabase Realtime subscribes; when `status=completed`, show notification. discovery_run_id exposed to 006 for dismissals scoping (soft dismiss per run).

**RLS**: User can read only own rows (user_id = auth.uid()).

---

## 10. Mapping to Existing Tables

| TuitionLiftState Field | DB Source                              |
|------------------------|----------------------------------------|
| user_profile           | profiles (id, gpa, intended_major, state)|
| financial_profile      | profiles (sai, pell_eligibility_status); household_income_bracket computed from SAI at read (not stored; 002 FR-014a) |
| discovery_results      | In-memory; scholarships table for canonical records |
| Checkpoints            | checkpoints (002) via PostgresSaver     |

---

## 11. Zod Schemas (Validation)

Define Zod schemas for:

- `FinancialProfileSchema` — estimated_sai (-1500..999999), is_pell_eligible, household_income_bracket enum
- `UserProfileSchema` — gpa, major, state
- `DiscoveryResultSchema` — discovery_run_id (uuid), trust_score 0–100, need_match_score 0–100
- `ActiveMilestoneSchema` — priority, status

Use for validation before writing to state or external APIs.
