# Implementation Plan: Advisor Discovery Engine

**Branch**: `004-advisor-discovery-engine` | **Date**: 2025-02-13 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/004-advisor-discovery-engine/spec.md`

## Summary

Implement the Advisor Discovery Engine—the internal logic for Advisor_Search (Scout) and Advisor_Verify nodes. Transform student profile into 3–5 anonymized queries via LLM; execute deep web searches via Tavily; deduplicate, verify cycle eligibility, and score with the Reputation Engine; persist to scholarships table with metadata. Checkpoint after Scout; rate-limit batches. Aligns with TuitionLiftState and Orchestration spec (003).

## Technical Context

**Language/Version**: TypeScript 5.x (Node 18+)  
**Primary Dependencies**: LangGraph JS, @langchain/langgraph-checkpoint-postgres, Tavily API client (or fetch), Zod, Supabase (@supabase/supabase-js)  
**Storage**: Supabase (PostgreSQL)—checkpoints, scholarships (with metadata JSONB), profiles  
**Testing**: Vitest for unit; integration tests for Tavily/WHOIS mocks  
**Target Platform**: Vercel (apps/agent); invoked via Inngest from apps/web  
**Project Type**: Turborepo monorepo (agent + web)  
**Performance Goals**: Discovery end-to-end ≤ 5 min; 3–5 queries × rate limit; SC-006  
**Constraints**: Checkpoint after Scout; configurable 2s batch delay; no PII to external APIs  
**Scale/Scope**: Single-user sequential; multi-query batches; scholarships upsert by URL

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Mission & scope:** ✓ Supports "Search → Verify → Apply"; Discovery (Advisor) is core loop; no core work deferred.
- **Technical standards:** ✓ LangGraph for agentic search/verify; Supabase with RLS; agent logic in apps/agent; secrets server-only (TAVILY_API_KEY, etc.).
- **Security & PII:** ✓ FR-002: name and SSN scrubbed; FR-003: broad brackets only; Trust Filter; no data brokering.
- **Workflow:** ✓ Spec and plan exist; tasks will be atomic.
- **UX/UI:** ✓ Backend feature; discovery results surfaced via 003 API; Trust Report in payload.
- **Forbidden:** ✓ No inline styles; no floating promises (await all Tavily/DB calls); no mock data in production.
- **Data integrity:** ✓ .edu/.gov weighted 2×; dynamic cycle checks; Reputation Engine auto-fail fees.
- **Documentation protocol:** ✓ References Tavily, LangGraph, Zod, Supabase; Checkpoints per 003.

## Project Structure

### Documentation (this feature)

```text
specs/004-advisor-discovery-engine/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── discovery-internals.md
└── tasks.md             # Phase 2 (speckit.tasks)
```

### Source Code (repository root)

```text
apps/
├── web/                 # Next.js (003 API routes; Inngest)
├── agent/               # LangGraph agent
│   └── lib/
│       ├── graph.ts
│       ├── state.ts
│       ├── checkpointer.ts
│       └── nodes/
│           ├── advisor-search.ts    # Scout: query gen + Tavily + dedupe
│           ├── advisor-verify.ts    # Trust score + cycle verify + persist
│           ├── coach-prioritization.ts
│           └── safe-recovery.ts
│       └── discovery/               # 004-specific modules
│           ├── query-generator.ts   # LLM → 3–5 queries from profile
│           ├── tavily-client.ts     # Tavily Search API wrapper
│           ├── trust-scorer.ts      # Reputation Engine (domain, longevity, fee)
│           ├── cycle-verifier.ts    # Dynamic 2026/2027 deadline check
│           ├── deduplicator.ts      # URL dedupe + merge
│           └── scholarship-upsert.ts # Upsert to scholarships
packages/
├── database/            # @repo/db; migrations for metadata, UNIQUE(url)
```

**Structure Decision**: Discovery logic lives in `apps/agent/lib/discovery/`; nodes orchestrate. Query generator uses LLM; Tavily client is a thin fetch wrapper; trust scorer and cycle verifier are pure functions. Scholarship upsert uses Supabase client from packages/database.

## Phase 0: Research (Complete)

See [research.md](./research.md). Decisions: Tavily API, LLM query generation, WHOIS for longevity, PostgresSaver with Supabase, configurable rate limit, metadata JSONB + multi-category in metadata, manual review = status flag only.

## Phase 1: Design Artifacts

- [data-model.md](./data-model.md) — DiscoveryResult schema, scholarships metadata, migrations
- [contracts/discovery-internals.md](./contracts/discovery-internals.md) — Internal interfaces
- [quickstart.md](./quickstart.md) — Developer setup

## Complexity Tracking

No Constitution violations requiring justification.

## Prerequisites

**004 cannot begin Phase 2 user story work until:**
- **002-db-core-infrastructure**: packages/database exists; scholarships table and migrations in place.
- **003-langgraph-orchestration**: apps/agent exists with graph.ts, state.ts, checkpointer.ts, and node stubs.

## Dependencies

| Dependency | Purpose |
|------------|---------|
| 002-db-core-infrastructure | Scholarships schema; profiles (SAI); migration for metadata, UNIQUE(url) |
| 003-langgraph-orchestration | TuitionLiftState; graph topology; Advisor_Search/Advisor_Verify nodes; Inngest |

## Implementation Notes

- **PII scrub**: Before any external call (LLM, Tavily), assert `user_profile` and `financial_profile` contain no `full_name` or SSN; use anonymized view only.
- **Academic year**: Compute from `new Date()`; e.g. current month >= 7 → "2026-2027", else "2025-2026". Use for cycle verification (FR-006).
- **Trust tiers**: .edu/.gov → 80–100; vetted .com/.org → 60–79; below 60 → "Verify with Caution". Fee required → 0, exclude.
- **Manual review**: Set `metadata.verification_status = "needs_manual_review"` when deadline ambiguous; no UI.
- **SAI gap threshold**: When SAI is outside a scholarship's eligibility range by more than ±2000 (or range not specified), deprioritize or exclude from active results. Exact threshold configurable in need-match-scorer.
