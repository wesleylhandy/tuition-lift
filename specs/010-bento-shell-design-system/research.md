# Research: TuitionLift Bento Shell and Design System

**Branch**: 010-bento-shell-design-system | **Date**: 2025-02-24  
**Spec**: [spec.md](./spec.md)

## Resolved Technical Decisions

### 1. Design Tokens: Tailwind v4 @theme

**Decision**: Use Tailwind CSS v4 `@theme` block in `globals.css` (already present) to define the design system palette. Add `--color-slate`, update `--font-heading` and `--font-body` for Playfair Display and Inter. No `tailwind.config.js`; Tailwind v4 uses CSS-first configuration.

**Rationale**: Project already uses `@import "tailwindcss"` and `@theme` in `apps/web/app/globals.css`. Constitution prescribes Tailwind; extending the existing theme is the least invasive approach. Tailwind v4 deprecates JS config in favor of CSS variables.

**Alternatives considered**:
- Add `tailwind.config.js` for custom colors: Tailwind v4 prefers @theme; JS config is legacy.
- CSS custom properties only (no @theme): Less integration with Tailwind utilities; would need manual mapping.

**Reference**: [Tailwind CSS v4 - Theme configuration](https://tailwindcss.com/docs/v4), existing `globals.css`.

---

### 2. Font Loading: next/font

**Decision**: Use `next/font/google` to load Playfair Display (serif) and Inter (sans-serif). Apply via CSS variables in layout: `--font-heading` for Playfair, `--font-body` for Inter. Fonts are loaded at the root layout level for consistent application across the dashboard.

**Rationale**: Next.js font optimization reduces layout shift and improves performance. Per spec Assumptions, Playfair Display for headers and Inter for body. `next/font` provides automatic subsetting and preloading.

**Alternatives considered**:
- Link Google Fonts in layout: No subsetting; slower; multiple requests.
- System font stack only: Spec explicitly requires Playfair and Inter per wireframes.

**Reference**: [Next.js Font Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/fonts).

---

### 3. Bento Grid: 12-Column Base

**Decision**: Update the existing `BentoGrid` component from `grid-cols-4` (lg) to `grid-cols-12` base. Use `col-span-*` (1–12) for flexible composition. Responsive breakpoints: 1 col (mobile), 2 cols (sm), 4 cols (md), 12 cols (lg). Introduce `BentoGridItem` colSpan options that map to multiples of the 12-column base (e.g., colSpan 3 = 3/12, colSpan 4 = 4/12).

**Rationale**: Spec FR-011 requires a 12-column base. Current implementation uses 4 columns; extending to 12 provides finer layout control and matches wireframe proportions (e.g., Game Plan ≈ 4 cols, Discovery Feed ≈ 5 cols, Calendar ≈ 3 cols). Backward compatibility: map existing colSpan 2/4 to equivalent 12-col spans.

**Alternatives considered**:
- Keep 4-column grid: Does not satisfy FR-011.
- CSS Grid with named areas: More complex; 12-col with span is sufficient.

**Reference**: [Tailwind CSS Grid](https://tailwindcss.com/docs/display#grid), wireframe `TuitionLift__dashboard.png`.

---

### 4. Auth Protection for /dashboard

**Decision**: Extend middleware matcher to include `/dashboard` and protected routes. When path starts with `/dashboard` and `getUser()` returns no user, redirect to `/onboard`. The onboarding flow is the current auth entry point (signUp/signIn); a dedicated `/login` route does not exist. Use `/onboard` as redirect target until a dedicated login page is added.

**Rationale**: Spec FR-008 requires protected dashboard. Middleware runs before layout; redirecting unauthenticated users at middleware avoids rendering any dashboard UI. Per 008 plan, onboarding is the auth entry; returning users without a login page would need one—defer to future spec. For now, `/onboard` serves as the auth gate (Step 1 has email/password; returning users can be prompted to sign in).

**Alternatives considered**:
- Layout-level redirect: Slower; page starts rendering before redirect.
- Create /login now: Out of scope; onboarding covers signup; login UX can be added later.

**Reference**: [Supabase Auth - Next.js Middleware](https://supabase.com/docs/guides/auth/server-side/nextjs), middleware.ts, 008 plan.

---

### 5. Logo Placeholder: Inline SVG

**Decision**: Create an inline SVG placeholder component (e.g., "TL" monogram in Navy on off-white) in `components/dashboard/logo-placeholder.tsx`. Export from a single file; the asset is swapped by replacing the component or its `src` prop when the final logo exists. Use `next/image` for a future PNG/SVG file to allow non-inline swap without layout changes.

**Rationale**: Spec requires a replaceable placeholder. Inline SVG avoids an extra network request and ensures the logo area has correct dimensions. When the final logo arrives, replace the component with `<Image src="/logo.svg" />` or similar; layout (flex/gap) stays the same.

**Alternatives considered**:
- Static SVG file from /public: Requires file; inline is self-contained for placeholder phase.
- Emoji or text "TL": Less polished; SVG matches premium aesthetic.

**Reference**: wireframe branding, FR-009.

---

### 6. Section Shell Pattern: Loading | Error | Content

**Decision**: Each content section (welcome, stats row, Game Plan, Discovery Feed, Deadline Calendar) uses a state machine: `loading` | `error` | `content`. For this spec, sections default to `loading` (skeleton). When a section's data-fetch fails, transition to `error` with user-friendly message and retry button. A generic `SectionShell` component accepts `status`, `onRetry`, and `children`; renders skeleton, error UI, or children accordingly.

**Rationale**: Spec FR-015, FR-016, FR-018. Per clarification: distinct error state, user-friendly messages, no internals. A single shell component ensures consistent skeleton shape and error UX across all sections. Existing components (GamePlan, MatchInbox, ApplicationTracker) can be wrapped by SectionShell or refactored to use it internally.

**Alternatives considered**:
- Per-section custom error UI: Duplicated logic; harder to maintain.
- No error state (skeleton only): Violates FR-018.

**Reference**: AGENTS.md Error Handling, spec clarifications.

---

### 7. Icons: lucide-react

**Decision**: Add `lucide-react` to apps/web dependencies. Use for search, bell, graduation cap, and other wireframe icons. Icons are decorative or supplementary; ensure `aria-hidden` where appropriate and meaningful `aria-label` on icon-only buttons.

**Rationale**: Spec Assumptions require Lucide-react. Wireframe uses simple outlined icons consistent with Lucide. Package is lightweight and tree-shakeable.

**Reference**: [Lucide React](https://lucide.dev/docs/libraries/react).
