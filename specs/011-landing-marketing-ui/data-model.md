# Data Model: Landing Page and Marketing UI

**Branch**: 011-landing-marketing-ui | **Date**: 2026-02-24  
**Spec**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

## Entity Definitions

### 1. landing_stats

Platform-wide metrics displayed on the landing page. Single-row table (or keyed by `stat_key`) for fast reads.

| Field                 | Type        | Constraints                    | Notes                                       |
|-----------------------|-------------|---------------------------------|---------------------------------------------|
| id                    | uuid        | PK, default gen_random_uuid()   |                                             |
| stat_key              | text        | NOT NULL, UNIQUE                | e.g., 'default' for single row              |
| total_debt_lifted_cents| bigint     | NOT NULL, default 0             | Sum of confirmed awards across all users   |
| student_count         | integer     | NOT NULL, default 0             | COUNT(profiles.id)                          |
| match_rate_percent    | integer     | NOT NULL, default 0             | 0–100; formula TBD (e.g., discovery-based)  |
| updated_at            | timestamptz | NOT NULL, default now()         | Last aggregation run                        |

**RLS**: Public SELECT (anon + authenticated). INSERT/UPDATE/DELETE service-role only. No user writes.

**Validation**: Zod schema validates on read: total_debt_lifted_cents >= 0, student_count >= 0, match_rate_percent 0–100.

**Indexes**: None required (single or few rows).

---

### 2. testimonials

Curated student testimonials for social proof section.

| Field        | Type        | Constraints                    | Notes                              |
|--------------|-------------|--------------------------------|------------------------------------|
| id           | uuid        | PK, default gen_random_uuid()  |                                    |
| quote        | text        | NOT NULL, CHECK (char_length(quote) <= 500) | Max 500 chars                     |
| star_rating  | integer     | NOT NULL, CHECK (1–5)         |                                    |
| avatar_url   | text        | nullable                       | URL to image; optional              |
| student_name | text        | NOT NULL                       | Display name only (e.g., "Sarah M.")|
| class_year   | text        | NOT NULL                       | e.g., "2027"                        |
| display_order| integer     | NOT NULL, default 0            | Lower = higher in grid              |
| created_at   | timestamptz | NOT NULL, default now()       |                                    |

**RLS**: Public SELECT. INSERT/UPDATE/DELETE service-role only.

**Validation**: Zod: quote non-empty, max 500 chars; star_rating 1–5; student_name, class_year non-empty. No PII in quote or student_name.

**Indexes**: `idx_testimonials_display_order` for ordered fetch.

---

### 3. State Transitions

| Entity        | State           | Transition                       |
|---------------|-----------------|----------------------------------|
| landing_stats | Stale           | Cron/job runs → updated_at set   |
| testimonials  | Draft → Live    | display_order set; no status col  |

---

### 4. Relationships

- `landing_stats`: Standalone; no FKs.
- `testimonials`: Standalone; no FK to profiles (curated content).

---

### 5. Aggregation Logic (for landing_stats population)

```
total_debt_lifted_cents = SUM(scholarships.amount * 100)
  FROM applications a
  JOIN scholarships s ON a.scholarship_id = s.id
  WHERE a.status = 'awarded' AND a.confirmed_at IS NOT NULL
  AND s.amount IS NOT NULL AND s.amount > 0

student_count = SELECT COUNT(*) FROM profiles

match_rate_percent = 94  -- Static until discovery analytics defined; or formula from discovery_completions
```
