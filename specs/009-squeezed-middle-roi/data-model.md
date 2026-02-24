# Data Model: Squeezed Middle & Alternative ROI Engine

**Branch**: `009-squeezed-middle-roi` | **Date**: 2025-02-24  
**Spec**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

## Overview

This feature extends:
- **profiles** — SAT/ACT, spikes, merit_filter_preference
- **scholarships** — add need_blind to category enum; metadata tags
- **New tables** — sai_zone_config, merit_tier_config, parent_students, parent_contributions, institutions, career_outcomes, user_saved_schools
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
| award_year | integer | yes | NULL | User-selected; current or next year only (e.g., 2026, 2027) |

### Validation (Zod + DB)

- `sat_total`: 400–1600; `act_composite`: 1–36
- `spikes`: array of non-empty strings, max 10 items, each max 100 chars
- `merit_filter_preference`: CHECK IN ('merit_only', 'show_all')
- `award_year`: current or next calendar year; validated at application boundary

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

## 3. Award-Year-Scoped Config Tables

### 3a. SAI Zone Config

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| award_year | integer | NOT NULL | — | PK; e.g. 2026, 2027 |
| pell_cutoff | integer | NOT NULL | — | Max SAI for Pell (e.g., 7395) |
| grey_zone_end | integer | NOT NULL | — | End of Grey Zone (e.g., 25000) |
| merit_lean_threshold | integer | NOT NULL | — | SAI above = merit-first (e.g., 30000) |
| updated_at | timestamptz | NOT NULL | now() | |

RLS: Service role write; anon/service read for agent and COA comparison.

### 3b. Merit Tier Config

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| award_year | integer | NOT NULL | — | PK with tier_name |
| tier_name | text | NOT NULL | — | e.g. 'presidential', 'deans', 'merit', 'incentive' |
| gpa_min | numeric(3,2) | yes | NULL | Unweighted |
| gpa_max | numeric(3,2) | yes | NULL | |
| sat_min | integer | yes | NULL | EBRW + Math |
| sat_max | integer | yes | NULL | |
| act_min | integer | yes | NULL | |
| act_max | integer | yes | NULL | |
| gpa_min_no_test | numeric(3,2) | yes | NULL | Test-optional higher GPA |
| updated_at | timestamptz | NOT NULL | now() | |

RLS: Service role write; anon/service read. PRIMARY KEY (award_year, tier_name).

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
| coa | numeric(12,2) | yes | NULL | Cost of Attendance (for Demonstrated Need formula) |
| source | text | yes | NULL | 'college_scorecard' \| 'manual' \| 'search' |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | |

RLS: Public read. Insert/update via service role or admin.

Indexes: `institution_type`, `state`, `name` (gin for search).

### 6a. User Saved Schools (COA Comparison)

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| user_id | uuid | NOT NULL | — | FK → profiles |
| institution_id | uuid | NOT NULL | — | FK → institutions |
| saved_at | timestamptz | NOT NULL | now() | |
| PRIMARY KEY (user_id, institution_id) | | | | |

RLS: User SELECT/INSERT/DELETE own rows. Used for COA comparison: average COA of saved schools vs. user SAI → Need-to-Merit transition.

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

## 8. Merit Tier Lookup (DB, Award-Year Scoped)

Merit tier cutoffs stored in `merit_tier_config` table, keyed by `award_year`. Agent and matching logic read from DB using `profiles.award_year` (default current year if null). No hardcoded tier values in code. Seed script populates initial values from institutional grids (CDS, Bright Futures, HOPE); admin can update when guidelines change.

---

## 9. Entity Relationships

```
auth.users
├── profiles (student or parent)
│   ├── sat_total, act_composite, spikes, merit_filter_preference, award_year (009)
│   └── preferences.merit_filter_preference (fallback)
├── parent_students (parent_id, student_id)
├── parent_contributions (parent_id, student_id)
└── user_saved_schools (user_id, institution_id) — COA comparison

scholarships
└── category: merit | need_based | need_blind | ...

institutions (curated + search; includes coa)
career_outcomes (BLS seed + extend)
sai_zone_config (award_year)
merit_tier_config (award_year, tier_name)
```

---

## 10. Cross-Feature Impact

| Consumer | Impact |
|----------|--------|
| load-profile.ts | Add sat_total, act_composite, spikes, award_year; read sai_zone_config and merit_tier_config by award_year; derive merit_tier; pass merit_filter_preference, sai_above_threshold |
| pii-scrub.ts | Scrub spikes (labels only, no PII); extend AnonymizedProfileSchema |
| TrustScorer / scholarship-upsert | Set category need_blind for .edu merit; merit for non-institutional merit |
| Advisor_Search | Use merit_filter_preference + merit_lean_threshold from sai_zone_config; filter/deprioritize need-based when merit-first |
| Coach_Prioritization | Prioritize merit/need_blind when SAI > merit_lean_threshold; respect merit_filter_preference |
| onboarding (saveAcademicProfile) | Add SAT, ACT, spikes, award_year fields |
| ROI comparison UI | Read institutions, career_outcomes; compute net price; COA comparison: user_saved_schools + institutions.coa vs. user SAI |
| COA comparison API/UI | GET user saved schools with COA; compute avg COA − SAI; show Need-to-Merit transition |
