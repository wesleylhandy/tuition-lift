# Data Model: Quick Onboarder Wizard

**Branch**: `008-quick-onboarder` | **Date**: 2026-02-18  
**Spec**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

## Overview

This feature extends the existing `profiles` table (defined in **002-db-core-infrastructure** data-model) with:
- `onboarding_complete` — canonical signal for wizard completion
- `gpa_weighted` and `gpa_unweighted` — replace single `gpa` column to support both GPA types per scholarship matching requirements

No new tables. Discovery and dashboard integrations consume existing APIs and profile data.

---

## 1. Profiles Table Extensions

### New Columns

| Column               | Type      | Nullable | Default | Notes                                                                 |
|----------------------|-----------|----------|---------|-----------------------------------------------------------------------|
| onboarding_complete  | boolean   | NOT NULL | false   | Set to true when user completes Step 3 ("Finish & Start Discovery")   |
| gpa_weighted        | numeric(4,2) | yes   | NULL    | 0–6 scale; supports weighted GPA (e.g., 5.0)                           |
| gpa_unweighted      | numeric(3,2) | yes   | NULL    | 0–4 scale; standard unweighted GPA                                    |

### Deprecated Column

| Column | Action | Notes                                                                 |
|--------|--------|-----------------------------------------------------------------------|
| gpa    | Retain | Migration 00016 copies `gpa` → `gpa_unweighted`; gpa column is NOT dropped. Optional follow-up migration N+1 may drop after all consumers use new columns. |

### Validation Rules (Zod + DB)

- `gpa_weighted`: 0–6; CHECK constraint in migration
- `gpa_unweighted`: 0–4; CHECK constraint
- `onboarding_complete`: boolean, no CHECK
- Existing: `intended_major`, `state` (required for Step 2 advance); `full_name`, `sai`, `pell_eligibility_status` (optional)

### RLS

No policy changes. Existing owner-only SELECT, INSERT, UPDATE remain. New columns covered by same policies.

---

## 2. Migration Strategy

1. **Migration 00016**: Add `onboarding_complete boolean NOT NULL DEFAULT false`, `gpa_weighted numeric(4,2)`, `gpa_unweighted numeric(3,2)` with CHECK constraints (0–6, 0–4).
2. **Data migration**: `UPDATE profiles SET gpa_unweighted = gpa WHERE gpa IS NOT NULL AND gpa_unweighted IS NULL`.
3. **gpa column**: Retained for backward compatibility. Do NOT drop in 00016.
4. **Migration N+1** (optional, deferred): Drop `gpa` column after all consumers use `gpa_weighted`/`gpa_unweighted`.
5. **Zod schema**: Update `packages/database/src/schema/profiles.ts` with new fields; deprecate `gpa` (keep for type compatibility).
6. **Agent & web**: Update `load-profile.ts`, `UserProfileSchema`, `AnonymizedProfileSchema`, `pii-scrub.ts`, `get-prep-checklist.ts`, `setup-test-profile.ts` to use new columns.

---

## 3. Entity Relationships

```
auth.users (Supabase)
    │
    └─ 1:1 ── profiles
                  ├── onboarding_complete (008)
                  ├── gpa_weighted (008)
                  ├── gpa_unweighted (008)
                  ├── full_name, intended_major, state (002)
                  ├── sai, pell_eligibility_status (002)
                  └── ... existing columns
```

No new FKs. Profile row created on signup (Step 1); updated in Step 2 and Step 3.

---

## 4. Cross-Feature Impact

| Consumer                    | Status | Impact                                                                 |
|-----------------------------|--------|-------------------------------------------------------------------------|
| load-profile.ts (003)       | Done   | Reads gpa_weighted, gpa_unweighted; maps to UserProfile.gpa (unweighted ?? weighted) |
| UserProfileSchema (agent)   | Done   | gpa range 0–6 for weighted compatibility                                 |
| AnonymizedProfileSchema     | Done   | gpa 0–6 in discovery pii-scrub                                         |
| get-prep-checklist (006)    | Done   | Selects gpa_weighted, gpa_unweighted; hasGpa = either valid range       |
| setup-test-profile.ts       | Done   | Writes gpa_unweighted for test profiles                                 |
| discovery query generator   | Future | May use both GPAs when building search queries                         |

---

## 5. State Transitions (Onboarding)

| State                  | Condition                                         | Next Action                    |
|------------------------|---------------------------------------------------|--------------------------------|
| Not started            | No auth.users row                                 | Show Step 1                    |
| Step 1 complete       | auth.users exists, profiles row exists            | Show Step 2                    |
| Step 2 complete        | intended_major, state present                      | Show Step 3                    |
| Step 3 complete        | onboarding_complete = true                        | Redirect to /dashboard         |
| Mid-flow resume        | auth exists, profile partial                      | Show step where data is missing|
