# Contract: Match Card (Extended)

**Branch**: 013-expandable-widget-logic | **Date**: 2025-03-06

## Purpose

Extend Match Card per FR-008, FR-009, FR-010. Every card displays Trust Shield, Match Strength bar, and Coach's Take.

---

## MatchCard Props (Extended)

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| `id` | string | Yes | Match ID |
| `scholarshipId` | string | Yes | For Track/Dismiss |
| `title` | string | Yes | Scholarship title |
| `url` | string | Yes | External link |
| `trustScore` | number \| null \| undefined | No | 0–100; Trust Shield badge (FR-008) |
| `matchStrength` | number \| null \| undefined | No | 0–100; progress bar (FR-009) **NEW** |
| `coachTakeText` | string \| null \| undefined | No | Coach's Take (FR-010) |
| `amount` | number \| null | No | USD |
| `deadline` | string \| null | No | ISO date |
| `discoveryRunId` | string \| null | No | For dismiss |
| `isTracked` | boolean | No | Track button state |
| `onDismissSuccess` | `() => void` | No | Callback after dismiss |
| `onTrackSuccess` | `() => void` | No | Callback after track |

---

## MatchStrengthBar (New Component)

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| `value` | number \| null \| undefined | No | 0–100; null → placeholder ("—" or hide) |

**Display**: Progress bar with numeric percentage (e.g. "94%"). Placeholder when null per SC-004.

---

## Placeholder Behavior (SC-004)

- **Trust Shield**: null/undefined → neutral gray badge or hide.
- **Match Strength**: null/undefined → "—" or hide bar.
- **Coach's Take**: null/undefined → hide element.

Never show raw errors or broken layout.
