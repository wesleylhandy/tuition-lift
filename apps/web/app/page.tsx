/**
 * Landing page — Hero, email capture, routes to Auth via redirectToSignUp.
 * Stats bar and testimonials for social proof. Dark navy gradient; electric mint accents.
 */

import { Suspense } from "react";
import { LandingHeader } from "@/components/landing/landing-header";
import { HeroSection } from "@/components/landing/hero-section";
import {
  StatsBar,
  StatsBarSkeleton,
} from "@/components/landing/stats-bar";
import {
  TestimonialGrid,
  TestimonialGridSkeleton,
} from "@/components/landing/testimonial-grid";
import { FeatureShowcase } from "@/components/landing/feature-showcase";

export default function Home() {
  return (
    <div className="min-h-svh bg-linear-to-b from-navy via-navy to-navy/95 font-body">
      <LandingHeader />
      <main aria-label="TuitionLift landing">
        <HeroSection />
        <Suspense fallback={<StatsBarSkeleton />}>
          <StatsBar />
        </Suspense>
        <Suspense fallback={<TestimonialGridSkeleton />}>
          <TestimonialGrid />
        </Suspense>
        <FeatureShowcase />
      </main>
    </div>
  );
}
