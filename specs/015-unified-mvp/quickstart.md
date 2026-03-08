# Quickstart: Unified MVP (015)

**Branch**: `015-unified-mvp`

## Prerequisites

- Node ≥18, pnpm 9
- Supabase local (or linked project)
- Feature branch: `015-unified-mvp`

## 1. Run Migrations

```bash
pnpm --filter @repo/db exec supabase db push
```

Migrations added:
- `00000000000040_scholarships_content_hash.sql`
- `00000000000041_user_saved_schools_status.sql`
- `00000000000042_applications_merit_tag.sql`
- `00000000000043_discovery_config.sql`

## 2. Seed Discovery Config (Optional)

```sql
INSERT INTO public.discovery_config (id, cooldown_minutes, per_day_cap, max_depth, max_links_per_page, max_records_per_run)
VALUES ('default', 60, 5, 2, 50, 500)
ON CONFLICT (id) DO UPDATE SET
  cooldown_minutes = EXCLUDED.cooldown_minutes,
  per_day_cap = EXCLUDED.per_day_cap,
  max_depth = EXCLUDED.max_depth,
  max_links_per_page = EXCLUDED.max_links_per_page,
  max_records_per_run = EXCLUDED.max_records_per_run,
  updated_at = now();
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
| Scholarships schema | `packages/database/src/schema/scholarships.ts` |
| Applications schema | `packages/database/src/schema/applications.ts` |
| Config queries | `packages/database/src/config-queries.ts` |
| Track Server Action | `apps/web/lib/actions/track.ts` |
| Account modal / profile | `apps/web/components/dashboard/account/` |
| College list actions | `apps/web/lib/actions/` |
| Discovery trigger | `apps/web/app/api/discovery/trigger/route.ts` |
| Match Inbox consumer | `apps/web/components/dashboard/match-inbox/` |
| Deep-scout | `apps/agent/lib/discovery/` or `lib/scout/` |
| Coach's Take | `apps/agent/lib/` (discovery or coach) |
| Coach game plan | `apps/agent/lib/coach/game-plan.ts` |
| Protected routes | `apps/web/app/` middleware or layout |
| Debt Lifted header | `apps/web/components/` (dashboard header) |

## 5. Verification

- **US1**: Track and Dismiss; verify correct scholarship_id propagation; no orphaned apps
- **US2**: Coach's Take on every card; placeholder when generation fails
- **US3**: Categories and verification_status on cards; no empty substitution
- **US4**: Run discovery against aggregation URL; verify individual records extracted
- **US6**: Add institution, set Committed; verify institutional scholarships Critical in Game Plan
- **US7**: Mark application Won; verify Debt Lifted updates
- **US9**: Account modal; edit profile and institutions; save; discard confirmation
- **US10**: Discovery trigger visible from dashboard; run; feedback
- **US11**: Access dashboard unauthenticated → sign-in; incomplete profile (missing award_year, major, state, or GPA) → onboarding

## 6. References

- [spec.md](./spec.md) — Functional requirements
- [data-model.md](./data-model.md) — Schema and migrations
- [research.md](./research.md) — Phase 0 decisions
- [contracts/](./contracts/) — Server Actions, API, agent internals
