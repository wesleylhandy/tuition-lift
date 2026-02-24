# Project Analysis: 007-scout-vision-ingestion

**Date**: 2025-02-18  
**Branch**: `007-scout-vision-ingestion`  
**Scope**: Consistency analysis across spec, plan, data-model, contracts, tasks, and codebase

---

## 1. Executive Summary

| Area | Status | Notes |
|------|--------|-------|
| Spec ↔ Plan alignment | ✅ Pass | Plan implements all spec FRs and user stories |
| Plan ↔ Data-model alignment | ✅ Pass | Entities and storage match |
| Plan ↔ Contracts alignment | ✅ Pass | API and Server Actions match plan structure |
| Tasks ↔ Plan alignment | ⚠️ Minor | Tasks reference `packages/database`; repo uses `packages/database` (same; @repo/db is package name) |
| Cross-spec alignment (002, 004, 006) | ⚠️ Action needed | ExtractedScholarshipData → scholarship-upsert mapping needs design |
| Constitution compliance | ✅ Pass | All checks satisfied |
| Implementation status | 🔴 Not started | Zero Scout code; 0/38 tasks complete |

---

## 2. Spec ↔ Plan Traceability

### Functional Requirements Coverage

| FR | Spec | Plan / Tasks | Trace |
|----|------|---------------|-------|
| FR-001 | Unified modal: input field + drop zone | T010, T011, T013, T021 | ✅ |
| FR-002 | Extract Name, Reward, Deadline, Eligibility, URL | T023, T024, T025 | ✅ |
| FR-003 | Flag "Research Required" | T016, T017, T023 | ✅ |
| FR-004 | Verify extracted URLs for cycle freshness | T008, T009, T025 | ✅ |
| FR-005 | Trust Score 0–100 | T008, T009, TrustScorer reuse | ✅ |
| FR-006 | Processing HUD (Reading, Searching, Trust) | T028, T029, T030 | ✅ |
| FR-007 | User verification before persistence | T017, T018, T019 | ✅ |
| FR-008 | Editable fields during verification | T016, T017 | ✅ |
| FR-009 | Fuzzy-match deduplication | T031, T032, T034 | ✅ |
| FR-010 | Flag "Potentially Expired" | T033 | ✅ |
| FR-011 | Coach/Advisor persona messages | T029, T030 | ✅ |
| FR-012 | Persist only on confirm | T018 | ✅ |
| FR-013 | Reject unsupported file types | T021, T022, T027 | ✅ |
| FR-014 | File size limit 10 MB | T002, T004, T021, T022 | ✅ |

**Verdict**: All 14 FRs trace to plan and tasks.

### User Story Coverage

| Story | Spec | Tasks | Independent Test |
|-------|------|-------|------------------|
| US1 | Add by URL/Name | T013–T020 | ✅ Enter URL → verify form → confirm |
| US2 | Add by File | T021–T027 | ✅ Upload PDF/image → extract → confirm |
| US3 | Processing HUD | T028–T030 | ✅ Steps + persona messages visible |
| US4 | Verification step | T016–T018 | ✅ Editable fields, Confirm/Cancel |
| US5 | Dedup + Cycle | T031–T034 | ✅ Duplicate warning; expired flag |

---

## 3. Cross-Spec Alignment

### 002 (DB) — scholarships, applications

- **Scholarships**: 007 plan reuses `scholarship-upsert` pattern from 004. ExtractedScholarshipData must map to `DiscoveryResult` + `ScholarshipMetadata` for upsert.
- **Applications**: Insert with `user_id`, `scholarship_id`, `academic_year`, `status=draft`. Uses `getCurrentAcademicYear()` from 006. ✅ Aligned.
- **Gap**: `ExtractedScholarshipData` has `title`, `amount`, `deadline`, `eligibility`, `url`, `trust_score`, `verification_status`. `ScholarshipMetadata` requires `source_url`, `snippet`, `scoring_factors`, `trust_report`, `categories`. Scout data does not include `snippet` or `scoring_factors` — derive defaults (e.g., `snippet: ""`, `scoring_factors` from TrustScorer output when URL verified) or extend `confirmScoutScholarship` to build metadata.

**Recommendation**: Add T018 subtask or new task: "Map ExtractedScholarshipData to ScholarshipMetadata (source_url=url, snippet=eligibility or empty, scoring_factors from TrustScorer when available)."

### 004 (Advisor Discovery) — TrustScorer, CycleVerifier, TavilyClient

- **Reuse**: manual_research node must call `scoreTrust`, `verifyCycle` from 004. ✅ Plan states this.
- **Tavily**: URL/name search uses Tavily; existing `TavilyClient` and `query-generator` are profile-based. Scout search by URL/name is different (direct lookup vs. generated queries). May need `tavily.search` with URL or name as query.
- **DiscoveryResult vs ExtractedScholarshipData**: Different shapes. Scout flow produces ExtractedScholarshipData; confirm action must convert to scholarship row + application. Consider a shared `toDiscoveryResult` or `toScholarshipRow` adapter.

### 006 (Scholarship Inbox) — Dashboard, Application Tracker

- **Entry point**: T012 adds Scout CTA to dashboard or Application Tracker. 006 dashboard has BentoGrid (Match Inbox, Game Plan, Application Tracker). Scout modal trigger fits best in Application Tracker header or a floating action.
- **Refresh**: On confirm, Application Tracker must refresh (Realtime or refetch). 006 uses `use-realtime-applications`. Scout confirm should invalidate or trigger refetch. ✅ T019 says "refresh tracker."

---

## 4. Constitution Compliance

| Principle | Check | Status |
|-----------|-------|--------|
| Mission (Search → Verify → Apply) | Scout extends with manual ingestion | ✅ |
| Technical standards | Next.js, React, LangGraph, Supabase; agent in apps/agent | ✅ |
| PII | No raw PII to Vision LLM; document content only | ✅ |
| Trust Filter | TrustScorer, CycleVerifier reused | ✅ |
| Forbidden | No inline styles, floating promises, mock data | Plan compliant |
| Data integrity | .edu/.gov 2×; dynamic cycle; past due = Expired | ✅ |
| WCAG 2.1 AA | T037 verifies Scout components | ✅ |

---

## 5. Implementation Status

### Codebase Check (2025-02-18)

| Artifact | Exists | Path |
|----------|--------|------|
| Scout API (process, status) | ❌ | apps/web/app/api/scout/ |
| Scout components | ❌ | apps/web/components/dashboard/scout/ |
| Scout Server Actions | ❌ | apps/web/lib/actions/scout.ts |
| manual_research node | ❌ | apps/agent/lib/nodes/manual-research.ts |
| Scout extract (vision, pdf) | ❌ | apps/agent/lib/scout/ |
| scout_runs migration | ❌ | packages/database/supabase/migrations/ |
| scout_uploads bucket | ❓ | Supabase (not in repo) |
| pdf-parse, fuzzball deps | ❌ | apps/agent/package.json |

**Progress**: 0/38 tasks complete. Implementation has not started.

### Terminology Clarification

- **"Scout" in 003/004**: Refers to `Advisor_Search` (discovery phase). Not the same as 007 "Scout" (manual Add Scholarship).
- **Naming**: 007 Scout = Manual Scout / Scout Vision Ingestion. Avoid conflating with discovery scouting.

---

## 6. Gaps & Recommendations

### High Priority

1. **ExtractedScholarshipData → ScholarshipMetadata mapping** — **RESOLVED**  
   - data-model.md §4 now documents full mapping; ExtractedScholarshipData extended with optional `scoring_factors`, `trust_report`; T018 updated.

2. **Tavily for URL/name** — **RESOLVED**  
   - research.md §11 documents Scout Tavily usage (URL or name as query); T009 updated.

### Medium Priority

3. **Scout run orchestration** — **RESOLVED**  
   - research.md §12: direct invocation of manual_research_node for MVP; T006 updated.

4. **packages/database vs @repo/db**  
   - Tasks say "packages/database"; implementation uses `@repo/db`. Consistent—package name is @repo/db, folder is packages/database. No change needed.

### Low Priority

5. **ScoutProcessingHUD step enum**  
   - Contract uses `ScoutStep`; data-model has `reading_document`, `searching_sources`, `calculating_trust`, `complete`, `error`. Ensure API and UI use same enum.

---

## 7. Consistency Checklist

| Item | Status |
|------|--------|
| All spec FRs mapped to tasks | ✅ |
| All user stories have phases | ✅ |
| Data-model entities in tasks | ✅ |
| Contract endpoints in tasks | ✅ |
| No orphan tasks | ✅ |
| Task IDs sequential (T001–T038) | ✅ |
| [P] and [Story] labels correct | ✅ |
| File paths in task descriptions | ✅ |
| Cross-spec dependencies documented | ⚠️ Mapping gap noted |
| Constitution Check in plan | ✅ |

---

## 8. Next Steps

1. **Before implementation**: Resolve ExtractedScholarshipData → ScholarshipMetadata mapping (add to T018 or new task).
2. **Phase 1 start**: Run T001–T004 (deps, bucket, migration, env).
3. **Phase 2 start**: T005–T012 after Phase 1.
4. **MVP validation**: After Phase 3, run quickstart.md manual tests.
