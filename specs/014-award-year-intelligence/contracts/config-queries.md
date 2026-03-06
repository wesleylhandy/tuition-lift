# Config Query Contracts: Award Year Intelligence (014)

**Branch**: `014-award-year-intelligence` | **Package**: `packages/database`

## 1. Merit-First Threshold

**Table**: `merit_first_config`

**Query**: `getMeritFirstThreshold(awardYear: number): Promise<number | null>`

```ts
// Returns merit_first_sai_threshold for the given award_year
// Returns null if not found or on error
// Used by: Advisor discovery flow to activate Merit-First Mode
```

**Pattern**: Mirrors `getSaiZoneConfig` (009). Single row per award_year.

## 2. Scholarship Cycle Verification

**Table**: `scholarship_cycle_verifications`

**Query**: `isScholarshipVerifiedForCycle(scholarshipId: string, academicYear: string): Promise<boolean>`

```ts
// Returns true if a row exists for (scholarship_id, academic_year)
// Used by: DB-first discovery to skip re-verification for already-verified scholarships
```

**Query**: `upsertScholarshipCycleVerification(scholarshipId: string, academicYear: string): Promise<void>`

```ts
// Insert or update verified_at for (scholarship_id, academic_year)
// Used by: Advisor after re-verification
```
