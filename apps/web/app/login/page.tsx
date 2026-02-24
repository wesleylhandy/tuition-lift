/**
 * Login page — email + password sign in for returning users.
 * Passes redirectTo from searchParams to signIn for post-login redirect.
 * @see specs/012-auth-bridge-protected-routing spec US2, T013
 */

import { LandingHeader } from "@/components/landing/landing-header";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const params = await searchParams;
  const redirectTo = (params.redirectTo ?? "").trim() || undefined;

  return (
    <div className="min-h-svh overflow-x-hidden bg-linear-to-b from-navy via-navy to-navy/95 font-body text-off-white">
      <LandingHeader />
      <main
        className="flex min-h-[calc(100vh-80px)] w-full flex-col items-center justify-center overflow-x-hidden px-4 py-12"
        aria-label="Sign in to your account"
      >
        <LoginForm redirectTo={redirectTo} />
      </main>
    </div>
  );
}
