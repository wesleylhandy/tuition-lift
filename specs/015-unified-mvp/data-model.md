# Data Model: Unified MVP (015)

**Branch**: `015-unified-mvp` | **Spec**: [spec.md](./spec.md)

## 1. Entity Summary

| Entity | Change | Purpose |
|--------|--------|---------|
| scholarships | Extend | Add content_hash for identity propagation and dedup |
| user_saved_schools | Extend | Add status (applied, accepted, committed) for college list |
| applications | Extend | Add merit_tag for Coach prioritization |
| discovery_config | **New** | Rate limits (cooldown, per_day_cap) and deep-scout limits |

## 2. Schema Changes

### 2.1 scholarships (extend)

| Column | Type | Nullable | Description |
|--------|------|----------|--------------|
| content_hash | text | YES | SHA-256 of canonical fields (url, title, deadline, amount); used for dedup and identity propagation |

- **Index**: UNIQUE on content_hash WHERE content_hash IS NOT NULL (for dedup); non-unique index for lookup.
- **Computation**: At discovery/insert: hash(url || title || deadline || coalesce(amount::text,'')).

### 2.2 user_saved_schools (extend)

| Column | Type | Nullable | Description |
|--------|------|----------|--------------|
| status | text | YES | applied, accepted, committed; default 'applied' |

- **Constraint**: CHECK (status IN ('applied', 'accepted', 'committed')).
- **RLS**: Add UPDATE policy (user owns row); existing SELECT/INSERT/DELETE unchanged.

### 2.3 applications (extend)

| Column | Type | Nullable | Description |
|--------|------|----------|--------------|
| merit_tag | text | YES | Persisted when Tracking from discovery; e.g., "merit", "need_blind" |

- **Validation (Zod)**: merit_tag: z.string().max(50).nullable().optional()

### 2.4 discovery_config (new)

| Column | Type | Nullable | Description |
|--------|------|----------|--------------|
| id | text | NO | PK; single row key e.g. 'default' |
| cooldown_minutes | integer | NO | Min minutes between discovery runs per user; default 60 |
| per_day_cap | integer | NO | Max discovery runs per user per day; default 5 |
| max_depth | integer | NO | Deep-scout max crawl depth; default 2 |
| max_links_per_page | integer | NO | Max child links to follow per page; default 50 |
| max_records_per_run | integer | NO | Max extracted records per run; default 500 |
| updated_at | timestamptz | NO | Default now() |

- **RLS**: Public read (agent, web); service-role write.
- **Seed**: One row id='default' with defaults.

## 3. Migration Order

Next migration numbers (highest existing: 44; spec 016 used 40–44). Use 45, 46, 47, 48.

1. `00000000000045_scholarships_content_hash.sql` — ADD COLUMN content_hash; CREATE UNIQUE INDEX
2. `00000000000046_user_saved_schools_status.sql` — ADD COLUMN status; CHECK constraint; UPDATE policy
3. `00000000000047_applications_merit_tag.sql` — ADD COLUMN merit_tag
4. `00000000000048_discovery_config.sql` — CREATE TABLE discovery_config; seed row

## 4. Validation Rules (Zod)

### applications (extend)

- `merit_tag`: z.string().max(50).nullable().optional()

### user_saved_schools (extend)

- `status`: z.enum(['applied', 'accepted', 'committed']).optional().default('applied')

## 5. Key Relationships

```
scholarships.content_hash ──► Identity propagation in discovery pipeline; Track/Dismiss use scholarship_id (uuid)
user_saved_schools.status ──► Coach commitment logic: when status='committed', elevate institutional scholarships
applications.merit_tag ──► Coach prioritization in merit-first mode; persisted on Track from discovery
discovery_config ──► Enforced at discovery trigger (cooldown, cap); deep-scout node reads limits
profiles (award_year, intended_major, state, gpa_unweighted) ──► Profile completeness for protected route redirect
```

## 6. Profile Completeness (No Schema Change)

Required for protected route access: `award_year`, `intended_major`, `state`, `gpa_unweighted` (or legacy `gpa`). SAI optional. Enforced in middleware/layout.

## 7. Debt Lifted (No Schema Change)

Existing logic: SUM(scholarships.amount) for applications where status='awarded' AND confirmed_at IS NOT NULL. Display format (K/M abbreviation) configurable in UI layer; defaults default K at 1,000, M at 1M.
