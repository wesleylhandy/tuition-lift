/**
 * Contact page. MVP: static "Email us" message per quickstart.
 * Contact form deferred post-MVP.
 */

import Link from "next/link";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHeader } from "@/components/landing/landing-header";

export const metadata = {
  title: "Contact | TuitionLift",
  description: "Contact TuitionLift support",
};

export default function ContactPage() {
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
          Contact Us
        </h1>
        <p className="mt-4 text-off-white/80">
          Have questions or need help? Email us at{" "}
          <a
            href="mailto:support@tuitionlift.com"
            className="cursor-pointer text-electric-mint underline transition-colors hover:text-electric-mint/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-mint focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
          >
            support@tuitionlift.com
          </a>
        </p>
      </main>
      <LandingFooter />
    </div>
  );
}
