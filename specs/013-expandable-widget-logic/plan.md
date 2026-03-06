# Implementation Plan: Expandable Widget Logic and State

**Branch**: `013-expandable-widget-logic` | **Date**: 2025-03-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/013-expandable-widget-logic/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Extend the TuitionLift dashboard (spec 010) with progressive disclosure: every bento widget supports Dashboard (compact) and Expanded (full-viewport) views. A reusable `ExpandableWidget` abstraction provides expand/close controls, URL sync via `?view=<widgetId>`, and smooth transitions. Three widgets—Today's Game Plan (Kanban + Coach's Huddle), Discovery Feed (Scholarship Repository with filters), Deadline Calendar (12-month Severity Heatmap)—each supply Dashboard and Expanded content. Match Cards display Trust Shield, Match Strength bar, and Coach's Take. Kanban supports drag-and-drop and keyboard reordering with persisted state. All controls meet WCAG 2.1 AA; Escape closes expanded view.

## Technical Context

**Language/Version**: TypeScript 5.9, Node ≥18  
**Primary Dependencies**: Next.js 16 (App Router), React 19, Tailwind CSS 4, Shadcn/ui, Framer Motion 12, @dnd-kit/core (Kanban DnD)  
**Storage**: Supabase (existing); view state in URL only; task status persisted via existing Application/Coach APIs  
**Testing**: Vitest (unit), Playwright (E2E for expand/collapse, URL sync, back-button)  
**Target Platform**: Web (375px–1280px+), Vercel  
**Project Type**: Turborepo monorepo (apps/web, apps/agent, packages/db, packages/ui)  
**Performance Goals**: Expanded view within 1s of expand action (SC-001); Lighthouse 90+ Performance/Best Practices  
**Constraints**: Full-viewport overlay on all screen sizes; no horizontal overflow; 44×44px touch targets  
**Scale/Scope**: 3 bento widgets initially; abstraction supports future widgets without schema changes

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

## Project Structure

### Documentation (this feature)

```text
specs/013-expandable-widget-logic/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
apps/
├── web/                    # Next.js user-facing app (Vercel)
│   ├── app/(auth)/dashboard/
│   │   └── page.tsx        # Dashboard page (wraps bento grid)
│   ├── components/dashboard/
│   │   ├── expandable-widget/     # NEW: reusable wrapper
│   │   │   ├── expandable-widget.tsx
│   │   │   └── expandable-widget-context.tsx
│   │   ├── game-plan/            # Kanban + Coach's Huddle
│   │   │   ├── kanban-board.tsx
│   │   │   ├── coaches-huddle.tsx
│   │   │   └── top-three-tasks.tsx (existing)
│   │   ├── match-inbox/          # Match Card + Match Strength
│   │   │   ├── match-card.tsx (existing, extend)
│   │   │   ├── match-strength-bar.tsx (NEW)
│   │   │   └── scholarship-repository.tsx (NEW)
│   │   ├── deadline-calendar/
│   │   │   ├── deadline-calendar-shell.tsx (existing, may move)
│   │   │   └── severity-heatmap.tsx (NEW)
│   │   ├── bento-grid.tsx
│   │   └── section-shell.tsx
│   └── lib/
│       └── hooks/
│           └── use-view-param.ts  # URL view param sync
├── agent/                  # LangGraph agent service (Vercel)
packages/
├── db/                     # Supabase client, types, schema
└── ui/                     # Shadcn/ui components
```

**Structure Decision**: Turborepo monorepo per constitution §3. All expandable widget logic lives in `apps/web/components/dashboard/`. No new packages; @dnd-kit/core added to apps/web for Kanban DnD.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
