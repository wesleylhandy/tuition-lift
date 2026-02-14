# AGENTS.md Evaluation: TuitionLift Adaptation

**Source**: Generic Next.js/React/TypeScript agents.md from external repo  
**Target**: TuitionLift constitution + specs (001, 002, 003)  
**Date**: 2026-02-14

---

## Executive Summary

The source agents.md is high-quality but generic. TuitionLift needs a **tailored** version that:

1. Aligns with the constitution (Section 3, 4, 5, 6, 7, 8, 9, 10)
2. Incorporates the Spec-Kit workflow (spec-first, plan-second)
3. Adds LangGraph/agent-specific rules (apps/agent)
4. Replaces generic Next.js patterns with TuitionLift-prescribed ones
5. Removes or simplifies sections that don't apply (e.g., generic Turborepo vs. our specific layout)

---

## Keep (Minor Tweaks)

| Section | Rationale |
|---------|------------|
| **Meta** (tone) | "No filler words, apologies, hedging. Code first." — fits; add Spec-Kit awareness |
| **SOLID** | Universal; constitution implies these via "high standards" |
| **DRY / YAGNI / KISS / Composition / Law of Demeter** | Aligns with constitution Section 6 (simplicity) |
| **Naming** (PascalCase, camelCase, UPPER_SNAKE) | No conflict |
| **TypeScript** (strict, no any, satisfies, discriminated unions) | Constitution Section 9 mandates strict type safety |
| **Comments** (WHY not WHAT, no TODO→tickets) | Good; constitution forbids mock data, similar rigor |
| **Functions** (20 lines, single responsibility, max 3 params) | Reasonable guideline |
| **Accessibility (WCAG 2.1 AA)** | Constitution Section 6 requires it — keep table, ensure 44px targets (spec 001) |
| **Semantic HTML** (button, select, dialog, details) | Reinforces accessibility |
| **Repository Pattern** | Fits @repo/db; constitution FR-001/FR-002 |
| **Error Handling** (throw vs Result, try/catch, Promise.all) | Keep; align with "no floating promises" |
| **Security** (validate, auth, env, rate limit, headers) | Constitution Section 4; keep, add PII scrub rules |
| **API Design** (Zod, status codes, error details dev-only) | Matches constitution (Zod required) |
| **Testing** (behavior not implementation) | Aligns with TDD skill |
| **Anti-Patterns** | Keep list; add TuitionLift-specific ones |
| **Decision Framework** (5 questions) | Keep; add Constitution Check |

---

## Drop

| Section | Reason |
|---------|--------|
| **Generic "Next.js Decision Framework"** (Server vs Client, Data Fetching) | Replace with TuitionLift-prescribed: App Router only, Server Components default, Server Actions per plan |
| **Caching Strategy table** (ISR, Dynamic, On-demand) | Specs don't prescribe caching yet; defer to plan-level |
| **Middleware example** (cookie auth) | We use Supabase auth; patterns differ |
| **State Management table** (Zustand/Jotai, SWR/React Query) | Constitution: LangGraph for agentic; plan 001 uses React Hook Form + Server Actions. Replace with TuitionLift-specific guidance |
| **Styling** (team standard) | Constitution mandates Tailwind + Shadcn — single source |
| **Database** (generic ORM choice) | Constitution: Supabase only, Zod + Supabase types |
| **Infinite Scroll / Multi-Step Forms** | Move to "when needed" — not core to MVP specs |

---

## Replace

| Original | Replacement |
|----------|-------------|
| **"Turborepo Monorepo Guidelines"** | **TuitionLift Monorepo**: apps/web, apps/agent, packages/ (db, ui). Strict deps: packages never import from apps. LangGraph in apps/agent. Reference constitution Section 3 architecture. |
| **"Next.js Decision Framework"** | **App Router + Server-First**: Server Components default; `'use client'` only for interactivity. Server Actions for mutations. No pages/. React 19 (useActionState). Reference plan 001, constitution Section 3. |
| **Generic Data Fetching** | **TuitionLift Data Flow**: Server Components → direct @repo/db; Client → Server Actions or LangGraph API. Agent state in Supabase checkpoints. |
| **"Repository Pattern" example** | Use @repo/db interfaces (Waitlist, Profiles, Scholarships, Applications); exclude Checkpoints (opaque). |
| **Database section** | Supabase + Zod only. RLS on ALL tables. Use Supabase-generated types. Optimistic locking per FR-011 (002). |
| **Security "Validate everything"** | Add: **PII Scrubbing**—no raw student names/addresses to LLM APIs; use placeholders ({{USER_CITY}}). Trust Filter before scholarship inclusion. Reputation Engine 0–100, auto-fail fees. |

---

## Add

| Section | Content |
|---------|---------|
| **Spec-Kit Workflow** | No code without spec + plan. spec.md = functional (no tech); plan.md = technical. Atomic tasks, mark [x] when done. Constitution Section 5. |
| **Constitution Check** | Before Phase 0 and after Phase 1: Mission, Technical Standards, Security/PII, Workflow, UX/UI, Forbidden, Data Integrity, Documentation Protocol. |
| **TuitionLift Architecture** | apps/web (Next.js, user-facing), apps/agent (LangGraph, agentic loops), packages/db (Supabase client, types, Zod schemas), packages/ui (Shadcn). |
| **LangGraph Rules** | All async awaited; error boundaries. Checkpoints in Supabase. Advisor/Coach personas. No PII to external search APIs. Reference LangGraph JS docs. |
| **Trust Filter & Reputation Engine** | .edu/.gov 2× priority. 0–100 score. Auto-fail fees. Dynamic cycle checks (no hardcoded academic years). "Verify with Caution" for &lt;60. |
| **Forbidden Patterns** | Inline styles (Tailwind only). Floating promises. Mock data in production. No pages/ directory. |
| **Documentation Protocol** | Reference official docs for Next.js, Zod, Supabase, LangGraph. Schema validation = Zod; DB types = Supabase-generated. |
| **Dual Persona Protocol** | Professional Advisor (research, verify); Encouraging Coach (execution, motivation). Clear persona boundaries. |

---

## Mapping: Constitution → Agents.md

| Constitution Section | Agents.md Treatment |
|---------------------|---------------------|
| 1. Mission | Meta / Decision Framework |
| 2. Dual Persona | **Add** Persona Protocol |
| 3. Technical Standards | Replace stack sections; mandate Next.js, Tailwind, Shadcn, LangGraph, Supabase |
| 4. Security & PII | Keep Security; **add** PII scrub, Trust Filter, no data brokering |
| 5. Spec-Kit SDD | **Add** Spec-Kit Workflow |
| 6. UX/UI | Keep WCAG, Lighthouse 90+; add simplicity over complexity |
| 7. Forbidden | **Add** to Anti-Patterns + dedicated section |
| 8. Data Integrity | **Add** .edu/.gov priority, dynamic cycles |
| 9. Documentation | **Add** Documentation Protocol |
| 10. Reputation Engine | **Add** Trust Scoring rules |

---

## Recommended Structure for TuitionLift AGENTS.md

1. **Meta** — Tone + Spec-Kit + Constitution awareness
2. **Core Principles** — SOLID, DRY, YAGNI, etc. (keep)
3. **TuitionLift Architecture** — Monorepo, apps, packages, LangGraph
4. **Spec-Kit Workflow** — spec-first, plan, atomic tasks
5. **Code Style** — Naming, TypeScript, Comments, Functions (keep, trim)
6. **Technical Standards** — Next.js App Router, Supabase, Zod, Tailwind, Shadcn, LangGraph
7. **Accessibility** — WCAG 2.1 AA (keep table)
8. **LangGraph & Agent Rules** — Checkpoints, personas, PII, error handling
9. **Security & PII** — Validate, auth, PII scrub, Trust Filter, Reputation Engine
10. **Database** — @repo/db, Supabase, RLS, Zod validation
11. **API Design** — Keep, align with Server Actions
12. **Error Handling** — Keep; add no floating promises
13. **Testing** — Keep (behavior, not implementation)
14. **Anti-Patterns** — Keep + TuitionLift forbidden
15. **Decision Framework** — Keep + Constitution Check

---

## Effort Estimate

| Task | Effort |
|------|--------|
| Create tailored AGENTS.md | ~1 hour |
| Review against constitution | 15 min |
| Sync with plans when specs change | Ongoing |
