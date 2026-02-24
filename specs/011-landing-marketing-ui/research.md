# Research: TuitionLift Landing Page and Marketing UI

**Branch**: 011-landing-marketing-ui | **Date**: 2026-02-24  
**Spec**: [spec.md](./spec.md)

## Resolved Technical Decisions

### 1. Stats Storage: Dedicated `landing_stats` Table

**Decision**: Create a `landing_stats` table with one row (or a small set of keyed rows) storing pre-computed platform metrics: `total_debt_lifted_cents`, `student_count`, `match_rate_percent`. Fetched on page load; updated via scheduled job or trigger. Fallback when empty: display generic "Join thousands" or hide widget.

**Rationale**: Live aggregation across `applications` + `scholarships` + `profiles` is expensive and slows landing page load. Landing is anonymous/public; no auth required. A dedicated stats row allows fast reads and decouples landing from application-schema changes.

**Alternatives considered**:
- Live SQL aggregate on each request: Rejected—adds latency and load for a public page.
- Materialized view: Overkill; single-row table is simpler.
- Hardcoded fallback only: Spec requires Supabase source; fallback is for empty state, not default.

**Reference**: Spec FR-004, FR-008a; Constitution §7 (no mock data in production).

---

### 2. Hero Form → Auth Flow: Redirect with Email Prefill

**Decision**: Hero form collects email only. On submit, validate email (Zod), then redirect to `/onboard?email=...`. Onboard Step 1 reads `searchParams.get('email')` and pre-fills the email input. User completes password and signs up.

**Rationale**: Spec says "Direct to Auth (sign-up)". Existing Auth flow is `/onboard` with email+password. Single-step email capture on landing reduces friction; password is collected on the next screen. No new Auth endpoints.

**Alternatives considered**:
- Magic link (passwordless): Would require Supabase magic link config; spec assumes standard sign-up.
- Two-step form on landing (email → password): Adds complexity; onboard already has that flow.
- Link only (no email capture): Loses lead capture; spec requires form.

**Reference**: Spec clarification "Hero form submission routing"; apps/web/app/(onboard)/onboard, step1-form.tsx.

---

### 3. Scroll-Triggered Reveals: CSS + Intersection Observer

**Decision**: Use `IntersectionObserver` with a small React hook to add `data-visible` or a class when section enters viewport. CSS handles animation (opacity, transform) via `@media (prefers-reduced-motion: reduce)` to disable or simplify. No Framer Motion dependency for landing.

**Rationale**: Spec FR-010 requires "smooth, scroll-triggered animation" and FR-016 requires reduced-motion support. Intersection Observer is native, lightweight. Tailwind + CSS transitions are sufficient. Framer Motion adds bundle size; Constitution prefers KISS.

**Alternatives considered**:
- Framer Motion: Heavier; use if project already depends on it for other screens. 010 does not use it.
- CSS-only (scroll-driven animations): Limited browser support in 2026.
- No animation: Spec explicitly requires it.

**Reference**: [Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API), [prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion).

---

### 4. Testimonials Table and RLS

**Decision**: Create `testimonials` table: `id`, `quote`, `star_rating` (1–5), `avatar_url` (nullable), `student_name` (e.g., "Sarah M."), `class_year` (e.g., "2027"), `display_order` (int, for sorting), `created_at`. RLS: public SELECT (anon + authenticated); INSERT/UPDATE/DELETE service-role only. Zod schema for validation.

**Rationale**: Spec FR-005: quote, star rating, avatar, student identifier. Stored in Supabase, fetched on load. Display names only—no PII. Curated content; no user-generated testimonials in MVP.

**Alternatives considered**:
- JSONB in a single row: Less flexible; harder to reorder and manage.
- Link to profiles: Would expose PII; testimonials are curated, not live user data.

**Reference**: Spec FR-005; Constitution §4 (no data brokering).

---

### 5. Debt Lifted Widget: Platform Aggregate from `landing_stats`

**Decision**: The "Debt Lifted" impact widget on landing displays `total_debt_lifted` from `landing_stats` (formatted as currency). Same source as stats bar. Fallback when null: hide widget or show "Join our community" placeholder text—never fake numbers.

**Rationale**: Per-user debt lifted is in `applications` + `scholarships`; landing needs platform-wide total. Reuse `landing_stats` row. FR-008a requires fallback when unavailable.

**Reference**: Spec FR-008a; 010 DebtLiftedRing (user-scoped, different use case).

---

### 6. Floating Preview Cards: Static Placeholders

**Decision**: Hero floating cards (e.g., "Gates Scholarship" match card, "Today's Priorities" task list) use static exemplar content defined in component props or a small config object. No backend fetch. Subtle motion via CSS (e.g., `animate-pulse` or gentle float) with `prefers-reduced-motion` check.

**Rationale**: Spec clarification: "Static placeholder visuals (no real data)". Keeps hero fast and simple.

**Reference**: Spec FR-009; clarification "Floating preview cards content".

---

### 7. Privacy, Terms, Contact Pages

**Decision**: Create minimal pages at `/privacy`, `/terms`, `/contact`. Placeholder content (lorem or short boilerplate) is acceptable for MVP; legal copy can be added later. Contact page: simple form (email, message) that submits to a Server Action (e.g., stores in a `contact_submissions` table or sends email via Resend)—or static "Email us at support@tuitionlift.com" for initial launch.

**Rationale**: Spec FR-012: links route to in-app pages. "Pages exist or will be created"—this spec creates them.

**Alternatives considered**:
- External links to Notion/Google Docs: Spec says in-app routes.
- Full legal review before launch: Deferred; placeholders acceptable per spec.

**Reference**: Spec FR-012.

---

### 8. Stats Aggregation Strategy for `landing_stats`

**Decision**: Populate `landing_stats` via a one-off or periodic job (e.g., cron, GitHub Action, or Supabase Edge Function). Queries: (1) `SUM(s.amount)` from applications a JOIN scholarships s WHERE a.status='awarded' AND a.confirmed_at IS NOT NULL; (2) `COUNT(*)` from profiles; (3) Match rate: derived from discovery_completions or a defined formula—document in data-model. Seed script for initial values (e.g., $2.4M, 15K, 94%).

**Rationale**: Keeps landing reads cheap. Aggregation logic lives in one place. Match rate formula TBD—can start with a static 94% until discovery analytics are defined.

**Reference**: Spec assumptions; applications/scholarships schema.
