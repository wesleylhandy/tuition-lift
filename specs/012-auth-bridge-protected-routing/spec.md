# Feature Specification: Authentication Bridge and Protected Routing

**Feature Branch**: `012-auth-bridge-protected-routing`  
**Created**: 2026-02-24  
**Status**: Draft  
**Input**: User description: "Implement the Authentication Bridge and Protected Routing for TuitionLift."

## Overview

Connect visitors from the landing page into authenticated flows via Email/Password and Magic Link. Implement route protection for dashboard and scout, with session-aware routing (login, onboarding). Provide a global navigation bar that reflects session state (Guest vs Authenticated). Login and signup views do not have dedicated wireframes but MUST match the visual identity of existing wireframes (Premium Academic, dark navy, electric mint accents).

**Reference Wireframes**: `specs/wireframes/TuitionLift__Landing-above-fold.png`, `specs/wireframes/TuitionLift__Landing-below-fold.png`, `specs/wireframes/TuitionLift__dashboard.png` — for visual consistency; login/signup views follow the same design system.

## Clarifications

### Session 2026-02-24

- Q: When a visitor submits their email in the landing page hero and clicks "Get Started", where should they go first? → A: Always to Check Email first; user chooses Magic Link or Password Setup from there.
- Q: Where should the intended destination be stored when an unauthenticated user hits a protected route, so they can be redirected there after login? → A: URL query param (e.g. /login?redirectTo=/dashboard).
- Q: What rate limits should apply to auth operations (login attempts, Magic Link requests, signup)? → A: 3 attempts/email/hour for Magic Link and signup; 5 failed logins per 15 min per email.
- Q: How long should Magic Links remain valid? → A: 1 hour (Supabase default).
- Q: What URL paths should the auth flow use? → A: /login for login; /auth/check-email, /auth/password-setup for signup flow.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Enter Auth Flow from Landing Page (Priority: P1)

A visitor enters their email in the landing page hero form and clicks "Get Started." The system routes them to a "Check Email" or "Password Setup" view where they can either receive a Magic Link (sent to their email) or set a password to complete account creation.

**Why this priority**: Core conversion path; without this, visitors cannot become authenticated users.

**Independent Test**: Can be fully tested by entering a valid email on the landing page, clicking Get Started, and verifying arrival at the Check Email or Password Setup view with clear next steps. Delivers the entry into the auth flow.

**Acceptance Scenarios**:

1. **Given** a visitor on the landing page, **When** they enter a valid email and click "Get Started", **Then** they are navigated to the Check Email view (from there they choose Magic Link or Password Setup)
2. **Given** a visitor arrives at the Check Email view, **When** they view it, **Then** they see instructions to either check their email for a Magic Link or set a password to complete signup
3. **Given** a visitor arrives at the Password Setup view, **When** they view it, **Then** they see fields to set a password (and optionally confirm) and a primary action to complete account creation
4. **Given** the visitor enters an invalid email on the landing form, **When** they submit, **Then** validation blocks progress with a clear message before any navigation

---

### User Story 2 - Sign In via Email/Password or Magic Link (Priority: P1)

A visitor completes authentication either by (a) setting a password and submitting the Password Setup form to create an account, or (b) clicking a Magic Link sent to their email. Upon successful authentication, the system routes them based on onboarding status: new users go to the Quick Onboarder (Spec 008); returning users with onboarding complete go to the dashboard.

**Why this priority**: Actual authentication and correct post-auth routing are essential; wrong routing would trap or confuse users.

**Independent Test**: Can be fully tested by completing sign-up (password setup) or Magic Link flow and verifying redirect to onboarding (new) or dashboard (returning). Delivers authenticated state and correct routing.

**Acceptance Scenarios**:

1. **Given** a new user completes Password Setup with valid credentials, **When** signup succeeds, **Then** they are redirected to the Quick Onboarder (Spec 008)
2. **Given** a returning user clicks a valid Magic Link, **When** the link is processed and session is established, **Then** they are redirected to the dashboard
3. **Given** a returning user submits valid email and password on the Login view, **When** sign-in succeeds, **Then** they are redirected to the dashboard
4. **Given** a new user clicks a Magic Link after first-time signup, **When** the session is established, **Then** they are redirected to the Quick Onboarder (onboarding not complete)
5. **Given** authentication fails (invalid credentials, expired link), **When** the user attempts to proceed, **Then** they see a clear, user-friendly error message and can retry; no technical details exposed

---

### User Story 3 - Access Protected Routes (Priority: P1)

An unauthenticated user tries to access a protected route such as /dashboard or /scout. The system intercepts the request, detects no valid session, and redirects them to the login page. An authenticated user with incomplete onboarding who navigates to /dashboard or /scout is redirected to the onboarding flow. An authenticated user with complete onboarding accesses protected routes normally.

**Why this priority**: Security and correct flow control; protected content must remain protected and onboarding must complete before dashboard use.

**Independent Test**: Can be fully tested by visiting /dashboard or /scout as guest (redirect to login), as authenticated but not onboarded (redirect to onboarding), and as fully onboarded user (access granted). Delivers correct access control.

**Acceptance Scenarios**:

1. **Given** an unauthenticated user navigates to /dashboard or /scout, **When** the request is processed, **Then** they are redirected to the login page
2. **Given** an authenticated user whose onboarding is not complete, **When** they navigate to /dashboard or /scout, **Then** they are redirected to the onboarding flow
3. **Given** an authenticated user whose onboarding is complete, **When** they navigate to /dashboard or /scout, **Then** they can access the route normally
4. **Given** a user on the login page, **When** they successfully sign in, **Then** they are redirected to the appropriate destination (onboarding or dashboard) based on onboarding status

---

### User Story 4 - Use Session-Aware Global Navigation (Priority: P2)

A visitor or authenticated user sees a global navigation bar (Navbar) that reflects their session state. Guests see "Login" and "Get Started" controls. Authenticated users see a User Avatar (or profile indicator) and a "Debt Lifted" HUD. The Navbar is present on landing, login, onboarding, and authenticated app pages where applicable.

**Why this priority**: Clear navigation and consistent experience; users must know how to sign in or access their account.

**Independent Test**: Can be tested by loading pages as guest (verify Login + Get Started) and as authenticated user (verify Avatar + Debt Lifted HUD). Delivers correct nav state.

**Acceptance Scenarios**:

1. **Given** a guest (unauthenticated) views any page with the Navbar, **When** the Navbar renders, **Then** they see "Login" and "Get Started" controls
2. **Given** an authenticated user views any page with the Navbar, **When** the Navbar renders, **Then** they see a User Avatar (or profile indicator) and a Debt Lifted HUD
3. **Given** the user clicks "Login" as a guest, **When** the action completes, **Then** they are navigated to the login view
4. **Given** the user clicks "Get Started" as a guest, **When** the action completes, **Then** they are navigated into the Auth flow (aligned with landing hero behavior)

---

### User Story 5 - Consistent Visual Identity for Auth Views (Priority: P3)

A user viewing the login, signup, Check Email, or Password Setup views experiences a visual identity consistent with the landing page and dashboard: same color palette (dark navy, electric mint accents), typography, and layout principles. No dedicated wireframe exists for these views; design follows the established Premium Academic brand.

**Why this priority**: Brand consistency and trust; auth is a critical touchpoint and should feel cohesive with the rest of the product.

**Independent Test**: Can be tested by comparing auth views to landing and dashboard wireframes; colors, fonts, and layout principles should align. Delivers a cohesive brand experience.

**Acceptance Scenarios**:

1. **Given** a user views the login, Check Email, or Password Setup view, **When** the page loads, **Then** the dominant background uses the same dark navy gradient as the landing page
2. **Given** auth views are displayed, **When** the user views CTAs and highlights, **Then** electric mint accents are used consistently
3. **Given** auth views, **When** displayed on mobile, **Then** layout adapts without horizontal overflow; touch targets meet minimum 44×44px

---

### Edge Cases

- **Expired or invalid Magic Link**: Magic Links expire after 1 hour. When a user clicks an expired or invalid Magic Link, the system displays a clear message (e.g., "This link has expired") and offers a way to request a new link or return to login
- **Session expiry mid-flow**: When a user's session expires while they are on a protected route, the next navigation or refresh redirects them to login with a non-technical message
- **Onboarding incomplete but user manually navigates to dashboard**: Middleware or equivalent logic enforces redirect to onboarding; user cannot bypass
- **Rate limiting**: Magic Link and signup: 3 attempts per email per hour; failed login: 5 attempts per email per 15 minutes. User sees a clear, non-technical message when limit is exceeded
- **Guest on protected route with return URL**: Intended destination is passed via URL query param (e.g. `redirectTo=/dashboard`). After successful login, user is redirected to that destination when applicable (validate against allowlist to prevent open redirects); otherwise use default (onboarding or dashboard)
- **Reduced motion**: Auth views respect reduced-motion preferences for any animations

## Requirements *(mandatory)*

### Functional Requirements

#### Authentication Flow

- **FR-001**: The system MUST support authentication via Email/Password and Magic Link
- **FR-002**: The landing page hero email field MUST connect to the Auth flow; submission MUST route the user to the Check Email view first (user then chooses Magic Link or Password Setup from there)
- **FR-003**: The Check Email view MUST allow the user to either receive a Magic Link (sent to their email) or proceed to Password Setup for new accounts
- **FR-004**: The Password Setup view MUST collect a password (with validation) and complete account creation on successful submission
- **FR-005**: Upon successful sign-in (password or Magic Link), the system MUST route new users (onboarding incomplete) to the Quick Onboarder (Spec 008) and returning users (onboarding complete) to the dashboard
- **FR-006**: The system MUST display clear, user-friendly error messages for invalid credentials, expired links, or rate limits; MUST NOT expose technical details or stack traces
- **FR-006a**: Auth rate limits MUST be enforced: Magic Link and signup—3 attempts per email per hour; failed login—5 attempts per email per 15 minutes

#### Protected Routing

- **FR-007**: The system MUST protect the routes /dashboard and /scout; unauthenticated access MUST redirect to the login page
- **FR-008**: When an authenticated user has onboarding_complete set to false, access to /dashboard or /scout MUST redirect them to the onboarding flow
- **FR-009**: When no valid session exists, the user MUST be redirected to /login. When the request originated from a protected route, the intended destination MUST be passed as a URL query param (e.g. `redirectTo=/dashboard`); post-login redirect MUST honor it after validating against an allowlist (internal paths only)

#### Global Navigation

- **FR-010**: A shared Navbar component MUST display different states based on session: Guest shows [Login] [Get Started]; Authenticated shows [User Avatar] [Debt Lifted HUD]
- **FR-011**: The "Login" control MUST navigate guests to the login view
- **FR-012**: The "Get Started" control MUST navigate guests into the Auth flow (aligned with landing hero CTA behavior)
- **FR-013**: The Debt Lifted HUD in the authenticated Navbar MUST display the user's debt-lifted value (or placeholder/skeleton until data is available)

#### Visual Identity

- **FR-014**: Auth views (login, Check Email, Password Setup) MUST use the same color palette (dark navy gradient, electric mint accents) and typography as the landing page and dashboard wireframes
- **FR-015**: All interactive elements in auth views MUST meet minimum 44×44px touch targets and WCAG 2.1 AA contrast requirements

### Auth Route Structure

- **Login**: `/login` — email + password for returning users
- **Signup flow**: `/auth/check-email` (first stop after landing hero); `/auth/password-setup` (password creation)
- **Magic Link callback**: `/auth/callback` — Supabase redirect target for Magic Link verification (required for Magic Link flow)
- **Protected routes**: `/dashboard`, `/scout` (redirect to `/login` when unauthenticated)

### Key Entities

- **Session**: Represents the authenticated user's state; presence determines Guest vs Authenticated Navbar and access to protected routes
- **Onboarding Status**: Boolean indicating whether the user has completed the Quick Onboarder; when false, user is redirected to onboarding before dashboard access
- **Auth View**: A screen in the Auth flow—Check Email, Password Setup, Login—that collects credentials or guides the user through sign-in or sign-up

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete the flow from landing email entry to authenticated state (via Magic Link or Password Setup) in under 2 minutes
- **SC-002**: Unauthenticated users attempting to access /dashboard or /scout are redirected to login 100% of the time
- **SC-003**: Authenticated users with incomplete onboarding are redirected to onboarding 100% of the time when accessing protected routes
- **SC-004**: The Navbar correctly displays Guest vs Authenticated state across all pages where it is present
- **SC-005**: Auth views pass WCAG 2.1 AA accessibility checks (contrast, semantics, touch targets, keyboard navigation)
- **SC-006**: Auth error messages (invalid credentials, expired link, rate limit) are displayed within 3 seconds of the triggering action

## Assumptions

- Supabase Auth is the provider for Email/Password and Magic Link; existing project uses Supabase per constitution; Magic Link expiry uses Supabase default (1 hour)
- The Quick Onboarder (Spec 008) exists and defines the onboarding flow; this spec routes to it but does not own onboarding logic
- The onboarding_complete flag is stored in user profile or equivalent; schema and update logic are defined in Spec 008 or database infrastructure
- The Debt Lifted HUD displays a value from existing or future data sources; this spec requires the HUD to be present in the Navbar with placeholder/skeleton support until data is available
- Landing page (Spec 011) hero form submits to Auth flow; integration is bidirectional
- No dedicated login/signup wireframes exist; design follows the Premium Academic identity from existing wireframes (Landing, dashboard)
