/**
 * Check Email page — Magic Link or Password Setup entry point.
 * Reads email from searchParams, renders CheckEmailView, wires requestMagicLink.
 * When error=expired (from callback), renders expired-link recovery view without requiring email.
 * @see specs/012-auth-bridge-protected-routing spec US1, FR-003, T023
 */

import { redirect } from "next/navigation";
import { LandingHeader } from "@/components/landing/landing-header";
import { CheckEmailView } from "@/components/auth/check-email-view";
import { z } from "zod";

const emailParamSchema = z.string().email();

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; error?: string }>;
}) {
  const params = await searchParams;
  const rawEmail = (params.email ?? "").trim();
  const linkExpired = params.error === "expired";

  const parsed = emailParamSchema.safeParse(rawEmail);
  const hasValidEmail = parsed.success && !!rawEmail;

  if (!linkExpired && !hasValidEmail) {
    redirect("/");
  }

  return (
    <div className="min-h-svh overflow-x-hidden bg-linear-to-b from-navy via-navy to-navy/95 font-body text-off-white">
      <LandingHeader />
      <main
        className="flex min-h-[calc(100vh-80px)] w-full flex-col items-center justify-center overflow-x-hidden px-4 py-12"
        aria-label="Check your email for next steps"
      >
        <CheckEmailView
          email={parsed.success ? parsed.data : ""}
          linkExpired={linkExpired}
        />
      </main>
    </div>
  );
}
