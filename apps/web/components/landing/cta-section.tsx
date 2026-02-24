"use client";

/**
 * CtaSection — "Ready to Lift Your Tuition Burden?" with Start Free Today CTA.
 * Optional DebtLiftedWidget showing platform total. Scroll-triggered reveal via useScrollReveal.
 * Per contracts/landing-sections.md; both CTA and Login/Sign Up route to Auth.
 */

import Link from "next/link";
import { useScrollReveal } from "@/lib/hooks/use-scroll-reveal";
import { DebtLiftedWidget } from "./debt-lifted-widget";

interface CtaSectionProps {
  /** Total debt lifted in cents for widget; null/undefined when unavailable → widget hidden */
  totalDebtLiftedCents?: number | null;
}

export function CtaSection({ totalDebtLiftedCents }: CtaSectionProps) {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section
      ref={ref}
      data-visible={isVisible}
      className="px-4 py-16 transition-all duration-500 ease-out opacity-0 translate-y-6 data-[visible=true]:opacity-100 data-[visible=true]:translate-y-0 motion-reduce:opacity-100 motion-reduce:translate-y-0"
      aria-labelledby="cta-heading"
    >
      <div className="mx-auto max-w-2xl space-y-8 text-center">
        <h2
          id="cta-heading"
          className="font-heading text-2xl font-semibold text-off-white sm:text-3xl"
        >
          Ready to Lift Your Tuition Burden?
        </h2>
        <p className="text-off-white/80 sm:text-lg">
          Join thousands of students who are discovering scholarships that fit.
          Start free today—no credit card required.
        </p>
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
          <Link
            href="/onboard"
            className="min-h-[44px] min-w-[44px] flex cursor-pointer items-center justify-center rounded-lg bg-electric-mint px-6 py-3 font-medium !text-navy transition-colors hover:bg-electric-mint/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-mint focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
            aria-label="Start free today"
          >
            Start Free Today
          </Link>
        </div>
        <DebtLiftedWidget totalDebtLiftedCents={totalDebtLiftedCents} />
      </div>
    </section>
  );
}
