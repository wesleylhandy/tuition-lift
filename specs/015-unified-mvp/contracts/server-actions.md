# Server Action Contracts: Unified MVP (015)

**Branch**: `015-unified-mvp`

## 1. Track Scholarship (extend)

**Location**: `apps/web/lib/actions/track.ts`

**Contract**: When tracking from Discovery Feed, accept and persist `merit_tag` in addition to `need_match_score`.

```ts
// Input (caller provides)
{
  scholarship_id: string;           // uuid
  need_match_score: number | null; // 0-100 from DiscoveryResult; null for Scout path
  merit_tag: string | null;        // e.g., "merit", "need_blind"; from DiscoveryResult
}
```

**Validation**: `merit_tag: z.string().max(50).nullable().optional()`

**Upsert**: Include merit_tag in payload when provided. academic_year derived from profile award_year (unchanged).

## 2. User Account Modal: Profile Update

**Location**: `apps/web/lib/actions/` (new or extend onboarding.ts)

**Contract**: Update profile fields: intended_major, state, gpa_unweighted (or gpa), sai, pell_eligibility_status, award_year, first_generation, parent_employer_category, identity_eligibility_categories. Zod validation. On close with unsaved changes: return confirmation ("Discard changes?" Cancel/Confirm) — client handles dialog.

**Flow**: Load profile → user edits → save → Server Action with Zod validation. Optimistic locking via updated_at when applicable.

## 3. User Account Modal: College List (Institutions)

**Location**: `apps/web/lib/actions/` (new, e.g., college-list.ts)

**Contract**: CRUD for user_saved_schools. Add: user_id, institution_id (from institutions table or create new), status (applied|accepted|committed). Edit: update status. Delete: remove row. Max institutions per user = configurable (default 10); enforce in action.

**Validation**: status: z.enum(['applied', 'accepted', 'committed']).optional().default('applied')

## 4. Dismiss (unchanged)

**Location**: `apps/web/lib/actions/dismiss.ts`

**Contract**: Existing. Persist (user_id, scholarship_id, discovery_run_id). scholarship_id must match discovery result id propagated from pipeline (US1 identity).

## 5. Discovery Trigger (API, not Server Action)

**Contract**: See contracts/api-discovery.md. Rate limit enforcement: before invoking Inngest, check discovery_config (cooldown, per_day_cap). Return 429 when blocked.
