# Data Model: Award Year Intelligence (014)

**Branch**: `014-award-year-intelligence` | **Spec**: [spec.md](./spec.md)

## 1. Entity Summary

| Entity | Change | Purpose |
|--------|--------|---------|
| profiles | Extend | award_year already exists (009); extend validation range to current+4 years |
| applications | Extend | Add need_match_score; academic_year derived from profile award_year |
| scholarships | No schema change | Referenced by scholarship_cycle_verifications |
| scholarship_cycle_verifications | **New** | Per-cycle verification history; re-verification checks |
| merit_first_config | **New** | Configurable SAI threshold for Merit-First Mode |

## 2. Schema Changes

### 2.1 profiles (extend)

- **award_year**: Already exists. Update Zod range from `2024..2030` to dynamic `currentYear..(currentYear+4)` at validation boundary. DB column unchanged (integer).

### 2.2 applications (extend)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| need_match_score | numeric(5,2) | YES | 0–100; persisted when tracking from Discovery Feed; null for Scout path |

- **academic_year**: Already exists. MUST be derived from profile award_year when creating/updating (format `YYYY-YYYY`).
- **Uniqueness**: (user_id, scholarship_id, academic_year) unchanged.

### 2.3 scholarship_cycle_verifications (new)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | PK, default gen_random_uuid() |
| scholarship_id | uuid | NO | FK → scholarships(id) ON DELETE CASCADE |
| academic_year | text | NO | Format YYYY-YYYY |
| verified_at | timestamptz | NO | Default now() |
| created_at | timestamptz | NO | Default now() |

- **Unique**: (scholarship_id, academic_year)
- **RLS**: Public read (agent, web); service-role write
- **Index**: idx_scholarship_cycle_verifications_scholarship_id, idx_scholarship_cycle_verifications_academic_year

### 2.4 merit_first_config (new)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| award_year | integer | NO | PK; scoped per award year |
| merit_first_sai_threshold | integer | NO | SAI above this = Merit-First Mode (e.g., 15000) |
| updated_at | timestamptz | NO | Default now() |

- **RLS**: Public read; service-role write
- **Pattern**: Mirrors sai_zone_config (009)

## 3. Migration Order

Next migration numbers per existing sequence (highest: 34): 35, 36, 37.

1. `00000000000035_applications_need_match_score.sql` — ADD COLUMN need_match_score
2. `00000000000036_scholarship_cycle_verifications.sql` — CREATE TABLE
3. `00000000000037_merit_first_config.sql` — CREATE TABLE

## 4. Validation Rules (Zod)

### applications

- `need_match_score`: z.number().min(0).max(100).nullable().optional()
- `academic_year`: regex `^\d{4}-\d{4}$` (unchanged)

### profiles

- `award_year`: z.number().int().min(currentYear).max(currentYear+4).nullable().optional() — validate at boundary (e.g., Server Action) using runtime year

### scholarship_cycle_verifications

- `academic_year`: z.string().regex(/^\d{4}-\d{4}$/)

## 5. Key Relationships

```
profiles (award_year) ──► applications.academic_year (derived: award_year → "YYYY-YYYY")
profiles (award_year) ──► discovery query injection
profiles (sai) + merit_first_config ──► Merit-First Mode activation
scholarships ──► scholarship_cycle_verifications (1:many)
applications ──► need_match_score from DiscoveryResult when tracking from feed
```

## 6. Indexes

- `scholarship_cycle_verifications`: idx on (scholarship_id), idx on (academic_year) for "verified for cycle X?" lookups
- `applications`: existing idx_applications_user_id, idx_applications_scholarship_id sufficient
