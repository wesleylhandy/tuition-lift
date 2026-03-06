# Quickstart: Award Year Intelligence (014)

**Branch**: `014-award-year-intelligence`

## Prerequisites

- Node ≥18, pnpm 9
- Supabase local (or linked project)
- Feature branch checked out: `014-award-year-intelligence`

## 1. Run Migrations

```bash
pnpm --filter @repo/db exec supabase db push
# Or: supabase migration up
```

Migrations added:
- `00000000000035_applications_need_match_score.sql`
- `00000000000036_scholarship_cycle_verifications.sql`
- `00000000000037_merit_first_config.sql`

## 2. Seed Merit-First Config (Optional)

```sql
INSERT INTO public.merit_first_config (award_year, merit_first_sai_threshold)
VALUES (2025, 15000), (2026, 15000), (2027, 15000), (2028, 15000), (2029, 15000)
ON CONFLICT (award_year) DO UPDATE SET merit_first_sai_threshold = EXCLUDED.merit_first_sai_threshold;
```

## 3. Build Order

```bash
pnpm install
pnpm --filter @repo/db build
pnpm --filter agent build
pnpm --filter web build
```

## 4. Key Files to Modify

| Area | Path |
|------|------|
| DB migrations | `packages/database/supabase/migrations/` |
| Applications schema | `packages/database/src/schema/applications.ts` |
| Profiles schema (award year range) | `packages/database/src/schema/profiles.ts` |
| Config queries | `packages/database/src/config-queries.ts` |
| Onboarding wizard | `apps/web/components/onboard/` |
| Track/Scout Server Action | `apps/web/lib/actions/` or equivalent |
| Load profile | `apps/agent/lib/load-profile.ts` |
| Advisor discovery | `apps/agent/lib/nodes/advisor-search.ts`, `advisor-verify.ts` |
| DB-first lookup | New module in `apps/agent/lib/discovery/` |
| Query generator (C1) | `apps/agent/lib/discovery/query-generator.ts`; load saved institutions in Advisor_Search |
| Coach Alternative Path | `apps/agent/lib/coach/` |

## 5. Verification

- **SC-001**: Create application via Track; verify `academic_year` matches profile award year
- **SC-002**: Track from Discovery Feed; verify `need_match_score` persisted
- **SC-003**: User with SAI > threshold; verify ≥7 of top 10 results have merit_tag need_blind or merit_only
- **SC-004**: Trigger discovery; verify DB query runs before external search (check logs or add trace)
- **SC-006**: Start onboarding; verify award year is first step and required
- **SC-008**: Set profile state (e.g., CA); trigger discovery; verify at least one query targets local/regional scholarships for that state
- **SC-009**: Add saved institutions; trigger discovery; verify queries include institution-specific angles

## 6. References

- [spec.md](./spec.md) — Functional requirements
- [data-model.md](./data-model.md) — Schema and migrations
- [contracts/](./contracts/) — Server Actions, agent internals, config queries
