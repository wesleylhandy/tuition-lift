# Implementation Plan: Advisor Discovery Engine

**Branch**: `004-advisor-discovery-engine` | **Date**: 2025-02-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-advisor-discovery-engine/spec.md`

## Summary

Build a LangGraph-powered search and verification system (Advisor persona) that transforms anonymized student profiles into 3–5 distinct search queries, executes deep web searches via Tavily, scores results with a multi-factor trust model (Reputation Engine), verifies cycle eligibility dynamically, and outputs discovery_results to TuitionLiftState. Scout and Verify run as separate LangGraph nodes with checkpoint after Scout. Advisor_Verify receives discovery_run_id from orchestration config and attaches it to each DiscoveryResult for 006 dismissals scoping. Uses Tavily API, LLM for query generation, WHOIS for longevity; rate-limited batches; scholarships upsert by URL; metadata JSONB.

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js)  
**Primary Dependencies**: LangGraph, LangChain, Tavily API, @langchain/langgraph-checkpoint-postgres, @repo/db  
**Storage**: Supabase (PostgreSQL); TuitionLiftState via checkpoints; scholarships table (metadata JSONB, UNIQUE url); no new top-level tables  
**Testing**: Vitest; mock Tavily and WHOIS; integration tests per quickstart  
**Target Platform**: Node.js (Vercel serverless via Inngest); agent runs in apps/agent  
**Project Type**: monorepo (Turborepo)  
**Performance Goals**: Discovery results within 5 minutes (SC-006); configurable rate limit (default 2s between batches)  
**Constraints**: Zero PII to external APIs; .edu/.gov 2× weight; fee-required → trust_score 0; dynamic cycle (no hardcoded years)  
**Scale/Scope**: Advisor_Search + Advisor_Verify nodes; QueryGenerator, TavilyClient, TrustScorer, CycleVerifier, Deduplicator, ScholarshipUpsert; ~8–12 modules

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify alignment with `.specify/memory/constitution.md`:

- **Mission & scope:** Feature supports "Search → Verify → Apply"; Advisor handles search and verification; core-loop work.
- **Technical standards:** LangGraph for agentic flows; agent logic in apps/agent (separate from UI); Supabase for checkpoints and scholarships; deps latest; no HIGH/CRITICAL CVEs; Tavily/LLM keys server-only.
- **Security & PII:** No raw PII to external APIs; anonymized attributes only (GPA, major, SAI brackets); Trust Filter (.edu/.gov 2×, fee check); no data brokering.
- **Workflow:** Spec and plan exist; spec is what, plan is how; tasks atomic.
- **UX/UI:** Advisor output feeds 006 Match Inbox; no direct UI in this feature.
- **Forbidden:** No floating promises; all async awaited; error boundaries.
- **Data integrity:** .edu/.gov weighted 2×; dynamic cycle; past due = "Potentially Expired".
- **Documentation protocol:** LangGraph JS, Zod, Supabase per official docs; LangGraph Checkpoints for persistence.

## Project Structure

### Documentation (this feature)

```text
specs/004-advisor-discovery-engine/
├── plan.md              # This file
├── research.md          # Phase 0 output (9 decisions)
├── data-model.md        # Phase 1 output (DiscoveryResult, scholarships extensions)
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── discovery-internals.md
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
apps/agent/
├── lib/
│   ├── nodes/
│   │   ├── advisor-search.ts    # Scout: query gen, Tavily, dedupe, domains for Live Pulse
│   │   └── advisor-verify.ts   # Trust score, cycle verify, discovery_run_id, persist
│   └── discovery/
│       ├── query-generator.ts  # LLM → 3–5 queries (AnonymizedProfile)
│       ├── tavily-client.ts    # Tavily API wrapper
│       ├── trust-scorer.ts     # Reputation Engine (domain, longevity, fee check)
│       ├── cycle-verifier.ts   # Dynamic cycle; deadline vs today
│       ├── deduplicator.ts     # URL dedupe; merge metadata
│       └── scholarship-upsert.ts  # Upsert by URL to scholarships

packages/database/
└── supabase/migrations/
    └── XXXXX_scholarships_metadata_url.sql   # metadata JSONB, UNIQUE(url) partial
```

**Structure Decision**: Option 4 (Turborepo) per Constitution. Advisor logic in apps/agent; shared data layer in packages/database. Orchestration (003) invokes graph; 004 implements Advisor_Search and Advisor_Verify nodes. Migration in packages/database for scholarships extensions.

## Complexity Tracking

No violations. Agent logic correctly separated in apps/agent; checkpointing and state via 003 orchestration.
