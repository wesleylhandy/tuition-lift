# Data Model: Squeezed Middle & Alternative ROI Engine

**Branch**: `009-squeezed-middle-roi` | **Date**: 2025-02-24  
**Spec**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

## Overview

This feature extends:
- **profiles** — SAT/ACT, spikes, merit_filter_preference
- **scholarships** — add need_blind to category enum; metadata tags
- **New tables** — app_settings, parent_students, institutions, career_outcomes, parent_contributions
- **preferences JSONB** — merit_filter_preference when not in dedicated column

---

## 1. Profiles Table Extensions

### New Columns

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| sat_total | integer | yes | NULL | SAT EBRW + Math (400–1600) |
| act_composite | integer | yes | NULL | ACT composite (1–36) |
| spikes | text[] | yes | NULL | Extracurricular "spikes" (e.g., Water Polo, Leadership) |
| merit_filter_preference | text | yes | 'show_all' | 'merit_only' \| 'show_all' |

### Validation (Zod + DB)

- `sat_total`: 400–1600; `act_composite`: 1–36
- `spikes`: array of non-empty strings, max 10 items, each max 100 chars
- `merit_filter_preference`: CHECK IN ('merit_only', 'show_all')

### RLS

No policy changes. Owner-only access unchanged.

---

## 2. Scholarship Category Enum Extension

### Migration

```sql
ALTER TYPE scholarship_category ADD VALUE IF NOT EXISTS 'need_blind';
```

- `merit` — merit-only (non-institutional)
- `need_blind` — institutional merit (admissions need-blind)
- `need_based` — need-based (existing)
- `minority`, `field_specific`, `other` — unchanged

### Metadata Tags

`scholarships.metadata` already has `categories` array. Advisor_Verify will set primary `category` and ensure `metadata.categories` includes appropriate tag for Coach prioritization.

---

## 3. App Settings Table (SAI Threshold)

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| key | text | NOT NULL | — | PK; e.g. 'sai_merit_threshold' |
| value | text | NOT NULL | — | '15000' |
| updated_at | timestamptz | NOT NULL | now() | |

RLS: Service role only (or anon read for non-sensitive keys). App reads via Server Action or agent; .env `SAI_MERIT_THRESHOLD` overrides when set.

---

## 4. Parent-Student Link Table

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| parent_id | uuid | NOT NULL | — | FK → auth.users / profiles |
| student_id | uuid | NOT NULL | — | FK → auth.users / profiles |
| linked_at | timestamptz | NOT NULL | now() | |
| PRIMARY KEY (parent_id, student_id) | | | | |

RLS:
- Parent: SELECT where parent_id = auth.uid(); DELETE not allowed (student initiates unlink)
- Student: SELECT, INSERT, DELETE where student_id = auth.uid()

Unlink: Student deletes row; parent loses access immediately.

---

## 5. Parent Contributions (Income + Manual Scholarships)

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| student_id | uuid | NOT NULL | — | FK → profiles |
| parent_id | uuid | NOT NULL | — | FK → profiles |
| contribution_type | text | NOT NULL | — | 'income' \| 'manual_scholarship' |
| payload | jsonb | NOT NULL | — | { amount, source } or { title, amount, deadline } |
| created_at | timestamptz | NOT NULL | now() | |

RLS: Parent can INSERT/SELECT own rows where parent_id = auth.uid(); student can SELECT/DELETE own. App merges parent contributions into profile view for ROI comparison.

---

## 6. Institutions Table (Alternative Path Catalog)

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| name | text | NOT NULL | — | |
| institution_type | text | NOT NULL | — | '4_year' \| 'community_college' \| 'trade_school' \| 'city_college' |
| state | text | yes | NULL | |
| url | text | yes | NULL | .edu preferred |
| sticker_price | numeric(12,2) | yes | NULL | |
| automatic_merit | numeric(12,2) | yes | NULL | |
| net_price | numeric(12,2) | yes | NULL | Computed or from College Scorecard |
| source | text | yes | NULL | 'college_scorecard' \| 'manual' \| 'search' |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | |

RLS: Public read. Insert/update via service role or admin.

Indexes: `institution_type`, `state`, `name` (gin for search).

### Remaining Cost (Scholarship Impact)

For each institution, remaining cost = net_price − scholarships applied. Scholarships are either:
- **Awarded**: applications where status = 'awarded' and confirmed; reduce remaining.
- **Potential**: applications where status = 'draft' or 'submitted'; show as "if awarded" scenario with explicit labeling to avoid misrepresentation (e.g., "Remaining (if potential awards): $X — not guaranteed").

---

## 7. Career Outcomes Table (Year-5 Income)

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| cip_code | text | yes | NULL | NCES CIP (major) |
| soc_code | text | yes | NULL | BLS SOC (occupation) |
| major_name | text | NOT NULL | — | Human-readable |
| career_path | text | yes | NULL | Trade/career label |
| mean_annual_wage | numeric(12,2) | yes | NULL | BLS median/mean |
| source | text | yes | NULL | 'bls' \| 'manual' |
| data_year | integer | yes | NULL | BLS reference year |
| created_at | timestamptz | NOT NULL | now() | |

RLS: Public read. Upsert via service role.

Indexes: `cip_code`, `soc_code`, `major_name`.

---

## 8. Merit Tier Config (Code, Not DB)

Merit tiers defined in `packages/database/src/config/merit-tiers.ts`:

```ts
export const MERIT_TIERS = {
  top:    { gpa_min: 3.8, sat_min: 1400, act_min: 32 },
  strong: { gpa_min: 3.5, sat_min: 1260, act_min: 28, gpa_max: 3.79, sat_max: 1399, act_max: 31 },
  standard: { gpa_min: 3.0, sat_min: 1100, act_min: 24, gpa_max: 3.49, sat_max: 1259, act_max: 27 },
} as const;
```

Design allows future migration to `app_settings` or JSONB config table.

---

## 9. Entity Relationships

```
auth.users
├── profiles (student or parent)
│   ├── sat_total, act_composite, spikes, merit_filter_preference (009)
│   └── preferences.merit_filter_preference (fallback)
├── parent_students (parent_id, student_id)
└── parent_contributions (parent_id, student_id)

scholarships
└── category: merit | need_based | need_blind | ...

institutions (curated + search)
career_outcomes (BLS seed + extend)
app_settings (sai_merit_threshold)
```

---

## 10. Cross-Feature Impact

| Consumer | Impact |
|----------|--------|
| load-profile.ts | Add sat_total, act_composite, spikes; derive merit_tier; pass merit_filter_preference |
| pii-scrub.ts | Scrub spikes (labels only, no PII); extend AnonymizedProfileSchema |
| TrustScorer / scholarship-upsert | Set category need_blind for .edu merit; merit for non-institutional merit |
| Advisor_Search | Use merit_filter_preference + SAI threshold; filter/deprioritize need-based when merit-first |
| Coach_Prioritization | Prioritize merit/need_blind when SAI > threshold; respect merit_filter_preference |
| onboarding (saveAcademicProfile) | Add SAT, ACT, spikes fields |
| ROI comparison UI | Read institutions, career_outcomes; compute net price |
