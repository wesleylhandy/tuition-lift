/**
 * LandingHeader — Session-aware Navbar for landing, login, auth pages.
 * Guest: "Login" → /login, "Get Started" → /auth/check-email.
 * Auth: Debt Lifted HUD + User Avatar/Dashboard link.
 * Per FR-010, FR-011, FR-012; T018 [US4].
 */
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { LogoPlaceholder } from "@/components/dashboard/logo-placeholder";
import { LandingHeaderAuthNav } from "./landing-header-auth-nav";

export async function LandingHeader() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-electric-mint/25 bg-[#252550] text-off-white backdrop-blur-sm">
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6"
        aria-label="Main navigation"
      >
        <Link
          href={user ? "/dashboard" : "/"}
          className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center gap-2 font-heading text-xl font-semibold text-off-white transition-colors hover:text-electric-mint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-mint focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
          aria-label="TuitionLift home"
        >
          <LogoPlaceholder variant="light" />
          <span>TuitionLift</span>
        </Link>

        {user ? (
          <LandingHeaderAuthNav />
        ) : (
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="min-h-[44px] min-w-[44px] flex cursor-pointer items-center justify-center rounded-lg border border-electric-mint/50 bg-transparent px-4 py-2.5 text-sm font-medium text-electric-mint transition-colors hover:bg-electric-mint/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-mint focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
              aria-label="Sign in"
            >
              Login
            </Link>
            <Link
              href="/auth/check-email"
              className="min-h-[44px] min-w-[44px] flex cursor-pointer items-center justify-center rounded-lg bg-electric-mint px-4 py-2.5 text-sm font-medium !text-navy transition-colors hover:bg-electric-mint/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-mint focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
              aria-label="Get started"
            >
              Get Started
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
