# Quickstart: Squeezed Middle & Alternative ROI Engine

**Branch**: `009-squeezed-middle-roi` | **Date**: 2025-02-24

## Prerequisites

- Node 18+, pnpm
- Supabase project (local or hosted)
- Existing TuitionLift setup (002–008)

## Environment Variables

```env
# Optional override for SAI merit threshold (default 15000 from DB)
SAI_MERIT_THRESHOLD=15000

# College Scorecard API (for institution catalog)
COLLEGE_SCORECARD_API_KEY=...

# BLS API (optional; bulk CSV also supported for career outcomes seed)
BLS_API_KEY=...
```

## Migrations (packages/database)

Run migrations in order:

```bash
pnpm turbo run db:generate --filter=@repo/db
pnpm turbo run db:migrate --filter=@repo/db
```

Migrations to add:
- `0XX_profiles_squeezed_middle.sql` — sat_total, act_composite, spikes, merit_filter_preference
- `0XX_scholarship_category_need_blind.sql` — ALTER TYPE
- `0XX_app_settings.sql` — sai_merit_threshold
- `0XX_parent_students.sql` — link table
- `0XX_parent_contributions.sql`
- `0XX_institutions.sql`
- `0XX_career_outcomes.sql`

## Seed Data

1. **app_settings**: Insert `sai_merit_threshold` = 15000
2. **institutions**: Seed from College Scorecard (community colleges, trade schools) or manual .edu list
3. **career_outcomes**: Seed from BLS OEWS for top ~100 majors (CIP→SOC mapping)

## Local Verification

1. **Merit-first flow**: Create profile with SAI > 15000, set merit_filter_preference = 'merit_only', trigger discovery. Verify need-based filtered.
2. **Parent link**: Student links parent; parent adds income. Verify parent sees ROI comparison; unlink removes access.
3. **ROI comparison**: GET /api/roi/comparison with student profile. Verify institutions and career outcomes returned.

## Key Files to Modify

| Area | Files |
|------|-------|
| Profiles | packages/database schema, apps/web onboarding, apps/agent load-profile |
| Discovery | apps/agent lib/nodes/advisor-search.ts, advisor-verify.ts, coach-prioritization.ts |
| PII | apps/agent lib/discovery/pii-scrub.ts |
| Parents | apps/web app/api/parents/, Server Actions |
| ROI | apps/web app/api/roi/, institutions/career_outcomes queries |
| Merit config | packages/database src/config/merit-tiers.ts |

## References

- [data-model.md](./data-model.md) — Schema details
- [research.md](./research.md) — BLS, College Scorecard, tier cutoffs
- [contracts/](./contracts/) — API contracts
