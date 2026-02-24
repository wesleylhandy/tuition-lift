/**
 * Password Setup page — Collect password, wire signUp.
 * Reads email from searchParams; invalid email redirects to landing.
 * On success redirects to /onboard.
 * @see specs/012-auth-bridge-protected-routing spec US1, FR-004
 */

import { redirect } from "next/navigation";
import { LandingHeader } from "@/components/landing/landing-header";
import { PasswordSetupForm } from "@/components/auth/password-setup-form";
import { z } from "zod";

const emailParamSchema = z.string().email();

export default async function PasswordSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const params = await searchParams;
  const rawEmail = (params.email ?? "").trim();

  const parsed = emailParamSchema.safeParse(rawEmail);
  if (!parsed.success || !rawEmail) {
    redirect("/");
  }

  return (
    <div className="min-h-svh bg-linear-to-b from-navy via-navy to-navy/95 font-body text-off-white">
      <LandingHeader />
      <main
        className="flex min-h-[calc(100vh-80px)] flex-col items-center justify-center px-4 py-12"
        aria-label="Set your password to create your account"
      >
        <PasswordSetupForm email={parsed.data} />
      </main>
    </div>
  );
}
