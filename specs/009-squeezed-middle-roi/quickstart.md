# Quickstart: Squeezed Middle & Alternative ROI Engine

**Branch**: `009-squeezed-middle-roi` | **Date**: 2025-02-24

## Prerequisites

- Node 18+, pnpm
- Supabase project (local or hosted)
- Existing TuitionLift setup (002–008)

## Environment Variables

```env
# College Scorecard API (for institution catalog and COA data)
COLLEGE_SCORECARD_API_KEY=...

# BLS API (optional; bulk CSV also supported for career outcomes seed)
BLS_API_KEY=...
```

**Note**: SAI zone boundaries (pell_cutoff, grey_zone_end, merit_lean_threshold) and merit tier cutoffs are stored in DB (`sai_zone_config`, `merit_tier_config`), keyed by award year. No .env override—update via DB seed/migrations or admin.

## Migrations (packages/database)

Run migrations in order:

```bash
pnpm --filter @repo/db db:push      # Apply migrations
pnpm --filter @repo/db db:generate # Regenerate types
```

Migrations to add:
- `0XX_profiles_squeezed_middle.sql` — sat_total, act_composite, spikes, merit_filter_preference, award_year
- `0XX_scholarship_category_need_blind.sql` — ALTER TYPE
- `0XX_sai_zone_config.sql` — award_year, pell_cutoff, grey_zone_end, merit_lean_threshold
- `0XX_merit_tier_config.sql` — award_year, tier_name, gpa/sat/act ranges, gpa_min_no_test
- `0XX_parent_students.sql` — link table
- `0XX_parent_contributions.sql`
- `0XX_institutions.sql` — includes coa column
- `0XX_career_outcomes.sql`
- `0XX_user_saved_schools.sql` — user_id, institution_id for COA comparison
- `0XX_sai_zone_config_seed.sql` — seeds sai_zone_config for 2026, 2027 (runs with db:push)
- `0XX_merit_tier_config_seed.sql` — seeds merit_tier_config for 2026, 2027 (runs with db:push)

## Seed Data

1. **sai_zone_config**: Seeded by migration `00000000000028_sai_zone_config_seed.sql` (applied with `db:push`). Rows for award years 2026, 2027 with pell_cutoff=7395, grey_zone_end=25000, merit_lean_threshold=30000.
2. **merit_tier_config**: Seeded by migration `00000000000029_merit_tier_config_seed.sql` (applied with `db:push`). Tiers presidential, deans, merit, incentive per award year 2026, 2027; GPA/SAT/ACT ranges per research §2; gpa_min_no_test for test-optional.
3. **institutions**: Seed from College Scorecard (community colleges, trade schools) or manual .edu list; include coa where available
4. **career_outcomes**: Seed from BLS OEWS for top ~100 majors (CIP→SOC mapping)

## Local Verification

1. **Merit-first flow**: Create profile with SAI > merit_lean_threshold (from sai_zone_config), set award_year, merit_filter_preference = 'merit_only', trigger discovery. Verify need-based filtered.
2. **Intake time (SC-002)**: Complete intake with GPA, test scores, and at least two Spikes. Verify completion in <5 min.
3. **Parent link**: Student links parent; parent adds income. Verify parent sees ROI comparison; unlink removes access.
4. **ROI comparison**: GET /api/roi/comparison with student profile. Verify institutions and career outcomes returned.
5. **COA comparison**: Add saved schools; GET /api/coa/comparison. Verify SAI vs. avg COA, Need-to-Merit zone; empty saved schools shows fallback message.
6. **US3 Major Pivot**: Set profile intended_major to empty or "undecided"; trigger discovery. Verify Coach_Major_Pivot runs (no Advisor nodes); Coach message includes major and school suggestions from career_outcomes and institutions.
7. **Lighthouse (T049)**: Run `pnpm --filter web build && PORT=3002 pnpm --filter web start`, then `LIGHTHOUSE_URL=http://localhost:3002/discovery pnpm --filter web lighthouse:discovery` (verifies 90+ Performance and Best Practices). For dashboard ROI/COA flows, run Lighthouse manually in Chrome DevTools while logged in.

## Key Files to Modify

| Area | Files |
|------|-------|
| Profiles | packages/database schema, apps/web onboarding, apps/agent load-profile |
| Discovery | apps/agent lib/nodes/advisor-search.ts, advisor-verify.ts, coach-prioritization.ts |
| PII | apps/agent lib/discovery/pii-scrub.ts |
| Parents | apps/web app/api/parents/, Server Actions |
| ROI | apps/web app/api/roi/, institutions/career_outcomes queries |
| COA comparison | apps/web app/api/coa/, user_saved_schools, institutions.coa |
| SAI zones / merit tiers | sai_zone_config, merit_tier_config tables |

## References

- [data-model.md](./data-model.md) — Schema details
- [research.md](./research.md) — BLS, College Scorecard, tier cutoffs
- [contracts/](./contracts/) — API contracts
