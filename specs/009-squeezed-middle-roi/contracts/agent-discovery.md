# Agent Discovery Extensions (009)

**Branch**: `009-squeezed-middle-roi` | **Date**: 2025-02-24  
**Spec**: [spec.md](../spec.md)

## Overview

Extensions to Advisor_Search, Advisor_Verify, and Coach_Prioritization for merit-first logic, scholarship tagging (Merit-Only, Need-Blind), and SAI-threshold behavior.

---

## 1. load-profile.ts Extensions

**Input**: profiles row (including sai, award_year, sat_total, act_composite, spikes), sai_zone_config (by award_year), merit_tier_config (by award_year).

**Lookup**:
- Resolve `award_year` = profiles.award_year ?? current calendar year (clamped to current or next).
- Read sai_zone_config WHERE award_year = resolved; use merit_lean_threshold for merit-first logic.
- Read merit_tier_config WHERE award_year = resolved; derive merit_tier from GPA/SAT/ACT (test-optional: use gpa_min_no_test when sat/act absent).

**Output** (add to state/config):
- `merit_filter_preference`: 'merit_only' | 'show_all'
- `sai_above_merit_threshold`: boolean (sai >= merit_lean_threshold from sai_zone_config)
- `merit_tier`: tier_name from merit_tier_config (e.g. 'presidential', 'deans', 'merit', 'incentive') or null

---

## 2. Advisor_Search / QueryGenerator

**Behavior**:
- QueryGenerator prompt: When merit-first (sai_above_merit_threshold), add "merit-based", "need-blind", "academic achievement" to query hints.
- Tavily results passed to Advisor_Verify; no filtering in Advisor_Search (categories assigned in Advisor_Verify).

---

## 3. Advisor_Verify

**Behavior**:
- TrustScorer + category inference: If `.edu` domain and content has merit signals (no need-based) → category `need_blind`. Else if merit signals → `merit`. Else need-based → `need_based`.
- When `sai_above_merit_threshold` and `merit_filter_preference === 'merit_only'`: Exclude need_based results from discovery_results before passing to Coach.
- When `merit_filter_preference === 'show_all'`: Include all; Coach will deprioritize need_based.
- scholarship-upsert: Add `need_blind` to VALID_CATEGORIES; upsert with correct category.
- Each result tagged for Coach: `metadata.merit_tag` = 'merit_only' | 'need_blind' | 'need_based' (derived from category).

---

## 4. Coach_Prioritization

**Behavior**:
- When `sai_above_merit_threshold`: Sort by merit/need_blind first, then need-based. If `merit_filter_preference === 'merit_only'`, need-based are already excluded (filtered in Advisor_Search).
- When `merit_filter_preference === 'show_all'`: Sort merit/need_blind first, need-based last.
- ROI score for merit-eligible: Boost `merit` and `need_blind` by fixed factor (e.g., +50 to effective score) so they rank in top 3 for Daily Game Plan (SC-004).

---

## 5. PII Scrubbing (pii-scrub.ts)

**Extensions**:
- `AnonymizedProfileSchema`: Add `spikes` as optional array of strings (activity labels only; no team names, coach names).
- `scrubPiiFromProfile`: Extract spikes from profiles; replace with standardized labels if raw could contain PII. Pass only safe labels (e.g., "Water Polo", "Leadership")—never "Coach Smith's team" or addresses.

---

## 6. State Schema (state.ts)

**Add to TuitionLiftState** (or config.configurable):
- `merit_filter_preference`
- `sai_above_merit_threshold`
- `merit_tier`
- `award_year` (resolved; used for config lookup)

Used by Advisor_Search, Advisor_Verify, Coach_Prioritization.
