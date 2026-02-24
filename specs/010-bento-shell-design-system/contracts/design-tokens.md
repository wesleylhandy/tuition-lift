# Design Tokens Contract: Bento Shell

**Branch**: 010-bento-shell-design-system | **Date**: 2025-02-24

## Purpose

Central definition of colors, typography, and spacing for the TuitionLift Premium Academic shell. All dashboard components MUST use these tokens (Tailwind utilities) instead of hardcoded values.

---

## Color Palette

| Token | Hex | Tailwind Class | Usage |
|-------|-----|----------------|-------|
| Navy | #1A1A40 | `text-navy`, `bg-navy` | Primary text, headers, brand |
| Electric Mint | #00FFAB | `text-electric-mint`, `bg-electric-mint` | Accents, progress, amounts, CTAs |
| Slate | #64748B | `text-slate`, `bg-slate` | Secondary text, subtitles |
| Clarity Off-White | #fafaf9 | `bg-off-white`, `text-off-white` | Page and card backgrounds |

**Contrast**: Navy on Off-White and Electric Mint on Navy meet WCAG 2.1 AA. Slate on Off-White meets 4.5:1 for normal text.

---

## Typography

| Token | Font | Tailwind | Usage |
|-------|------|----------|-------|
| Heading | Playfair Display | `font-heading` | Section titles, welcome message |
| Body | Inter | `font-body` | Body text, labels, placeholders |

**Base font size**: 16px minimum (html or body). Headings scale up from base.

---

## Spacing & Touch Targets

| Requirement | Value | Implementation |
|-------------|-------|-----------------|
| Minimum touch target | 44×44px | `min-h-[44px] min-w-[44px]` or padding to achieve |
| Focus indicator | Visible | `focus-visible:ring-2 focus-visible:ring-navy` or similar |

---

## Tailwind @theme (globals.css)

```css
@theme {
  --color-navy: #1a1a40;
  --color-electric-mint: #00ffab;
  --color-slate: #64748b;
  --color-off-white: #fafaf9;
  --font-heading: "Playfair Display", ui-serif, serif;
  --font-body: "Inter", ui-sans-serif, sans-serif;
}
```

Fonts loaded via `next/font/google` in root layout; variables overridden at `:root`.
