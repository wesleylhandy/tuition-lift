# Data Model: @repo/db Core Infrastructure

**Branch**: `002-db-core-infrastructure` | **Date**: 2025-02-13  
**Spec**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

## Entity Definitions

### 1. waitlist

| Field        | Type     | Constraints                    | Notes                                      |
|-------------|----------|--------------------------------|--------------------------------------------|
| id          | uuid     | PK, default gen_random_uuid()  |                                            |
| email       | text     | NOT NULL, UNIQUE               |                                            |
| referral_code | text   | NOT NULL, UNIQUE               | 8-char alphanumeric, generated on insert   |
| referred_by | uuid     | FK → waitlist.id, nullable     | Set only when valid referrer exists        |
| created_at  | timestamptz | NOT NULL, default now()     |                                            |

**RLS**: Public insert (allow anyone to join); public select for own row and referrer counts (or service-role for admin).

**Validation**: Zod schema must validate email format; referred_by must reference existing id when provided; invalid referral_code → leave referred_by null (FR-005a).

---

### 2. profiles

| Field             | Type       | Constraints                    | Notes                                |
|-------------------|------------|--------------------------------|--------------------------------------|
| id                | uuid       | PK, FK → auth.users(id)        | 1:1 with auth user                   |
| full_name         | text       | nullable                       |                                      |
| intended_major    | text       | nullable                       |                                      |
| gpa               | numeric(3,2) | nullable                     | 0.00–4.00                             |
| state             | text       | nullable                       | US state code (e.g. CA)               |
| interests         | text[]     | nullable                       | Array of interest tags                |
| **Financial Aid Layer** |        |                                |                                      |
| sai               | integer    | nullable                       | Student Aid Index; range -1500 to 999999 |
| pell_eligibility_status | pell_eligibility_status | nullable                       | Enum: `eligible`, `ineligible`, `unknown` |
| household_size    | integer    | nullable                       | Number in household; positive        |
| number_in_college | integer    | nullable                       | Household members in college         |
| created_at        | timestamptz | NOT NULL, default now()      |                                      |
| updated_at        | timestamptz | NOT NULL, default now()      | For optimistic locking (FR-011)       |

**RLS**: SELECT, UPDATE, INSERT only where `auth.uid() = id`. No access to other users' profiles.

**Enum `pell_eligibility_status`** (used by profiles): `eligible`, `ineligible`, `unknown`.

**Validation**: Zod schema for all fields; gpa in range; sai in -1500..999999; pell_eligibility_status must be one of enum values; household_size and number_in_college positive; updated_at used for optimistic locking.

---

### 3. scholarships

| Field     | Type         | Constraints                | Notes                                |
|----------|--------------|----------------------------|--------------------------------------|
| id       | uuid         | PK, default gen_random_uuid() |                                      |
| title    | text         | NOT NULL                   |                                      |
| amount   | numeric(12,2) | nullable                  | Dollar amount                        |
| deadline | date         | nullable                   |                                      |
| url      | text         | nullable                   | Application URL                      |
| trust_score | integer    | NOT NULL, default 0         | 0–100; for Trust Filter              |
| category | scholarship_category | nullable           | Enum: see below                      |
| created_at | timestamptz | NOT NULL, default now()   |                                      |

**Enum `scholarship_category`**: e.g. `merit`, `need_based`, `minority`, `field_specific`, `other`.

**RLS**: Public read (anon/authenticated); insert/update/delete via service-role or admin only (curated data).

**Validation**: Zod schema; trust_score 0–100; deadline validated per Trust Filter (Constitution §4, §8).

---

### 4. applications

| Field          | Type       | Constraints                         | Notes                          |
|----------------|------------|-------------------------------------|--------------------------------|
| id             | uuid       | PK, default gen_random_uuid()        |                                |
| user_id        | uuid       | NOT NULL, FK → auth.users(id)       |                                |
| scholarship_id | uuid       | NOT NULL, FK → scholarships(id)      |                                |
| academic_year  | text       | NOT NULL                            | Format "YYYY-YYYY"              |
| status         | application_status | NOT NULL, default 'draft' | See enum below                  |
| priority_score | numeric(5,2) | nullable                         |                                |
| created_at     | timestamptz | NOT NULL, default now()            |                                |
| updated_at     | timestamptz | NOT NULL, default now()            | Optimistic locking (FR-011)     |

**Unique**: (user_id, scholarship_id, academic_year) — FR-013.

**Enum `application_status`**: `draft`, `submitted`, `awarded`, `rejected`, `withdrawn`.

**RLS**: Authenticated users can CRUD only their own rows (where user_id = auth.uid()).

**Validation**: Zod schema; academic_year format; uniqueness enforced by DB + Zod.

---

### 5. checkpoints

LangGraph checkpoint storage. Schema follows `langgraph-checkpoint-postgres` conventions:

| Concept      | Notes                                                                 |
|-------------|-----------------------------------------------------------------------|
| thread_id   | Identifier for the conversation/thread                                |
| checkpoint_id | Identifier for the specific checkpoint within the thread           |
| checkpoint  | BYTEA — serialized checkpoint payload (opaque)                        |

**RLS**: Service-role or agent-only write/read. No user-facing RLS; agent accesses via service credentials.

**Note**: Exact table structure defined by `langgraph-checkpoint-postgres`; `@repo/db` provides connection config and migration runner if needed. Per spec, checkpoint payloads are opaque.

---

## Relationships

```
waitlist.referred_by → waitlist.id
profiles.id → auth.users.id
applications.user_id → auth.users.id
applications.scholarship_id → scholarships.id
```

---

## State Transitions

### application.status

```
draft → submitted (user submits)
draft → withdrawn (user cancels)
submitted → awarded | rejected | withdrawn
```

Zod schemas can enforce valid transitions if desired; at minimum, status must be one of the enum values.

---

## Indexes (Recommended)

| Table        | Index                          | Purpose                    |
|-------------|---------------------------------|----------------------------|
| waitlist    | UNIQUE(email)                   | Enforced by column          |
| waitlist    | UNIQUE(referral_code)           | Enforced by column          |
| waitlist    | INDEX(referred_by)              | Referrer count queries      |
| profiles    | PK(id)                          | 1:1 lookup                  |
| scholarships| INDEX(deadline), INDEX(category)| Discovery, Trust Filter    |
| applications| UNIQUE(user_id, scholarship_id, academic_year) | FR-013    |
| applications| INDEX(user_id), INDEX(scholarship_id) | User/app listing      |
