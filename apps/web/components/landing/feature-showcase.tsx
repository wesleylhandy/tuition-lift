"use client";

/**
 * FeatureShowcase — "Everything You Need to Win Scholarships" section.
 * Static config for four features: AI Matching, Trust Verification, Smart Deadlines, Coach's Guidance.
 * Bento-style grid; each card: icon, title, short description. Scroll-triggered reveal via useScrollReveal.
 * Per FR-010; prefers-reduced-motion disables animation (handled by hook).
 */

import {
  CalendarCheck,
  MessageCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useScrollReveal } from "@/lib/hooks/use-scroll-reveal";

const FEATURES = [
  {
    id: "ai-matching",
    title: "AI Matching",
    description:
      "Our AI finds scholarships that actually fit your profile—no endless searches through irrelevant lists.",
    icon: Sparkles,
  },
  {
    id: "trust-verification",
    title: "Trust Verification",
    description:
      "Every scholarship is vetted for legitimacy. We flag scams and upfront fees so you apply with confidence.",
    icon: ShieldCheck,
  },
  {
    id: "smart-deadlines",
    title: "Smart Deadlines",
    description:
      "Never miss a due date. We track deadlines and prioritize what matters most to your timeline.",
    icon: CalendarCheck,
  },
  {
    id: "coach-guidance",
    title: "Coach's Guidance",
    description:
      "Personalized guidance from discovery to submission. Get motivated and stay on track.",
    icon: MessageCircle,
  },
] as const;

export function FeatureShowcase() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section
      ref={ref}
      data-visible={isVisible}
      className="px-4 py-16 transition-all duration-500 ease-out opacity-0 translate-y-6 data-[visible=true]:opacity-100 data-[visible=true]:translate-y-0 motion-reduce:opacity-100 motion-reduce:translate-y-0"
      aria-labelledby="feature-showcase-heading"
    >
      <div className="mx-auto max-w-4xl">
        <h2
          id="feature-showcase-heading"
          className="mb-3 text-center font-heading text-xl font-semibold text-off-white sm:text-2xl"
        >
          Everything You Need to Win Scholarships
        </h2>
        <p className="mb-10 text-center text-off-white/80 sm:text-lg">
          AI-powered insights from discovery to submission.
        </p>
        <div className="grid gap-6 sm:grid-cols-2">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.id}
                className="rounded-lg border border-electric-mint/20 bg-navy/50 p-6"
              >
                <div
                  className="mb-4 flex size-12 items-center justify-center rounded-lg bg-electric-mint/20 text-electric-mint"
                  aria-hidden
                >
                  <Icon className="size-6" strokeWidth={2} />
                </div>
                <h3 className="font-heading text-lg font-semibold text-off-white">
                  {feature.title}
                </h3>
                <p className="mt-2 text-off-white/80">{feature.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
