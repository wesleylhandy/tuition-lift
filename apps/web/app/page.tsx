/**
 * Landing page — Hero, email capture, routes to Auth via redirectToSignUp.
 * Stats bar and testimonials for social proof. CTA section with Debt Lifted widget.
 * Dark navy gradient; electric mint accents.
 */

import { Suspense } from "react";
import { LandingHeader } from "@/components/landing/landing-header";
import { HeroSection } from "@/components/landing/hero-section";
import {
  StatsBar,
  StatsBarSkeleton,
  fetchLandingStats,
} from "@/components/landing/stats-bar";
import {
  TestimonialGrid,
  TestimonialGridSkeleton,
} from "@/components/landing/testimonial-grid";
import { FeatureShowcase } from "@/components/landing/feature-showcase";
import { CtaSection } from "@/components/landing/cta-section";
import { LandingFooter } from "@/components/landing/landing-footer";

export default async function Home() {
  const stats = await fetchLandingStats();

  return (
    <div className="min-h-svh bg-linear-to-b from-navy via-navy to-navy/95 font-body">
      <LandingHeader />
      <main aria-label="TuitionLift landing">
        <HeroSection />
        <Suspense fallback={<StatsBarSkeleton />}>
          <StatsBar stats={stats} />
        </Suspense>
        <Suspense fallback={<TestimonialGridSkeleton />}>
          <TestimonialGrid />
        </Suspense>
        <FeatureShowcase />
        <CtaSection totalDebtLiftedCents={stats?.total_debt_lifted_cents ?? undefined} />
      </main>
      <LandingFooter />
    </div>
  );
}
