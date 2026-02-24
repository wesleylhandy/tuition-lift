# Implementation Plan: Unified Manual Scout & Vision Ingestion

**Branch**: `007-scout-vision-ingestion` | **Date**: 2025-02-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-scout-vision-ingestion/spec.md`

**Note**: User request: "Some of this feature on the UI side will be amended or extended so plan should ensure design utilizes best coding practices for future enhancement." Design emphasizes composition, compound components, schema-driven forms, and slot-based extensibility.

## Summary

Build a unified "Add Scholarship" Scout interface where users ingest scholarship data via URL, name, or file (PDF/PNG/JPG). The Professional Advisor extracts data (Vision LLM for images/scanned PDFs; pdf-parse for digital PDFs), verifies URLs for cycle freshness, calculates Trust Score, and pre-fills a verification form. User confirms before persistence to `scholarships` and `applications`. UI uses composition and compound components for future enhancement. Agent: new Scout subgraph or `manual_research_node`; reuses TrustScorer, CycleVerifier from 004. Storage: Supabase `scout_uploads` bucket; optional `scout_runs` table for status polling.

## Technical Context

**Language/Version**: TypeScript 5.x  
**Primary Dependencies**: Next.js (App Router), React 19, LangGraph, LangChain, OpenAI (GPT-4o), pdf-parse, fuzzball, Supabase  
**Storage**: Supabase (PostgreSQL + Storage); `scout_uploads` bucket; optional `scout_runs` table  
**Testing**: Vitest (unit); Playwright/manual (Scout flow)  
**Target Platform**: Web (Vercel); agent in apps/agent  
**Project Type**: Turborepo monorepo  
**Performance Goals**: URL/name verification <30s (SC-001); file extraction <60s (SC-002); 95% extraction success (SC-003)  
**Constraints**: WCAG 2.1 AA; Lighthouse 90+; 10 MB max file; no PII to LLMs  
**Scale/Scope**: 1 Scout modal; ~8–12 UI components; 1 Scout subgraph; 2–4 agent modules

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify alignment with `.specify/memory/constitution.md`:

- **Mission & scope:** Scout extends "Search → Verify → Apply" with manual ingestion; enables students to add scholarships from flyers/screenshots; core-loop extension.
- **Technical standards:** Next.js App Router, React 19, Tailwind + Shadcn/ui; LangGraph for Scout extraction/verification; Supabase Storage + DB; agent logic in apps/agent; UI in apps/web; secrets server-only. Monorepo layout respected.
- **Security & PII:** No raw PII to Vision LLM; document content only (scholarship text); Trust Filter applied via TrustScorer; no data brokering.
- **Workflow:** Spec and plan exist; tasks atomic.
- **UX/UI:** MVP scope; WCAG 2.1 AA; composition patterns for future enhancement; Loading/Empty states (processing HUD, verification form).
- **Forbidden:** No inline styles; no floating promises; no mock data; skeletons/HUD for loading.
- **Data integrity:** TrustScorer (.edu/.gov 2×); CycleVerifier (dynamic due dates); past due = "Potentially Expired"; no hardcoded years.
- **Documentation protocol:** Official docs for Next.js, Zod, Supabase, LangGraph JS; App Router only; Zod for Scout schemas.

## Project Structure

### Documentation (this feature)

```text
specs/007-scout-vision-ingestion/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md       # Phase 1 output
├── quickstart.md       # Phase 1 output
├── contracts/          # Phase 1 output
│   ├── scout-api.md
│   ├── scout-server-actions.md
│   └── scout-ui-components.md
├── checklists/
│   └── requirements.md
└── tasks.md            # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
apps/web/
├── app/
│   └── api/
│       └── scout/
│           ├── process/
│           │   └── route.ts      # POST start Scout run
│           └── status/
│               └── [runId]/
│                   └── route.ts  # GET poll status
├── components/
│   └── dashboard/
│       └── scout/               # Composable Scout UI
│           ├── scout-modal.tsx
│           ├── scout-entry-point.tsx
│           ├── scout-input-field.tsx
│           ├── scout-drop-zone.tsx
│           ├── scout-processing-hud.tsx
│           ├── scout-verification-form.tsx
│           └── scout-field.tsx
└── lib/
    └── actions/
        └── scout.ts             # uploadScoutFile, confirmScoutScholarship, startScoutProcess

apps/agent/
├── lib/
│   ├── scout/
│   │   ├── extract-vision.ts    # Vision LLM extraction
│   │   ├── extract-pdf.ts       # pdf-parse for digital PDFs
│   │   └── fuzzy-dedup.ts       # fuzzball title matching
│   ├── nodes/
│   │   └── manual-research.ts   # Scout extraction + verify node
│   └── graph.ts                 # (optional) Scout subgraph

packages/database/
└── supabase/
    └── migrations/
        └── XXXXX_scout_runs.sql   # Optional scout_runs table
```

**Structure Decision**: Option 4 (Turborepo) per Constitution. Scout UI in `apps/web/components/dashboard/scout/` with composition pattern. Agent logic in `apps/agent`; Scout runs as invokable flow via API. Storage bucket created via Supabase Dashboard or migration.

## UI Extensibility Guidelines

Per user request, implement for future enhancement:

1. **Compound components**: `ScoutModal` composes `ScoutEntryPoint`, `ScoutProcessingHUD`, `ScoutVerificationForm`. Each is self-contained; parent controls flow.
2. **Schema-driven fields**: Verification form fields from `ExtractedScholarshipData`; add fields via schema, not component edits.
3. **Slot composition**: Use `children` for future steps (e.g., "Add to Game Plan" CTA).
4. **Render props / context**: `ScoutFlowContext` for step, message, persona—consumers extend without prop drilling.
5. **Separate presentational components**: `ScoutField` is dumb; `ScoutVerificationForm` maps data to fields.
6. **Contracts in specs**: [scout-ui-components.md](./contracts/scout-ui-components.md) defines props; implementations follow for consistency.

## Complexity Tracking

No violations. Scout is additive; reuses 004 TrustScorer and CycleVerifier.
