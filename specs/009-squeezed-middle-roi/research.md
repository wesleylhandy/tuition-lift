# Research: Squeezed Middle & Alternative ROI Engine

**Branch**: `009-squeezed-middle-roi` | **Date**: 2025-02-24  
**Spec**: [spec.md](./spec.md)

## 1. SAI Threshold Configuration

**Decision**: Store SAI threshold in `app_settings` table (key-value) with `.env` override for environment-specific tuning. Default 15,000.

**Rationale**: Spec requires configurable threshold. Database allows runtime changes without redeploy; .env supports per-environment overrides (e.g., staging vs production). Follows TuitionLift pattern for config in DB (cf. `profiles.preferences`).

**Alternatives considered**:
- `.env` only — simpler but requires redeploy for changes.
- Hardcoded constant — violates spec's "configurable" requirement.

---

## 2. Merit Tier Cutoffs (GPA / Test Scores)

**Decision**: Define three fixed tiers (Top, Strong, Standard) with documented GPA/SAT/ACT ranges. Store tier definitions in `packages/database` as a config module; design schema to support future expansion (e.g., JSONB config table or versioned tier config).

**Rationale**: Spec requires fixed, documented cutoffs. Three tiers balance simplicity and matching granularity. Config module keeps cutoffs in code for version control; future enhancement can migrate to DB.

**Proposed cutoffs** (to be finalized in plan):

| Tier | GPA Unweighted | SAT (EBRW + Math) | ACT Composite |
|------|----------------|-------------------|---------------|
| Top | ≥3.8 | ≥1400 | ≥32 |
| Strong | 3.5–3.79 | 1260–1399 | 28–31 |
| Standard | 3.0–3.49 | 1100–1259 | 24–27 |

Below Standard: no tier (excluded from merit-tier matching but may still match general merit). Design allows adding tiers or adjusting cutoffs via config without schema change.

---

## 3. Year-5 Income Data (BLS / NACE)

**Decision**: Use BLS Occupational Employment and Wage Statistics (OEWS) for mean annual wages by occupation. Map majors to SOC codes via NCES CIP→SOC crosswalk. Seed initial dataset for top ~100 majors; extend via batch jobs from BLS Public Data API or bulk downloads.

**Rationale**: BLS OEWS is authoritative, free, and provides wage data by occupation. NACE focuses on new grads; BLS covers broader workforce. CIP→SOC mapping exists from NCES. "Year-5" is approximated by using current mean wages (typical ~5-year post-grad equivalent for many occupations).

**Alternatives considered**:
- NACE First-Destination Survey — newer-grad focused but limited occupation detail.
- PayScale — commercial; licensing cost.

**Data access**: BLS Public Data API (requires registration, 500 queries/day). Bulk CSV/Excel downloads available for full OEWS. Prefer bulk load for base catalog; API for incremental refresh.

---

## 4. Institutional Net Price & Merit (College Scorecard)

**Decision**: Use College Scorecard API (`api.data.gov`) for net price by income tier and institutional data. Fields: `cost.tuition_revenue_per_fte`, `aid.federal_loan_rate`, `earnings.1_yrs_after_completion.median` (and similar). Net price variables (e.g., `NPT4_PUB`) represent average net cost after aid. Automatic merit is inferred from institutional aid data where available.

**Rationale**: College Scorecard is federal, free with API key, and covers net price by income. Does not separate "automatic merit" explicitly; we derive from aid components or display sticker vs. net where data exists.

**Alternatives considered**:
- IPEDS directly — more granular but requires complex table joins.
- Peterson's / commercial — licensing cost.

---

## 5. Alternative-Path Institution Catalog

**Decision**: Curated `institutions` table seeded from College Scorecard (filter by `school.degrees_awarded` and `school.locale` for community colleges, trade schools) plus manual additions from .edu sources. Optional search extends catalog via College Scorecard API by name/state. Trust: .edu sources only for seed; search results validated before add.

**Rationale**: Spec requires hybrid: curated base + optional search. College Scorecard includes community colleges and trade programs. Manual curation for .edu seed ensures quality; search adds breadth.

---

## 6. Parent Role & Linking

**Decision**: New `parent_students` link table (parent_id, student_id, linked_at). Parent account uses Supabase Auth with `role = 'parent'` in `auth.users.raw_app_meta_data` or separate `profiles.role` column. RLS: parents SELECT only profiles of linked students; UPDATE limited to income and manual scholarships (enforced in app logic; RLS allows parent to update only allowed columns or use a dedicated `parent_contributions` table).

**Rationale**: Spec requires distinct parent role, link/unlink, and restricted permissions. Link table supports multiple students per parent (future) and audit. Restricting updates to income/scholarships suggests a `parent_contributions` or constrained update path to avoid RLS complexity on full profiles.

**Refined approach**: Parent writes to `profiles` via Server Actions that validate role and only allow `parent_income_override`, `manual_scholarships` (new JSONB or related table). Student unlink deletes `parent_students` row; parent loses access immediately.

---

## 7. Scholarship Tagging: Merit-Only vs Need-Blind vs Need-Based

**Decision**: Add `need_blind` to `scholarship_category` enum. TrustScorer / Advisor_Verify infer and set:
- `merit` — merit-only (non-institutional)
- `need_blind` — institutional merit (admissions need-blind)
- `need_based` — need-based (existing)

Detection: `.edu` domain + merit signals → need_blind; private org + merit → merit; need signals → need_based. Coach prioritization treats merit and need_blind equivalently when SAI > threshold.

**Rationale**: Spec requires Advisor to tag Merit-Only and Need-Blind. Distinct enum supports filtering and future analytics. Need-blind is institutional; merit is broader.

---

## 8. PII Scrubbing for Spikes / Extracurriculars

**Decision**: Extend `scrubPiiFromProfile` and `AnonymizedProfileSchema` to pass only anonymized spike labels (e.g., "Water Polo", "Leadership")—no team names, coach names, or addresses. Use generic placeholders for any free-text (e.g., "{{SPIKE_1}}") when content could contain PII. Spikes stored as array of strings in profiles; scrub replaces with category labels only.

**Rationale**: Spec FR-008 requires PII scrubbing on all extracurricular data. Activity labels (Water Polo) are low-risk; specific org/team names could be PII. Conservative: pass only standardized activity codes or placeholders.
