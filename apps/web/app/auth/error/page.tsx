/**
 * Auth error page — expired/invalid Magic Link or code exchange failure.
 * @see specs/012-auth-bridge-protected-routing T023 (placeholder for full handling)
 */

import Link from "next/link";
import { LandingHeader } from "@/components/landing/landing-header";

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const error = params.error ?? "unknown";

  const message =
    error === "invalid_link" || error === "invalid_code"
      ? "This link has expired or is invalid."
      : "Something went wrong. Please try again.";

  return (
    <div className="min-h-svh bg-linear-to-b from-navy via-navy to-navy/95 font-body text-off-white">
      <LandingHeader />
      <main
        className="flex min-h-[calc(100vh-80px)] flex-col items-center justify-center px-4 py-12"
        aria-label="Authentication error"
      >
        <div className="mx-auto max-w-md space-y-6 text-center">
          <h1 className="font-heading text-2xl font-semibold text-off-white sm:text-3xl">
            {message}
          </h1>
          <p className="text-off-white/90">
            You can request a new magic link or sign in with your password.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/auth/check-email"
              className="inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-lg bg-electric-mint px-6 py-3 font-medium text-navy transition-colors hover:bg-electric-mint/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-mint focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
              aria-label="Request new magic link"
            >
              Request new link
            </Link>
            <Link
              href="/login"
              className="inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-lg border border-electric-mint/50 bg-transparent px-6 py-3 font-medium text-electric-mint transition-colors hover:bg-electric-mint/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-mint focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
              aria-label="Sign in with password"
            >
              Sign in
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
