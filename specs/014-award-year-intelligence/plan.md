# Implementation Plan: User-Specific Award Year Logic and Intelligence Persistence

**Branch**: `014-award-year-intelligence` | **Date**: 2025-03-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/014-award-year-intelligence/spec.md`

## Summary

Make the user's target award year the primary driver for all search, organization, and application logic—replacing system-clock-derived academic years. Persist need-match scores when users track scholarships from discovery. Extend the discovery engine to query existing high-trust scholarships (trust_score ≥ 60) before external search, add cycle-aware verification via a new `scholarship_cycle_verifications` table, and ensure the Coach surfaces alternative-path ROI comparisons for Squeezed Middle students when data exists (omit otherwise). Require Target Award Year selection as the first onboarding step, with range current year through 4 years ahead. Merit-first SAI threshold stored in Supabase config table.

**Discovery Criteria Expansion (C1)**: Extend Advisor query generation to include state (local/regional), saved institutions (user_saved_schools), first-generation status, parent employer, and optional identity-based eligibility—all as anonymized attributes per Constitution §4. State is already in AnonymizedProfile; load saved institutions and extended profile fields for query generation when available.

## Technical Context

**Language/Version**: TypeScript 5.9, Node ≥18  
**Primary Dependencies**: Next.js 16, React 19, LangGraph 1.1, Supabase, Zod 3.24  
**Storage**: Supabase (PostgreSQL); RLS on all tables  
**Testing**: Vitest/Playwright patterns; verify scripts for agent flows  
**Target Platform**: Vercel (apps/web, apps/agent); Linux serverless  
**Project Type**: Turborepo monorepo (web + agent + packages)  
**Performance Goals**: Lighthouse 90+; discovery DB-first reduces external API latency  
**Constraints**: No hardcoded academic years; dynamic cycle checks per Constitution §8  
**Scale/Scope**: Extends existing profiles, applications, scholarships; new config + cycle verification tables

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Mission & scope:** Feature supports "Search → Verify → Apply" by making award year the primary driver; DB-first discovery and cycle verification improve Trust Filter accuracy.
- **Technical standards:** Plan uses Next.js App Router, React 19, Tailwind + Shadcn/ui, LangGraph, Supabase with RLS; agent logic in apps/agent; secrets server-side.
- **Security & PII:** No raw PII to LLMs; Trust Filter and dynamic cycle checks preserved; no data brokering. Discovery criteria expansion uses state code, institution names, broad category labels only—never raw race, religion, creed.
- **Workflow:** Spec and plan exist; tasks will be atomic.
- **UX/UI:** Award year selector WCAG 2.1 AA; 44px touch targets; Loading/Empty states.
- **Forbidden:** No inline styles; no floating promises; no mock data in production.
- **Data integrity:** .edu/.gov 2×; dynamic cycle checks; no hardcoded academic years; past deadlines flagged for re-verification.
- **Documentation protocol:** Zod for schemas; Supabase types; LangGraph checkpoints.

**Result**: PASS

## Project Structure

### Documentation (this feature)

```text
specs/014-award-year-intelligence/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/           # Phase 1
└── tasks.md             # Phase 2 (/speckit.tasks)
```

### Source Code (repository root)

```text
apps/
├── web/                 # Next.js; onboarding, dashboard, Server Actions
│   ├── app/
│   ├── components/onboard/
│   └── lib/actions/
├── agent/               # LangGraph; discovery, Coach, load-profile
│   └── lib/
│       ├── discovery/
│       ├── nodes/
│       └── coach/
packages/
├── database/            # @repo/db; migrations, schema, config-queries
│   ├── supabase/migrations/
│   └── src/
```

**Structure Decision**: Turborepo monorepo per Constitution §3. Web handles onboarding UI and Server Actions; agent handles discovery/Coach logic; packages/database owns schema and config.

## Complexity Tracking

No Constitution violations requiring justification.
