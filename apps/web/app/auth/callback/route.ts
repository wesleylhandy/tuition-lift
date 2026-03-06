/**
 * Auth callback route — handles Magic Link (code or token_hash) exchange.
 * Redirects to onboarding or dashboard based on onboarding_complete.
 * Honors redirectTo from URL when allowlisted.
 * @see specs/012-auth-bridge-protected-routing spec US2, T011
 */

import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSafeRedirectTo } from "@/lib/auth/redirect-allowlist";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const redirectTo = requestUrl.searchParams.get("redirectTo");

  const supabase = await createServerSupabaseClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        new URL("/auth/check-email?error=expired", request.url)
      );
    }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as "email" | "magiclink",
      token_hash: tokenHash,
    });
    if (error) {
      return NextResponse.redirect(
        new URL("/auth/check-email?error=expired", request.url)
      );
    }
  } else {
    return NextResponse.redirect(new URL("/auth/check-email", request.url));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_complete")
    .eq("id", user.id)
    .single();

  const defaultPath =
    profile?.onboarding_complete === true ? "/dashboard" : "/onboard";
  const safeRedirect = getSafeRedirectTo(redirectTo ?? null, defaultPath);

  return NextResponse.redirect(new URL(safeRedirect, request.url));
}
