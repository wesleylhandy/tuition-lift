"use client";

/**
 * Detects Supabase OTP/Magic Link expiry when Supabase redirects to Site URL with
 * hash params (#error_code=otp_expired) instead of our callback. Redirects to
 * the expired-link recovery page.
 * @see specs/012-auth-bridge-protected-routing T023, edge case: Supabase hash redirect
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function OtpExpiredRedirect() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;

    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const errorCode = params.get("error_code");
    const error = params.get("error");

    const isOtpExpired =
      errorCode === "otp_expired" ||
      (error === "access_denied" &&
        params.get("error_description")?.toLowerCase().includes("expired"));

    if (isOtpExpired) {
      router.replace("/auth/check-email?error=expired");
    }
  }, [router]);

  return null;
}
