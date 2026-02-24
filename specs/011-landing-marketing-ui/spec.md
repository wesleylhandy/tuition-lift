# Feature Specification: TuitionLift Landing Page and Marketing UI

**Feature Branch**: `011-landing-marketing-ui`  
**Created**: 2026-02-24  
**Status**: Draft  
**Input**: User description: "Implement the TuitionLift Landing Page and Marketing UI"

## Overview

Deliver a high-converting landing page that reflects the 'Premium Academic' brand, capturing visitor interest through a compelling hero section, social proof, and feature showcase. The page guides visitors from awareness to action (email capture, sign-up) with a cohesive visual identity and responsive layout. Primary CTAs route through the Auth flow.

**Reference Wireframes**: `specs/wireframes/TuitionLift__Landing-above-fold.png`, `specs/wireframes/TuitionLift__Landing-below-fold.png`

## Clarifications

### Session 2026-02-24

- Q: Stats & Testimonials data source — Where do stats (e.g., $2.4M Lifted, 15K Students) and testimonials come from? → A: Supabase tables (fetch on page load)
- Q: Hero form submission routing — Does email go to waitlist, Auth, or both? → A: Direct to Auth (sign-up)
- Q: Floating preview cards content — Are hero floating cards real/dynamic or static? → A: Static placeholder visuals (no real data)
- Q: Privacy, Terms, Contact destinations — Where do footer links route? → A: In-app routes (/privacy, /terms, /contact); pages exist or will be created
- Q: "Debt Lifted" impact widget — Required or optional? → A: Required; use stats from Supabase or fallback

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Discover Value and Capture Email (Priority: P1)

A visitor arrives at the landing page and immediately understands TuitionLift's value proposition: "Lift the Weight of Student Debt." They see the hero heading, supporting copy, and a smooth email capture form labeled "Start your scholarship journey" with an input for email and a primary "Get Started" CTA. Below the form, reassurance text indicates "Free to start. No credit card required."

**Why this priority**: Core conversion flow; email capture drives lead generation and Auth flow initiation.

**Independent Test**: Can be fully tested by loading the landing page, verifying the hero content and form are visible, entering a valid email, and clicking "Get Started" to confirm routing into the Auth flow. Delivers the primary conversion outcome.

**Acceptance Scenarios**:

1. **Given** a visitor on the landing page, **When** the page loads, **Then** they see the hero heading "Lift the Weight of Student Debt" with "Student Debt" visually emphasized
2. **Given** a visitor views the hero, **When** they scroll or read, **Then** they see the supporting copy: AI Coach finds, matches, and helps win scholarships; no endless searches; smart, personalized guidance
3. **Given** a visitor on the hero section, **When** they view the form, **Then** they see "Enter your email" input, "Get Started" (or equivalent) button, and "Free to start. No credit card required" text
4. **Given** a visitor enters a valid email and clicks "Get Started", **When** the action completes, **Then** they are routed through the Auth flow (sign-up or login)
5. **Given** a visitor enters an invalid email format, **When** they attempt to submit, **Then** they see a clear validation message and cannot proceed until the email is valid

---

### User Story 2 - Trust Through Social Proof (Priority: P1)

A visitor evaluates TuitionLift's credibility before signing up. They see a stats bar displaying "$2.4M Lifted", "15K Students", and "94% Match Rate" (or equivalent metrics). They also see a testimonial grid with student quotes, star ratings, avatars, and names (e.g., "Sarah M. Class of 2027") to reinforce trust.

**Why this priority**: Social proof increases conversion; visitors need evidence before committing.

**Independent Test**: Can be tested by loading the landing page and verifying the stats bar and testimonial grid render correctly with real or placeholder content (no hardcoded mock data in production per constitution). Delivers trust signals.

**Acceptance Scenarios**:

1. **Given** a visitor on the landing page, **When** they view the hero or adjacent area, **Then** they see a stats bar with at least three metrics (e.g., total lifted amount, student count, match rate)
2. **Given** a visitor scrolls to the social proof section, **When** they view it, **Then** they see a heading such as "Trusted by students nationwide" and a grid of testimonial cards
3. **Given** each testimonial card, **When** displayed, **Then** it includes a quote, star rating, avatar, and student identifier (name and class year)
4. **Given** the page has no testimonials or stats available, **When** content is loading or empty, **Then** the section shows appropriate loading or empty states—no fake or placeholder testimonials in production

---

### User Story 3 - Understand Core Features (Priority: P2)

A visitor wants to learn what TuitionLift offers. They see a section titled "Everything You Need to Win Scholarships" with a subheading describing AI-powered insights from discovery to submission. A feature grid (bento layout) showcases four core capabilities: AI Matching, Trust Verification, Smart Deadlines, and Coach's Guidance—each with an icon, title, and brief description.

**Why this priority**: Feature awareness supports conversion but is secondary to hero and social proof.

**Independent Test**: Can be tested by scrolling to the feature section and verifying all four features are visible and readable. Delivers clarity on product value.

**Acceptance Scenarios**:

1. **Given** a visitor on the landing page, **When** they scroll to the feature section, **Then** they see the section title and subheading
2. **Given** the feature grid, **When** displayed, **Then** it shows four features: AI Matching, Trust Verification, Smart Deadlines, Coach's Guidance
3. **Given** each feature card, **When** displayed, **Then** it includes an icon, bold title, and short description
4. **Given** the feature section, **When** sections scroll into view, **Then** content is revealed with a smooth animation (e.g., opacity and vertical-offset transition; non-jarring)

---

### User Story 4 - Convert via Prominent CTA (Priority: P2)

A visitor decides to sign up. They see a prominent call-to-action section with the heading "Ready to Lift Your Tuition Burden?" and supporting copy such as "Join thousands of students who are winning scholarships and reducing debt with TuitionLift." A primary "Start Free Today" (or equivalent) button routes them through the Auth flow. The header also includes a "Login / Sign Up" control for returning users.

**Why this priority**: Multiple CTAs maximize conversion opportunities; secondary to initial hero capture.

**Independent Test**: Can be tested by clicking "Start Free Today" and "Login / Sign Up" and verifying both route through Auth. Delivers clear paths to sign-up and login.

**Acceptance Scenarios**:

1. **Given** a visitor on the landing page, **When** they view the header, **Then** they see a "Login / Sign Up" control that routes through Auth
2. **Given** a visitor scrolls to the CTA section, **When** they view it, **Then** they see the "Ready to Lift Your Tuition Burden?" heading, supporting copy, and a prominent "Start Free Today" button
3. **Given** a visitor clicks "Start Free Today" or "Login / Sign Up", **When** the action completes, **Then** they are routed through the Auth flow
4. **Given** the page loads, **When** the user views the layout, **Then** a "Debt Lifted" or similar impact widget (e.g., "$47,250", "-$12K this month") is displayed to reinforce value; sourced from Supabase stats or fallback when unavailable

---

### User Story 5 - Experience Premium Visual Identity (Priority: P3)

A visitor experiences a cohesive, premium academic brand. The page uses a dark navy gradient background with electric mint accents for key elements (headings, CTAs, icons). Floating preview cards (e.g., "Gates Scholarship" with match strength, "Today's Priorities" with task list) appear in the hero area to hint at product value; cards are static exemplars (no real data). Sections reveal smoothly as the user scrolls.

**Why this priority**: Visual polish enhances trust and conversion; functional requirements take precedence.

**Independent Test**: Can be tested by viewing the page on desktop and mobile, verifying color palette, floating cards, and scroll-triggered section reveals. Delivers a distinctive, premium feel.

**Acceptance Scenarios**:

1. **Given** a visitor on the landing page, **When** they view the page, **Then** the dominant background is a dark navy gradient and key accents (CTAs, highlights, icons) use electric mint
2. **Given** the hero area, **When** displayed, **Then** at least two floating preview cards are visible (e.g., scholarship match card, priorities/tasks card) with low-amplitude motion (e.g., gentle float) to draw attention
3. **Given** the user scrolls through sections, **When** each major section enters the viewport, **Then** it animates into view with a smooth, non-jarring reveal
4. **Given** a visitor on any viewport, **When** they view the page, **Then** the layout adapts fluidly from 375px (mobile) to 1440px (desktop) without horizontal overflow or broken layout

---

### User Story 6 - Navigate Footer and Legal Links (Priority: P3)

A visitor needs access to legal and contact information. The footer displays the TuitionLift logo, copyright, and links to Privacy, Terms, and Contact.

**Why this priority**: Required for trust and compliance; lower priority than conversion flows.

**Independent Test**: Can be tested by verifying footer content and that Privacy, Terms, and Contact links are present and functional.

**Acceptance Scenarios**:

1. **Given** a visitor scrolls to the bottom, **When** they view the footer, **Then** they see the TuitionLift logo/branding, copyright (e.g., "© 2026 TuitionLift")
2. **Given** the footer, **When** displayed, **Then** it includes links for Privacy, Terms, and Contact
3. **Given** a visitor clicks Privacy, Terms, or Contact, **When** the action completes, **Then** they navigate to the appropriate page or resource

---

### Edge Cases

- **Invalid or duplicate email**: When a visitor submits an email that fails validation (format, rate limit, or already registered), the system displays a clear, user-friendly message and does not expose implementation details or PII
- **Auth flow unavailable**: Landing CTAs validate email and redirect to /onboard; Auth service errors (e.g., unreachable) are displayed on the onboard page. No stack traces or technical errors exposed.
- **Empty or loading testimonials/stats**: When testimonials or stats are not yet available, the section shows a loading skeleton or empty state—never fake or hardcoded placeholder content in production
- **Mobile viewport**: On 375px width, the floating cards, bento grid, and form stack or reflow appropriately; touch targets remain at least 44×44px
- **Reduced motion preference**: When the user prefers reduced motion, scroll-triggered reveals and floating animations are simplified or disabled to respect accessibility preferences

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The landing page MUST display a hero section with the heading "Lift the Weight of Student Debt" (with "Student Debt" visually emphasized), supporting copy, and an email capture form
- **FR-002**: The email capture form MUST include an email input, a primary "Get Started" (or equivalent) button, and reassurance text ("Free to start. No credit card required")
- **FR-003**: The "Get Started" and "Login / Sign Up" controls MUST route users through the Auth flow when clicked
- **FR-004**: The landing page MUST display a stats bar with at least three metrics (e.g., total lifted amount, student count, match rate)
- **FR-005**: The landing page MUST display a testimonial grid with a section heading, multiple testimonial cards, and each card MUST include quote, star rating, avatar, and student identifier
- **FR-006**: The landing page MUST display a feature showcase section with title, subheading, and a grid of four features: AI Matching, Trust Verification, Smart Deadlines, Coach's Guidance
- **FR-007**: Each feature card MUST include an icon, title, and short description
- **FR-008**: The landing page MUST display a CTA section with heading "Ready to Lift Your Tuition Burden?", supporting copy, and a "Start Free Today" (or equivalent) button that routes through Auth
- **FR-008a**: A "Debt Lifted" (or similar) impact widget MUST be displayed; values sourced from Supabase stats or fallback when data unavailable
- **FR-009**: The hero area MUST display at least two floating preview cards (e.g., scholarship match card, priorities/tasks card) with subtle motion; cards use static placeholder content (exemplars) — no backend fetch or real user data
- **FR-010**: Major sections MUST reveal with a smooth, scroll-triggered animation when they enter the viewport
- **FR-011**: The page MUST use a dark navy gradient background with electric mint accents for CTAs, highlights, and icons
- **FR-012**: The footer MUST display TuitionLift branding, copyright, and links to Privacy, Terms, and Contact; links route to in-app pages at /privacy, /terms, /contact
- **FR-013**: The layout MUST adapt fluidly from 375px to 1440px viewport width without horizontal overflow or broken layout
- **FR-014**: The system MUST validate email format before submission and display clear validation messages for invalid input
- **FR-015**: When testimonials or stats are loading or empty, the system MUST show loading or empty states—no fake placeholder content in production
- **FR-016**: The system MUST respect reduced-motion preferences by simplifying or disabling scroll-triggered and floating animations when requested
- **FR-017**: All interactive elements MUST meet minimum 44×44px touch target size and WCAG 2.1 AA contrast requirements

### Key Entities

- **Visitor**: A user viewing the landing page; may be anonymous or authenticated (header may vary)
- **Lead**: A visitor who submits email via the hero form; routed directly into Auth sign-up flow
- **Testimonial**: A student quote with star rating, avatar, name, and class year; displayed in the social proof section; stored in and fetched from Supabase
- **Stat**: An aggregate metric (e.g., $2.4M Lifted, 15K Students) displayed in the stats bar; computed/aggregated and stored in Supabase; fetched on page load
- **Feature**: One of four core capabilities (AI Matching, Trust Verification, Smart Deadlines, Coach's Guidance) displayed in the bento grid

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete the email capture flow (enter email, click Get Started) in under 30 seconds
- **SC-002**: The landing page achieves Lighthouse Performance and Best Practices scores of 90+ each when measured on representative viewports
- **SC-003**: The layout renders correctly and remains usable at 375px, 768px, and 1440px viewport widths with no horizontal overflow
- **SC-004**: All primary CTAs ("Get Started", "Start Free Today", "Login / Sign Up") successfully route users into the Auth flow
- **SC-005**: The page passes WCAG 2.1 AA accessibility checks for contrast, semantics, and touch targets
- **SC-006**: Section content (hero, stats, testimonials, features, CTA) is visible and readable within 3 seconds of page load on typical broadband connection

## Assumptions

- Auth flow (sign-up, login) is implemented or will be implemented separately; this spec assumes CTAs route to that flow
- Stats ($2.4M Lifted, 15K Students, 94% Match Rate) and testimonials are sourced from Supabase tables; fetched on page load; implementation defines aggregation for stats and schema for testimonial records
- Privacy, Terms, and Contact are in-app routes (/privacy, /terms, /contact); pages exist or will be created as part of this or prior work
- Hero form submission routes directly to Auth (sign-up) flow; no waitlist for this conversion path
- Brand colors (dark navy #1A1A40, electric mint #00FFAB) align with the TuitionLift design system and 010-bento-shell-design-system
