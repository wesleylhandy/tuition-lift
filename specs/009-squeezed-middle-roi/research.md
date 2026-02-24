# Research: Squeezed Middle & Alternative ROI Engine

**Branch**: `009-squeezed-middle-roi` | **Date**: 2025-02-24  
**Spec**: [spec.md](./spec.md)

## 1. SAI Aid Zones (Configurable, Award-Year Scoped)

**Decision**: Store SAI zone boundaries in DB, keyed by award year. Table `sai_zone_config` (or JSONB in `app_settings` per year) with: `pell_cutoff`, `grey_zone_end`, `merit_lean_threshold`. No hardcoded cutoffs. User selects award year (current or next year only); lookup uses selected year. Federal guidelines (e.g., Pell ~7,395) change yearly—config allows continual fine-tuning without deploy.

**Rationale**: Clarification requires configurable ranges, award-year scoping, and avoidance of arbitrary filtering. DB-driven config supports year-by-year updates; per-year keys allow preload of future years and historical reference.

**Alternatives considered**:
- Single threshold in app_settings — does not support tiered zones or award-year variation.
- Hardcoded constants — violates spec; blocks fine-tuning when federal guidelines change.

---

## 2. Merit Tier Cutoffs (Configurable, Award-Year Scoped)

**Decision**: Store merit tier cutoffs in DB, keyed by award year. Tiers (e.g., Presidential/Elite, Dean's/Excellence, Merit/Achievement, Incentive/Recognition) with GPA/SAT/ACT ranges per tier. Design MUST support future per-institution grids (CDS Section C9/H2A, state programs like Bright Futures, HOPE/Zell Miller). Test-optional handling: configurable higher GPA thresholds when no test score; indicate "Test score may be required for highest awards" when score-lock applies.

**Rationale**: Clarification requires merit tiers configurable in DB/admin for year-by-year updates; institutional Merit Aid Grids vary by school. CDS and state program grids are the authoritative sources. Test-optional "tax" (higher GPA when no test) and score-lock scenarios are common.

**Initial tier structure** (configurable; values from institutional grids):

| Tier | SAT Range | ACT Range | GPA (Unweighted) |
|------|-----------|-----------|------------------|
| Presidential/Elite | 1500–1600 | 33–36 | 3.9–4.0+ |
| Dean's/Excellence | 1350–1490 | 29–32 | 3.7–3.89 |
| Merit/Achievement | 1200–1340 | 25–28 | 3.5–3.69 |
| Incentive/Recognition | 1100–1190 | 21–24 | 3.0–3.49 |

Below lowest tier: may still match general merit. Design allows per-institution override in future.

---

## 2a. Award Year Selection

**Decision**: User selects application/award year; options limited to current calendar year and next year only (e.g., 2026, 2027). Stored in `profiles.award_year`. Supports semester-driven scholarship cycles. Default to current year when not set; require selection during intake or before merit-first/COA lookup.

**Rationale**: Clarification requires user-selectable award year with constrained options. Semester-driven cycles (not just full academic year) justify current+next only. No need for multi-year history in selection.

---

## 2b. COA Comparison (SAI vs. Saved Schools)

**Decision**: Build SAI vs. average COA of saved schools in scope for 009. Demonstrated Need formula: COA − SAI = Financial Need. When saved schools exist with COA data, compute per-school and average; visually indicate Need-to-Merit transition (positive = need-based eligible; zero/negative = merit-based). When no saved schools: fall back to configurable SAI zones; show "Add saved schools to see your Need-to-Merit transition."

**Rationale**: Clarification puts COA comparison in scope. Most accurate threshold is school-specific; saved schools + COA enables personalized transition point. Requires `user_saved_schools` (or equivalent) linking users to institutions with COA; institutions table already has sticker_price/net_price—COA can be derived or added.

**Data source for COA**: College Scorecard provides cost data; institutions table stores sticker_price, net_price. Add `coa` (Cost of Attendance) column or derive from College Scorecard `cost.attendance.academic_year` if available. Net price ≠ COA; COA is published by each school (required for federal aid calc).

---

## 3. Year-5 Income Data (BLS / NACE)

**Docs**: [BLS API Documentation](https://www.bls.gov/developers/api_signature_v2.htm)

**Decision**: Use BLS Occupational Employment and Wage Statistics (OEWS) for mean annual wages by occupation. Map majors to SOC codes via NCES CIP→SOC crosswalk. Seed initial dataset for top ~100 majors; extend via batch jobs from BLS Public Data API or bulk downloads.

**Rationale**: BLS OEWS is authoritative, free, and provides wage data by occupation. NACE focuses on new grads; BLS covers broader workforce. CIP→SOC mapping exists from NCES. "Year-5" is approximated by using current mean wages (typical ~5-year post-grad equivalent for many occupations).

**Alternatives considered**:
- NACE First-Destination Survey — newer-grad focused but limited occupation detail.
- PayScale — commercial; licensing cost.

**Data access**: BLS Public Data API (requires registration, 500 queries/day). Bulk CSV/Excel downloads available for full OEWS. Prefer bulk load for base catalog; API for incremental refresh.

---

## 4. Institutional Net Price & Merit (College Scorecard)

**Docs**: [College Scorecard API Documentation](https://collegescorecard.ed.gov/data/api-documentation)

**Decision**: Use College Scorecard API (`api.data.gov`) for net price by income tier and institutional data. Fields: `cost.tuition_revenue_per_fte`, `aid.federal_loan_rate`, `earnings.1_yrs_after_completion.median` (and similar). Net price variables (e.g., `NPT4_PUB`) represent average net cost after aid. Automatic merit is inferred from institutional aid data where available.

**Rationale**: College Scorecard is federal, free with API key, and covers net price by income. Does not separate "automatic merit" explicitly; we derive from aid components or display sticker vs. net where data exists.

**Alternatives considered**:
- IPEDS directly — more granular but requires complex table joins.
- Peterson's / commercial — licensing cost.

---

## 5. Alternative-Path Institution Catalog

**Docs**: [College Scorecard API Documentation](https://collegescorecard.ed.gov/data/api-documentation) (see §4)

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
