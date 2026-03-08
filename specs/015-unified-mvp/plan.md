# Implementation Plan: Unified MVP — Deep-Scout, Data Integrity, and Account Alignment

**Branch**: `015-unified-mvp` | **Date**: 2025-03-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/015-unified-mvp/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Unify TuitionLift's MVP by: (1) fixing scholarship identity propagation through discovery-to-dashboard so Track/Dismiss target correct records; (2) generating Coach's Take on every match card; (3) passing through categories and verification_status without consumer bugs; (4) extending Advisor deep-scout to extract individual scholarships from aggregation/institutional pages (bounded depth); (5) adding college list status (Applied, Accepted, Committed) and Coach commitment logic; (6) aligning Debt Lifted header with Won applications; (7) implementing User Account modal for profile/institution edits; (8) manual discovery trigger from dashboard; (9) protected routes with profile-completeness redirect (award_year, major, state, GPA required). Merit-first mode, discovery rate limits, and verification badges complete the scope.

## Technical Context

**Language/Version**: TypeScript 5.9, Node ≥18  
**Primary Dependencies**: Next.js 16, React 19, LangGraph 1.1, Supabase, Zod 3.24, Tailwind CSS 4, Shadcn/ui  
**Storage**: Supabase (PostgreSQL); RLS on all tables  
**Testing**: Playwright (E2E), Vitest patterns, verify scripts for agent flows  
**Target Platform**: Vercel (apps/web, apps/agent); Linux serverless  
**Project Type**: Turborepo monorepo (web + agent + packages)  
**Performance Goals**: Lighthouse 90+ Performance and Best Practices; discovery bounded by configurable limits  
**Constraints**: No hardcoded academic years; dynamic cycle checks; PII scrubbing for LLMs; configurable rate limits  
**Scale/Scope**: Extends profiles, applications, scholarships, institutions; new config tables; deep-scout sub-graph

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify alignment with `.specify/memory/constitution.md`:

- **Mission & scope:** Feature supports "Search → Verify → Apply" and does not defer core-loop work without justification.
- **Technical standards:** Plan uses Next.js latest (App Router), React latest, Tailwind + Shadcn/ui, LangGraph for agentic flows, Supabase with RLS; all deps latest; no HIGH/CRITICAL CVEs; agent logic separate from UI; secrets in Server Components/Actions with `server-only`. Monorepo layout: code in `apps/web`, `apps/agent`, or `packages/*` per constitution; each app deployed as separate Vercel project.
- **Security & PII:** No raw PII to third-party LLMs; placeholders (e.g. `{{USER_CITY}}`) for Professional Advisor search; Trust Filter (domain check + dynamic due-date verification by current academic year) for scholarships; no data brokering.
- **Workflow:** Spec and plan exist; spec is what, plan is how; tasks are atomic and marked done when verified.
- **UX/UI:** MVP scope only; WCAG 2.1 AA (keyboard, mouse, touch, screen reader per constitution §6); Lighthouse 90+ Performance and Best Practices.
- **Forbidden:** No inline styles; no floating promises in LangGraph; no mock data in production; Loading/Empty states handled.
- **Data integrity:** .edu/.gov weighted 2× over .org; dynamic cycle checks—due dates after today = Active, past due dates = "Potentially Expired"; no hardcoded academic years.
- **Documentation protocol:** Plan references official docs for Next.js, Zod, Supabase, LangGraph JS; App Router only (no `pages/`); Zod for schemas, Supabase types for DB; LangGraph Checkpoints for agent persistence.

**Result**: PASS

## Project Structure

### Documentation (this feature)

```text
specs/015-unified-mvp/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
apps/
├── web/                 # Next.js; dashboard, account modal, discovery trigger, protected routes
│   ├── app/
│   ├── components/
│   └── lib/actions/
├── agent/               # LangGraph; deep-scout, Coach's Take, Coach commitment logic
│   └── lib/
│       ├── discovery/
│       ├── scout/
│       ├── nodes/
│       └── coach/
packages/
├── database/            # @repo/db; migrations, schema, config-queries
│   ├── supabase/migrations/
│   └── src/
└── ui/                  # Shadcn/ui components
```

**Structure Decision**: Turborepo monorepo per Constitution §3. Web handles dashboard UI, account modal, discovery trigger; agent handles deep-scout extraction, Coach's Take generation, commitment-prioritization; packages/database owns schema and discovery/rate-limit config.

## Complexity Tracking

No Constitution violations requiring justification.
