# Implementation Plan: Squeezed Middle & Alternative ROI Engine

**Branch**: `009-squeezed-middle-roi` | **Date**: 2025-02-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/009-squeezed-middle-roi/spec.md`

## Summary

Extend TuitionLift to serve the "Squeezed Middle"—students with SAI above need-based thresholds who lack liquidity. **Merit-first logic**: When SAI exceeds configurable merit-lean threshold (from award-year-scoped `sai_zone_config`), Advisor prioritizes Merit-Only and Need-Blind scholarships; user toggle selects "Merit only" (filter) or "Show all" (deprioritize). **Configurable parameters**: SAI zones (Pell cutoff, Grey Zone end, Merit Lean) and merit tiers (GPA/SAT/ACT) stored in DB, keyed by award year; user selects award year (current or next only). **COA comparison**: SAI vs. average COA of saved schools; Demonstrated Need formula (COA − SAI = Financial Need); visual Need-to-Merit transition. **Intake extensions**: SAT/ACT, Spikes, award_year; merit tiers from `merit_tier_config` (test-optional handling). **Alternative ROI**: Curated institution catalog (College Scorecard + .edu seed), career outcomes (BLS OEWS), Net Price display. **Parent role**: Distinct account, link to student, add income/manual scholarships only; student unlink revokes access. **Agent changes**: Advisor_Verify tags need_blind; Coach_Prioritization boosts merit/need_blind when SAI > merit_lean_threshold; PII scrub extends to spikes.

## Technical Context

**Language/Version**: TypeScript 5.x (Node 18+)
**Primary Dependencies**: Next.js (App Router), React 19, LangGraph JS, Supabase, Zod, Inngest (existing)
**Storage**: Supabase (PostgreSQL) — profiles extensions, sai_zone_config, merit_tier_config, parent_students, parent_contributions, institutions, career_outcomes, user_saved_schools; RLS on all new tables
**Testing**: Vitest for unit; existing Inngest/agent verification scripts
**Target Platform**: Vercel (apps/web, apps/agent)
**Project Type**: Turborepo monorepo (existing)
**Performance Goals**: Discovery flow unchanged (≤5 min); ROI comparison <2s; intake with SAT/spikes <5 min
**Constraints**: PII scrubbing on spikes; College Scorecard/BLS API rate limits
**Scale/Scope**: Single-user flows; institution catalog ~1–5k rows; career outcomes 100+ majors; config tables <100 rows per year
**External API Docs**: [College Scorecard API](https://collegescorecard.ed.gov/data/api-documentation); [BLS API](https://www.bls.gov/developers/api_signature_v2.htm)

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
│   ├── api-coa-comparison.md   # NEW for COA comparison
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
│   │   ├── merit/           # preference get/patch (009)
│   │   └── coa/             # COA comparison, saved schools (009)
│   ├── app/onboarding/      # extend Step 2 with SAT, ACT, spikes, award_year
│   └── lib/actions/
│       └── onboarding.ts   # saveAcademicProfile + merit preference
├── agent/
│   └── lib/
│       ├── load-profile.ts      # read sai_zone_config, merit_tier_config by award_year (from @repo/db); derive merit_tier, sai_above_threshold
│       └── discovery/
│           ├── pii-scrub.ts     # extend spikes scrub
│           ├── trust-scorer.ts  # need_blind category
│           └── scholarship-upsert.ts  # need_blind in VALID_CATEGORIES
│       └── nodes/
│           ├── advisor-search.ts   # merit filter when preference=merit_only
│           ├── advisor-verify.ts   # tag need_blind
│           └── coach-prioritization.ts  # merit-first sort when SAI > merit_lean_threshold
packages/
└── database/
    ├── src/
    │   ├── schema/profiles.ts   # sat_total, act_composite, spikes, merit_filter_preference, award_year
    │   └── supabase/migrations/
    │       ├── 00000000000019_profiles_squeezed_middle.sql
    │       ├── 00000000000020_scholarship_category_need_blind.sql
    │       ├── 00000000000021_sai_zone_config.sql
    │       ├── 00000000000022_merit_tier_config.sql
    │       ├── 00000000000023_parent_students.sql
    │       ├── 00000000000024_parent_contributions.sql
    │       ├── 00000000000025_institutions.sql
    │       ├── 00000000000026_career_outcomes.sql
    │       └── 00000000000027_user_saved_schools.sql
```

**Structure Decision**: Turborepo monorepo per constitution. All 009 additions fit within apps/web, apps/agent, packages/database; no new packages.

## Schema Alignment

| Item | Source | Notes |
|------|--------|------|
| profiles.sat_total, act_composite, spikes, merit_filter_preference, award_year | FR-001, FR-002 | Merit tier matching; award year for config lookup |
| scholarship_category need_blind | FR-006, research | Institutional merit |
| sai_zone_config | research §1, FR-001 | Award-year-scoped; pell_cutoff, grey_zone_end, merit_lean_threshold |
| merit_tier_config | research §2, FR-002 | Award-year-scoped; GPA/SAT/ACT per tier; gpa_min_no_test for test-optional |
| parent_students | FR-009 | Link table |
| parent_contributions | FR-010 | Income, manual scholarships |
| institutions (incl. coa) | FR-003, FR-004, FR-011 | Alternative path catalog; COA for Demonstrated Need |
| user_saved_schools | FR-011 | COA comparison: SAI vs. avg COA of saved schools |
| career_outcomes | FR-005 | Year-5 income |

## Complexity Tracking

No Constitution violations requiring justification.
