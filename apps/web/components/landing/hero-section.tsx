"use client";

/**
 * HeroSection — Hero with heading, supporting copy, email capture form.
 * Form action: redirectToSignUp. Embeds FloatingPreviewCards.
 * Per FR-001, FR-002, contracts/landing-sections.md.
 */

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { redirectToSignUp } from "@/lib/actions/landing";
import { FloatingPreviewCards } from "./floating-preview-cards";

function GetStartedButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-[44px] min-w-[44px] shrink-0 cursor-pointer rounded-lg bg-electric-mint px-6 py-3 font-medium !text-navy transition-colors hover:bg-electric-mint/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-mint focus-visible:ring-offset-2 focus-visible:ring-offset-navy disabled:cursor-not-allowed disabled:opacity-70"
      aria-label="Get started with your email"
    >
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <span
            className="size-4 animate-spin rounded-full border-2 border-navy border-t-transparent"
            aria-hidden
          />
          Redirecting…
        </span>
      ) : (
        "Get Started"
      )}
    </button>
  );
}

export function HeroSection() {
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    const result = await redirectToSignUp(formData);
    if (result?.error) {
      setError(result.error);
    }
  }

  return (
    <section
      className="relative px-4 py-16 lg:px-8 xl:px-12"
      aria-labelledby="hero-heading"
    >
      <div className="mx-auto grid min-h-[85vh] w-full max-w-7xl grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-12">
      <div className="order-2 mx-auto flex max-w-2xl flex-col items-center text-center lg:order-1 lg:mx-0 lg:items-start lg:text-left">
        <h1
          id="hero-heading"
          className="font-heading text-3xl font-semibold leading-tight text-off-white sm:text-4xl md:text-5xl"
        >
          Lift the Weight of{" "}
          <span className="text-electric-mint">Student Debt</span>
        </h1>
        <p className="mt-4 text-lg text-off-white/90 sm:text-xl">
          Your AI Coach finds, matches, and helps you win scholarships. No endless
          searches—just smart, personalized guidance.
        </p>

        <form
          action={handleSubmit}
          className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-2"
          noValidate
        >
          <div className="flex flex-1 flex-col">
            <label htmlFor="hero-email" className="sr-only">
              Enter your email
            </label>
            <input
              id="hero-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="Enter your email"
              disabled={false}
              className="min-h-[44px] w-full rounded-lg border border-electric-mint/40 bg-navy/50 px-4 py-3 text-off-white placeholder:text-off-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-mint focus-visible:ring-offset-2 focus-visible:ring-offset-navy disabled:cursor-not-allowed disabled:opacity-50"
              aria-describedby={error ? "hero-email-error" : undefined}
              aria-invalid={!!error}
            />
            {error && (
              <p
                id="hero-email-error"
                className="mt-1.5 text-sm text-electric-mint"
                role="alert"
              >
                {error}
              </p>
            )}
          </div>
          <GetStartedButton />
        </form>

        <p className="mt-3 text-sm text-off-white/70">
          Free to start. No credit card required.
        </p>
      </div>

      <div className="order-1 flex min-h-[280px] items-center justify-center lg:order-2 lg:min-h-[320px]">
        <FloatingPreviewCards />
      </div>
      </div>
    </section>
  );
}
