# Implementation Plan: TuitionLift Waitlist & Launch System

**Branch**: `001-waitlist-launch` | **Date**: 2026-02-13 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/001-waitlist-launch/spec.md`

## Summary

Build a high-converting landing page for TuitionLift with waitlist signup, viral referral mechanics, and email automation. The page targets High School Seniors/Parents and Graduate School Applicants. Technical approach: Next.js 16 (App Router) + Supabase for persistence + Resend for welcome and unlock emails. Server Actions handle form submission with Zod validation (fail-fast before submit), honeypot/CSRF protection, and configurable rate limiting. Referral links MUST contain a unique identifier for attribution (see data-model). Visual design supports upward-momentum metaphor (abstract rising lines, ascending arrow, or minimalist "lift" icon). LangGraph is not used (pre-launch; no agentic search flow).

## Technical Context

**Language/Version**: TypeScript 5.9, Node 18+  
**Primary Dependencies**: Next.js 16, React 19, Tailwind CSS, Shadcn/ui, Framer Motion, Zod, Resend, Supabase (JS client)  
**Storage**: Supabase (PostgreSQL) for `waitlist` table; RLS enabled  
**Testing**: Vitest (unit), Playwright (e2e for critical paths); `npm test` / `pnpm test`  
**Target Platform**: Web (responsive; mobile-first)  
**Project Type**: web (monorepo; `apps/web`)  
**Performance Goals**: Page interactive &lt;3s on 3G; form feedback &lt;3s; Lighthouse Performance and Best Practices 90+ each (pre-release, per SC-008)  
**Constraints**: WCAG 2.1 AA; min 44px tap targets; no PII in browser console, user-facing errors, or client-side logs; fail-fast validation before submit; retry UX ("Please try again") only for server errors  
**Scale/Scope**: MVP waitlist; ~10k signups capacity for launch campaign

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **Mission & scope** | OK | Pre-launch feature; enables user acquisition for future Search→Verify→Apply. Deferred per Section 6 (not core loop yet). |
| **Technical standards** | OK | Next.js 16, React 19, Tailwind, Shadcn/ui, Supabase, Zod. LangGraph N/A (no agentic flow). |
| **Security & PII** | OK | No raw PII to LLMs; no scholarship Trust Filter (N/A). No data brokering. |
| **Workflow** | OK | Spec + plan exist; tasks will be atomic. |
| **UX/UI** | OK | MVP scope; WCAG 2.1 AA; Lighthouse 90+ for landing. |
| **Forbidden** | OK | Tailwind only; no floating promises (no LangGraph); Loading/Empty states. |
| **Data integrity** | N/A | Trust Filter / Reputation Engine apply to scholarship discovery (future feature). |
| **Documentation protocol** | OK | Plan references Next.js, Zod, Supabase, Resend docs. App Router only. |

*Post-Phase 1 re-check: data-model, contracts, quickstart align with Constitution.*  
*Post-clarification (2026-02-13): Plan updated for referral token (data-model), Lighthouse SC-008, fail-fast validation, retry UX, client-side PII, upward-momentum design.*

## Project Structure

### Documentation (this feature)

```text
specs/001-waitlist-launch/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md
```

### Source Code (repository root)

```text
apps/web/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # Landing page
│   ├── actions/
│   │   └── waitlist.ts             # Server Actions: signup, share
│   ├── components/
│   │   ├── hero.tsx
│   │   ├── value-section.tsx
│   │   ├── waitlist-form.tsx
│   │   └── success-state.tsx
│   └── api/                        # Optional: rate-limit check, webhooks
packages/
├── ui/                             # Shadcn/ui components
└── db/                             # Optional: shared Supabase client, types
```

**Structure Decision**: Use existing `apps/web` (Next.js). Add `app/actions/`, `app/components/` for landing and form. Shared `@repo/ui` for primitives; add Tailwind + Shadcn if not present. No separate backend; Server Actions are the API surface.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| (None) | — | — |
