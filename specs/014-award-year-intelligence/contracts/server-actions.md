# Server Action Contracts: Award Year Intelligence (014)

**Branch**: `014-award-year-intelligence`

## 1. Onboarding: Save Award Year

**Location**: `apps/web/lib/actions/onboarding.ts` (or equivalent)

**Contract**: When creating or updating a profile during onboarding, `award_year` MUST be included and validated.

```ts
// Input (from Step 0 or Step 1)
award_year: number  // currentYear..currentYear+4

// Validation
z.number().int().min(currentYear).max(currentYear + 4)
```

**Flow**: User selects award year (Step 0) → value passed to Identity step → on account creation, profile insert includes `award_year`.

## 2. Track Scholarship (from Discovery Feed)

**Location**: Server Action or API that creates/upserts application when user tracks from Match Inbox

**Contract**: When tracking from Discovery Feed, `need_match_score` from the discovery result MUST be passed to the application insert/update. The Server Action MUST fetch the user's profile and derive `academic_year` internally—callers do NOT pass `academic_year`.

```ts
// Input (caller provides)
{
  scholarship_id: string;           // uuid
  need_match_score: number | null;  // 0-100 from DiscoveryResult; null for Scout path
}

// Internal: Action fetches profile, derives academic_year
// academic_year = awardYearToAcademicYear(profile.award_year)
// Block when profile.award_year is null
```

**Validation**: `need_match_score: z.number().min(0).max(100).nullable().optional()`

## 3. Scout (Manual Add)

**Contract**: When tracking via Scout, `need_match_score` MAY be null. `academic_year` MUST be derived from profile award_year.

Same as Track, but `need_match_score: null`.
