# Implementation Plan: TuitionLift Landing Page and Marketing UI

**Branch**: `011-landing-marketing-ui` | **Date**: 2026-02-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/011-landing-marketing-ui/spec.md`

## Summary

Deliver a high-converting landing page with Premium Academic brand (dark navy gradient, electric mint accents), hero section with email capture, stats bar, testimonial grid, feature bento grid, CTA section, and footer. Hero form routes directly to Auth (sign-up via /onboard). Stats and testimonials fetched from Supabase; new `landing_stats` and `testimonials` tables. Design tokens and fonts from 010-bento-shell-design-system. Privacy, Terms, Contact pages created as in-app routes.

## Technical Context

**Language/Version**: TypeScript 5.x, Node 20+  
**Primary Dependencies**: Next.js 16 (App Router), React 19, Tailwind CSS v4, lucide-react, @supabase/ssr  
**Storage**: Supabase (PostgreSQL) — new tables: `landing_stats`, `testimonials`  
**Testing**: Lighthouse (90+ Performance, Best Practices); axe-core for a11y; viewport checks 375px–1440px  
**Target Platform**: Web (Vercel)  
**Project Type**: Turborepo monorepo (apps/web, packages/database)  
**Performance Goals**: Content visible within 3s; Lighthouse 90+; no horizontal overflow  
**Constraints**: WCAG 2.1 AA; 44×44px touch targets; reduced-motion support; no mock data in production  
**Scale/Scope**: Single landing page; 6 sections; 2 new DB tables; 3 new static pages (privacy, terms, contact)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify alignment with `.specify/memory/constitution.md`:

- **Mission & scope:** Landing page captures leads and routes to Auth; supports lead generation for "Search → Verify → Apply" funnel. Core-loop entry point; no deviation.
- **Technical standards:** Next.js App Router, React 19, Tailwind + Shadcn/ui. Supabase with RLS on new tables. No agent logic in landing; secrets in Server Actions. Code in `apps/web`, schema in `packages/database` per monorepo layout.
- **Security & PII:** Email validation at boundaries; no PII to third-party APIs. Testimonials use display names only (e.g., "Sarah M."); no data brokering.
- **Workflow:** Spec and plan exist; tasks atomic per Spec-Kit.
- **UX/UI:** WCAG 2.1 AA; Lighthouse 90+; Loading/Empty states for stats and testimonials; no mock data in production.
- **Forbidden:** No inline styles; no mock data; Loading/Empty states required.
- **Data integrity:** N/A for landing (no scholarship listings).
- **Documentation protocol:** References Next.js, Zod, Supabase official docs; App Router only; Zod for form/API validation.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
apps/web/
├── app/
│   ├── page.tsx              # Replace minimal placeholder with full landing
│   ├── privacy/page.tsx      # NEW: Privacy policy
│   ├── terms/page.tsx        # NEW: Terms of service
│   ├── contact/page.tsx      # NEW: Contact
│   └── (onboard)/onboard/
│       └── page.tsx          # Extend: accept ?email= for hero prefill
├── components/
│   └── landing/              # NEW
│       ├── hero-section.tsx
│       ├── landing-header.tsx
│       ├── stats-bar.tsx
│       ├── testimonial-grid.tsx
│       ├── feature-showcase.tsx
│       ├── cta-section.tsx
│       ├── landing-footer.tsx
│       ├── floating-preview-cards.tsx
│       └── debt-lifted-widget.tsx
└── lib/
    └── actions/
        └── landing.ts        # NEW: hero form validation + redirect

packages/database/
├── supabase/migrations/
│   ├── 00000000000032_landing_stats.sql    # NEW
│   └── 00000000000033_testimonials.sql     # NEW
└── src/schema/
    ├── landing-stats.ts      # NEW: Zod schema
    └── testimonials.ts      # NEW: Zod schema
```

**Structure Decision**: Turborepo monorepo. Landing UI in `apps/web`; schema and migrations in `packages/database`. Reuses design tokens from `globals.css` (010). Privacy/Terms/Contact as simple static pages.

## Phase 0: Research

Complete. See [research.md](./research.md).

## Phase 1: Design & Contracts

- **Data model**: [data-model.md](./data-model.md)
- **Contracts**: [contracts/](./contracts/)
- **Quickstart**: [quickstart.md](./quickstart.md)

## Complexity Tracking

> No Constitution violations requiring justification.
