"use server";

/**
 * Server Actions for Landing Page.
 * Hero form submit: redirectToSignUp — validate email, rate limit, redirect to /onboard.
 * @see specs/011-landing-marketing-ui/contracts/landing-server-actions.md
 */

import { z } from "zod";
import { redirect } from "next/navigation";
import { checkAndIncrementSignupRateLimit } from "../rate-limit";

const heroEmailSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
});

export type RedirectToSignUpResult = {
  error?: string;
};

/**
 * redirectToSignUp — Accept FormData with email, validate via Zod, enforce rate limit
 * (3 attempts/email/hour per contract). Redirect to /onboard?email= on valid;
 * return { error } on invalid.
 */
export async function redirectToSignUp(
  formData: FormData
): Promise<RedirectToSignUpResult> {
  const raw = formData.get("email");
  const email = (typeof raw === "string" ? raw : "").trim();

  const parsed = heroEmailSchema.safeParse({ email });
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? "Please enter a valid email address.";
    return { error: msg };
  }

  const { allowed } = checkAndIncrementSignupRateLimit(parsed.data.email);
  if (!allowed) {
    return { error: "Too many attempts. Please try again later." };
  }

  redirect(`/onboard?email=${encodeURIComponent(parsed.data.email)}`);
}
