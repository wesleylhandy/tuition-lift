# Implementation Plan: Squeezed Middle & Alternative ROI Engine

**Branch**: `009-squeezed-middle-roi` | **Date**: 2025-02-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/009-squeezed-middle-roi/spec.md`

## Summary

Extend TuitionLift to serve the "Squeezed Middle"—students with SAI above need-based thresholds who lack liquidity. **Merit-first logic**: When SAI exceeds configurable threshold (default 15,000), Advisor prioritizes Merit-Only and Need-Blind scholarships; user toggle selects "Merit only" (filter) or "Show all" (deprioritize). **Intake extensions**: SAT/ACT, Spikes; merit tiers (Top/Strong/Standard) with fixed cutoffs. **Alternative ROI**: Curated institution catalog (College Scorecard + .edu seed), career outcomes (BLS OEWS), Net Price display. **Parent role**: Distinct account, link to student, add income/manual scholarships only; student unlink revokes access. **Agent changes**: Advisor_Verify tags need_blind; Coach_Prioritization boosts merit/need_blind when SAI > threshold; PII scrub extends to spikes.

## Technical Context

**Language/Version**: TypeScript 5.x (Node 18+)
**Primary Dependencies**: Next.js (App Router), React 19, LangGraph JS, Supabase, Zod, Inngest (existing)
**Storage**: Supabase (PostgreSQL) — profiles extensions, app_settings, parent_students, parent_contributions, institutions, career_outcomes; RLS on all new tables
**Testing**: Vitest for unit; existing Inngest/agent verification scripts
**Target Platform**: Vercel (apps/web, apps/agent)
**Project Type**: Turborepo monorepo (existing)
**Performance Goals**: Discovery flow unchanged (≤5 min); ROI comparison <2s; intake with SAT/spikes <5 min
**Constraints**: PII scrubbing on spikes; College Scorecard/BLS API rate limits
**Scale/Scope**: Single-user flows; institution catalog ~1–5k rows; career outcomes ~100+ majors

## Constitution Check

*GATE: Passed before Phase 0. Re-checked after Phase 1 design.*

- **Mission & scope:** ✓ Feature supports "Search → Verify → Apply"; merit-first and ROI comparison extend core loop for Squeezed Middle.
- **Technical standards:** ✓ Next.js App Router, React, Tailwind + Shadcn/ui, LangGraph, Supabase with RLS; agent in apps/agent; secrets server-only. Monorepo layout preserved.
- **Security & PII:** ✓ PII scrubbing extended to spikes (labels only); no raw names/addresses to third-party APIs; parent role restricted; no data brokering.
- **Workflow:** ✓ Spec and plan exist; tasks will be atomic via speckit.tasks.
- **UX/UI:** ✓ MVP scope; WCAG 2.1 AA; Loading/Empty states per existing patterns.
- **Forbidden:** ✓ No inline styles; no floating promises; no mock data in production.
- **Data integrity:** ✓ .edu/.gov weighted 2× (institution seed from .edu); dynamic cycle checks unchanged.
- **Documentation protocol:** ✓ References Next.js, Zod, Supabase, LangGraph JS official docs.

## Project Structure

### Documentation (this feature)

```text
specs/009-squeezed-middle-roi/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── api-parents.md
│   └── agent-discovery.md
└── tasks.md             # Phase 2 (speckit.tasks)
```

### Source Code (repository root)

```text
apps/
├── web/
│   ├── app/api/
│   │   ├── parents/         # link, unlink, contributions (009)
│   │   ├── roi/             # comparison (009)
│   │   └── merit/           # preference get/patch (009)
│   ├── app/onboarding/      # extend Step 2 with SAT, ACT, spikes
│   └── lib/actions/
│       └── onboarding.ts   # saveAcademicProfile + merit preference
├── agent/
│   └── lib/
│       ├── load-profile.ts      # merit_tier (from @repo/db), merit_filter_preference, sai_above_threshold
│       ├── discovery/
│       │   ├── pii-scrub.ts     # extend spikes scrub
│       │   ├── trust-scorer.ts  # need_blind category
│       │   └── scholarship-upsert.ts  # need_blind in VALID_CATEGORIES
│       └── nodes/
│           ├── advisor-search.ts   # merit filter when preference=merit_only
│           ├── advisor-verify.ts   # tag need_blind
│           └── coach-prioritization.ts  # merit-first sort when SAI > threshold
packages/
└── database/
    ├── src/
    │   ├── config/
    │   │   └── merit-tiers.ts   # tier cutoffs (009)
    │   ├── schema/profiles.ts   # sat_total, act_composite, spikes, merit_filter_preference
    │   └── supabase/migrations/
    │       ├── 00000000000017_profiles_squeezed_middle.sql
    │       ├── 00000000000018_scholarship_category_need_blind.sql
    │       ├── 00000000000019_app_settings.sql
    │       ├── 00000000000020_parent_students.sql
    │       ├── 00000000000021_parent_contributions.sql
    │       ├── 00000000000022_institutions.sql
    │       └── 00000000000023_career_outcomes.sql
```

**Structure Decision**: Turborepo monorepo per constitution. All 009 additions fit within apps/web, apps/agent, packages/database; no new packages.

## Schema Alignment

| Item | Source | Notes |
|------|--------|-------|
| profiles.sat_total, act_composite, spikes | FR-002 | Merit tier matching |
| profiles.merit_filter_preference | FR-001 | User toggle |
| scholarship_category need_blind | FR-006, research | Institutional merit |
| app_settings | research §1 | sai_merit_threshold |
| parent_students | FR-009 | Link table |
| parent_contributions | FR-010 | Income, manual scholarships |
| institutions | FR-003, FR-004 | Alternative path catalog |
| career_outcomes | FR-005 | Year-5 income |
| merit_tiers config | FR-002, research §2 | Code module, extensible |

## Complexity Tracking

No Constitution violations requiring justification.
