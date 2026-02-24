/**
 * Terms of Service page. Placeholder content per research.md; legal copy to be added later.
 */

import Link from "next/link";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHeader } from "@/components/landing/landing-header";

export const metadata = {
  title: "Terms of Service | TuitionLift",
  description: "TuitionLift terms of service",
};

export default function TermsPage() {
  return (
    <div className="min-h-svh bg-linear-to-b from-navy via-navy to-navy/95 font-body text-off-white">
      <LandingHeader />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <Link
          href="/"
          className="mb-8 inline-block cursor-pointer text-sm text-electric-mint transition-colors hover:text-electric-mint/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-mint focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
        >
          ← Back to home
        </Link>
        <h1 className="font-heading text-2xl font-semibold text-off-white sm:text-3xl">
          Terms of Service
        </h1>
        <p className="mt-4 text-off-white/80">
          Last updated: February 2026. This page will contain TuitionLift&apos;s
          terms of service. Placeholder content—legal copy to be added before
          launch.
        </p>
      </main>
      <LandingFooter />
    </div>
  );
}
