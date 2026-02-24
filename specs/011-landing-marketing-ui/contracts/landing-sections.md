# Landing Page Sections Contract

**Branch**: 011-landing-marketing-ui | **Date**: 2026-02-24  
**Spec**: [spec.md](../spec.md)

## Purpose

Define data contracts and component expectations for each landing page section. Ensures consistent loading, empty, and content states per FR-015.

---

## 1. Hero Section

**Component**: `HeroSection`

| Data Source | Type | Fallback |
|-------------|------|----------|
| None (static) | — | — |

**Props**: None for data. Optional `onGetStarted` callback for form submit.

**Content**:
- Heading: "Lift the Weight of Student Debt" with "Student Debt" emphasized
- Supporting copy (static)
- Email input, "Get Started" button, "Free to start. No credit card required"
- Up to 2 floating preview cards (static exemplars)

**Form behavior**: On submit → validate email (Zod) → redirect to `/onboard?email=...` or Server Action.

---

## 2. Stats Bar

**Component**: `StatsBar`

| Data Source | Type | Fallback |
|-------------|------|----------|
| `landing_stats` (single row) | Server Component fetch | Empty state: hide or "Join our community" |

**Shape**:
```typescript
interface LandingStats {
  total_debt_lifted_cents: number;
  student_count: number;
  match_rate_percent: number;
}
```

**Display**: At least 3 metrics: e.g., "$2.4M Lifted", "15K Students", "94% Match Rate". Format: `Intl.NumberFormat` for currency; compact notation for large numbers.

**States**: `loading` (skeleton) | `content` | `empty` (fallback UI).

---

## 3. Testimonial Grid

**Component**: `TestimonialGrid`

| Data Source | Type | Fallback |
|-------------|------|----------|
| `testimonials` (ordered by display_order) | Server Component fetch | Empty state: section hidden or minimal "Trusted by students" text only |

**Shape**:
```typescript
interface Testimonial {
  id: string;
  quote: string;
  star_rating: number;
  avatar_url: string | null;
  student_name: string;
  class_year: string;
}
```

**Display**: Section heading "Trusted by students nationwide"; grid of cards with quote, stars, avatar, "Name, Class of YYYY".

**States**: `loading` (skeleton) | `content` | `empty` (no fake testimonials).

---

## 4. Feature Showcase

**Component**: `FeatureShowcase`

| Data Source | Type | Fallback |
|-------------|------|----------|
| Static config | In-component or const | — |

**Content**: Four features—AI Matching, Trust Verification, Smart Deadlines, Coach's Guidance. Each: icon, title, short description. Bento-style grid.

**States**: `content` only (no loading).

---

## 5. CTA Section

**Component**: `CtaSection`

| Data Source | Type | Fallback |
|-------------|------|----------|
| `landing_stats` (optional, for Debt Lifted widget) | Same as Stats Bar | Hide widget if unavailable |

**Content**: "Ready to Lift Your Tuition Burden?"; supporting copy; "Start Free Today" button → Auth. Optional Debt Lifted widget showing platform total.

**States**: `content` (CTA always visible); widget has `content` | `empty`.

---

## 6. Footer

**Component**: `LandingFooter`

| Data Source | Type | Fallback |
|-------------|------|----------|
| None | — | — |

**Content**: Logo, "© 2026 TuitionLift", links to /privacy, /terms, /contact.

---

## 7. Header (Global)

**Component**: `LandingHeader`

**Content**: Logo, "Login / Sign Up" → `/onboard` (or dedicated login route if exists).

---

## Scroll and Motion

- Sections use `IntersectionObserver` + CSS for scroll-triggered reveal.
- `prefers-reduced-motion: reduce` → disable or simplify animations.
- Floating cards: subtle motion; respect reduced-motion.
