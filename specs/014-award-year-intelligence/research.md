# Research: Award Year Intelligence (014)

**Branch**: `014-award-year-intelligence` | **Phase 0**

## 1. Merit-First Threshold Storage

**Decision**: Supabase config table (new `merit_first_config` or extend `sai_zone_config`).

**Rationale**: Spec clarification requires "configurable without code deployment." Existing `sai_zone_config` and `merit_tier_config` (009) use award-year-scoped config tables. A dedicated `merit_first_config` table (or a `merit_first_sai_threshold` column/key in a generic config table) allows runtime edits via migrations or admin UI. Aligns with 009 patterns.

**Alternatives considered**:
- Env var: Requires redeploy to change; rejected.
- Feature flag service: Adds external dependency; overkill for single numeric threshold.
- Hardcoded constant: Violates spec FR-007.

## 2. Award Year Selection Range

**Decision**: Current calendar year through 4 years ahead (e.g., 2025–2029).

**Rationale**: Spec clarification. Covers typical planning horizon (current seniors through early high school). Range computed at runtime: `[currentYear, currentYear + 4]`. Profile schema `awardYearSchema` (009) used 2024–2030; 014 extends to dynamic range.

**Alternatives considered**:
- Fixed 2-year range (009): Too narrow for 014.
- 6+ years: Unnecessary scope; deferred.

## 3. DB-First Trust Threshold

**Decision**: trust_score ≥ 60 (Vetted Commercial + High Trust).

**Rationale**: Spec clarification. Constitution §10 defines 60–79 (Vetted Commercial) and 80–100 (High Trust). Including both maximizes DB cache hit rate and reduces external API calls while maintaining quality bar.

**Alternatives considered**:
- trust_score ≥ 80 only: Stricter; fewer DB hits; rejected per clarification.

## 4. Cycle Verification Schema

**Decision**: Separate `scholarship_cycle_verifications` table (1:many with scholarships).

**Rationale**: Spec clarification. Supports per-cycle verification history, "verified for cycle X?" checks, and re-verification logic. Columns: `scholarship_id`, `academic_year`, `verified_at`. No schema changes to scholarships table.

**Alternatives considered**:
- Columns on scholarships: Single cycle only; no history; rejected.
- JSONB on scholarships: Awkward querying; rejected.

## 5. Alternative Path Fallback

**Decision**: Omit comparison when no data; continue with other Coach content.

**Rationale**: Spec clarification. Avoids empty placeholders or misleading sections. Coach flow continues without Alternative Path block when 009 curated catalog has no data for user's context.

**Alternatives considered**:
- Placeholder text: Misleading; rejected.
- Generic external link: Out of scope; rejected.

## 6. Discovery Criteria Expansion (C1)

**Decision**: Extend AnonymizedProfile and QueryGenerator to include state (already done), saved institution names from user_saved_schools, and optional first_generation, parent_employer_category, identity_eligibility_categories when profile supports them. Load saved institutions in Advisor_Search before calling QueryGenerator; pass as anonymized attributes. Identity-based attributes use broad labels only (e.g., "minority-eligible")—never raw PII.

**Rationale**: FR-013 through FR-016 require state, institutions, first-gen, parent employer, and identity-based angles. State is already in AnonymizedProfile (C2 fix). user_saved_schools exists (009); join to institutions for names. Profile extensions (first_generation, parent_employer_category) are optional—014 specifies behavior when present; 002/008 may add schema later.

**Alternatives considered**:
- New profile migration in 014: Adds scope; deferred to 002/008. Query generation handles missing fields gracefully.
- Raw institution IDs in prompt: Institution names are safer (no PII); LLM can generate "scholarships for [University X]" queries.
