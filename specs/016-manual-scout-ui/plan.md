# Implementation Plan: Manual Scout Flyer-to-Fact UI and Dashboard Integration

**Branch**: `016-manual-scout-ui` | **Date**: 2025-03-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/016-manual-scout-ui/spec.md`

**Note**: Backend from spec 007-scout-vision-ingestion is complete. This plan extends/refines the Scout UI to match spec 016 requirements: input selection cards, side-by-side verification with document preview, FAB entry, processing timeout, responsive modal, and rate limiting.

## Summary

Refine the Manual Scout UI to provide a premium Flyer-to-Fact workspace: (1) prominent FAB in dashboard bottom-right; (2) three-card input selection (Paste URL, Upload PDF, Snap Photo); (3) side-by-side verification layout (document preview left, form right); (4) processing overlay with 30s cancel and 60s timeout; (5) responsive modal (full-screen on ≤640px); (6) per-user rate limit (10–20 submissions/cycle); (7) scholarship `source` column (`manual` on Scout confirm); (8) duplicate prevention (007: URL upsert + fuzzy title match). Reuses 007 backend (POST /api/scout/process, GET /api/scout/status/:runId, confirmScoutScholarship, uploadScoutFile).

## Technical Context

**Language/Version**: TypeScript 5.x  
**Primary Dependencies**: Next.js latest (App Router), React 19, Tailwind CSS, Shadcn/ui, @repo/db  
**Storage**: Supabase (scout_uploads bucket, scout_runs table); rate limit tracking via profiles or new scout_submissions table  
**Testing**: Playwright (E2E), manual verification per quickstart.md  
**Target Platform**: Web (Vercel); apps/web  
**Project Type**: Turborepo monorepo  
**Performance Goals**: Extraction <60s p95; modal opens <200ms; full flow <90s typical  
**Constraints**: WCAG 2.1 AA; 44×44px touch targets; full-screen modal on ≤640px; no mock data  
**Scale/Scope**: ~6–10 UI component changes; 1 rate-limit check; 1 FAB component

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Mission & scope:** Manual Scout extends "Search → Verify → Apply" with flyer-to-fact ingestion; core-loop extension. No deferral.
- **Technical standards:** Next.js App Router, React 19, Tailwind + Shadcn/ui; agent logic in apps/agent (unchanged); UI in apps/web; secrets server-only. Monorepo respected.
- **Security & PII:** No raw PII to extraction APIs; document content only; Trust Filter via 007 backend; no data brokering.
- **Workflow:** Spec and plan exist; spec=what, plan=how; tasks atomic and marked done when verified.
- **UX/UI:** MVP scope; WCAG 2.1 AA (keyboard, touch 44×44px, screen reader); Lighthouse 90+.
- **Forbidden:** No inline styles; no floating promises; no mock data; Loading/Empty states.
- **Data integrity:** Trust Filter and cycle checks from 007 backend; dynamic academic year.
- **Documentation protocol:** Next.js, Zod, Supabase official docs; App Router only; Zod for validation.

## Project Structure

### Documentation (this feature)

```text
specs/016-manual-scout-ui/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── scout-ui-016.md
│   └── scout-rate-limit-api.md
└── tasks.md           # /speckit.tasks output
```

### Source Code (repository root)

```text
apps/web/
├── app/
│   └── (auth)/
│       └── dashboard/
│           └── page.tsx        # Add ScoutFAB; auth-gated layout
├── components/
│   └── dashboard/
│       ├── scout/
│       │   ├── scout-modal.tsx           # Update: title, responsive, side-by-side
│       │   ├── scout-entry-point.tsx     # Replace: three-card input selection
│       │   ├── scout-input-card.tsx      # NEW: Paste URL card
│       │   ├── scout-upload-card.tsx     # NEW: Upload PDF card
│       │   ├── scout-photo-card.tsx      # NEW: Snap Photo card
│       │   ├── scout-verification-view.tsx  # NEW: side-by-side layout
│       │   ├── scout-processing-hud.tsx  # Update: cancel, timeout
│       │   └── scout-fab.tsx             # NEW: floating action button
│       └── ...
└── lib/
    ├── actions/
    │   └── scout.ts           # Update: checkScoutLimit, rate limit in confirmScoutScholarship
    └── hooks/
        └── use-scout-status.ts # Update: cancel, 60s timeout
```

**Structure Decision**: Option 4 (Turborepo). Changes confined to apps/web. Reuse 007 Scout API and agent; add rate-limit API or Server Action.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|-------------|-------------------------------------|
| (none) | — | — |
