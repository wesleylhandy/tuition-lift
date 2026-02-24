/**
 * LandingFooter — Logo, copyright, links to Privacy, Terms, Contact.
 * Per contracts/landing-sections.md section 6.
 */

import Link from "next/link";
import { LogoPlaceholder } from "@/components/dashboard/logo-placeholder";

export function LandingFooter() {
  return (
    <footer
      className="border-t border-electric-mint/20 bg-navy/95 px-4 py-8 text-off-white"
      aria-label="Footer"
    >
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 sm:flex-row sm:justify-between">
        <Link
          href="/"
          className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center gap-2 font-heading text-lg font-semibold text-off-white transition-colors hover:text-electric-mint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-mint focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
          aria-label="TuitionLift home"
        >
          <LogoPlaceholder variant="light" />
          <span>TuitionLift</span>
        </Link>
        <p className="text-sm text-off-white/80">© 2026 TuitionLift</p>
        <nav
          className="flex flex-wrap items-center justify-center gap-6"
          aria-label="Legal and contact"
        >
          <Link
            href="/privacy"
            className="min-h-[44px] min-w-[44px] flex cursor-pointer items-center justify-center text-sm text-off-white/90 transition-colors hover:text-electric-mint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-mint focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            className="min-h-[44px] min-w-[44px] flex cursor-pointer items-center justify-center text-sm text-off-white/90 transition-colors hover:text-electric-mint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-mint focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
          >
            Terms
          </Link>
          <Link
            href="/contact"
            className="min-h-[44px] min-w-[44px] flex cursor-pointer items-center justify-center text-sm text-off-white/90 transition-colors hover:text-electric-mint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-mint focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
          >
            Contact
          </Link>
        </nav>
      </div>
    </footer>
  );
}
