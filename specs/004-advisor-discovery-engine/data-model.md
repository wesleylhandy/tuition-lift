# Data Model: Advisor Discovery Engine

**Branch**: `004-advisor-discovery-engine` | **Date**: 2025-02-13  
**Spec**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

## Overview

This feature extends the orchestration state (DiscoveryResult) and the scholarships table. It does not add new top-level tables; it enriches DiscoveryResult with Trust Report and verification status, and adds migrations to scholarships for metadata JSONB and upsert support.

---

## 1. DiscoveryResult (Extended)

Extends the 003 TuitionLiftState `discovery_results` field. Each item in the array:

| Field             | Type   | Notes                                                        |
|-------------------|--------|--------------------------------------------------------------|
| id                | string | Unique per result                                            |
| title             | string | Scholarship title                                            |
| url               | string | Source URL (used for dedupe, upsert); same as metadata.source_url |
| trust_score       | number | 0–100; Reputation Engine                                     |
| need_match_score  | number | 0–100; SAI/gap alignment; used by 006 for Match Inbox ordering |
| discovery_run_id  | uuid   | From orchestration config (003); attached by Advisor_Verify; 006 uses for dismissals scoping |
| trust_report      | string | Human-readable explanation of trust score (FR-009)           |
| verification_status| string | `verified` \| `ambiguous_deadline` \| `needs_manual_review` \| `potentially_expired` |
| categories        | string[]| e.g. `["need_based", "field_specific"]`                      |
| deadline          | string | ISO date or null if ambiguous                               |
| amount            | number | Dollar amount if parsed; nullable                            |

**Source**: Advisor_Verify node populates after Trust Scorer and Cycle Verifier run.

---

## 2. Scholarships Table Extensions (002 Migration)

Add to `scholarships` (packages/database migration):

| New/Changed      | Type         | Constraints              | Notes                                    |
|------------------|--------------|---------------------------|------------------------------------------|
| metadata         | JSONB        | nullable                  | Search provenance; see schema below      |
| UNIQUE(url)      | partial index| WHERE url IS NOT NULL     | For upsert by URL (FR-015)               |

**metadata JSONB schema**:
```json
{
  "source_url": "string",
  "snippet": "string",
  "scoring_factors": {
    "domain_tier": "high" | "vetted" | "under_review",
    "longevity_score": 0,
    "fee_check": "pass" | "fail"
  },
  "trust_report": "string",
  "categories": ["need_based", "field_specific"],
  "verification_status": "verified" | "ambiguous_deadline" | "needs_manual_review" | "potentially_expired"
}
```

**Migration**:
- Add `metadata JSONB` column (nullable)
- Add `CREATE UNIQUE INDEX scholarships_url_unique ON scholarships(url) WHERE url IS NOT NULL`
- Keep `category` (single) for now; store additional in `metadata.categories` per research

---

## 3. Query Generation Input/Output

| Concept    | Type        | Notes                                          |
|------------|-------------|------------------------------------------------|
| Input      | AnonymizedProfile | { gpa, major, incomeBracket, pellStatus } |
| Output     | string[]    | 3–5 distinct search query strings              |

Never includes: full_name, SSN, raw SAI.

---

## 4. Trust Scorer Output

| Field           | Type   | Notes                                  |
|-----------------|--------|----------------------------------------|
| trust_score     | number | 0–100                                  |
| trust_report    | string | Explanatory text                       |
| domain_tier     | string | high \| vetted \| under_review         |
| longevity_score | number | 0–25 contribution                      |
| fee_check       | string | pass \| fail (fail → score 0)          |

---

## 5. Cycle Verifier Output

| Field               | Type   | Notes                                        |
|---------------------|--------|----------------------------------------------|
| verification_status | string | verified \| ambiguous_deadline \| needs_manual_review \| potentially_expired |
| deadline            | string | ISO date if verified; null if ambiguous      |
| active              | boolean| true if deadline after today and in cycle; false when past due (Constitution §8) |

---

## 6. Zod Schemas (Validation)

Extend or add:

- `DiscoveryResultSchema` — add trust_report, verification_status, categories; trust_score 0–100
- `ScholarshipMetadataSchema` — metadata JSONB shape
- `AnonymizedProfileSchema` — for query generator input (no PII)
