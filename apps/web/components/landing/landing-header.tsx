/**
 * LandingHeader — Logo and "Login / Sign Up" link to /onboard.
 * Per contracts/landing-sections.md section 7.
 */

import Link from "next/link";

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-electric-mint/20 bg-navy/95 backdrop-blur-sm">
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6"
        aria-label="Main navigation"
      >
        <Link
          href="/"
          className="font-heading text-xl font-semibold text-off-white transition-colors hover:text-electric-mint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-mint focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
          aria-label="TuitionLift home"
        >
          TuitionLift
        </Link>
        <Link
          href="/onboard"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-electric-mint/50 bg-transparent px-4 py-2.5 text-sm font-medium text-electric-mint transition-colors hover:bg-electric-mint/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-mint focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
          aria-label="Login or sign up"
        >
          Login / Sign Up
        </Link>
      </nav>
    </header>
  );
}
