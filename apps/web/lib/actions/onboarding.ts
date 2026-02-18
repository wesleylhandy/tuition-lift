"use server";

/**
 * Server Actions for Quick Onboarder Wizard.
 * signUp (Step 1), saveAcademicProfile (Step 2), finishOnboarding (Step 3).
 * @see specs/008-quick-onboarder/contracts/server-actions.md
 */

import { z } from "zod";
import { createServerSupabaseClient } from "../supabase/server";
import { checkAndIncrementSignupRateLimit } from "../rate-limit";

const signUpInputSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export type SignUpResult = {
  success: boolean;
  error?: string;
};

/**
 * signUp — Create account via email/password; create profiles row; rate-limit per email.
 * Per contracts/server-actions.md §1.
 */
export async function signUp(formData: FormData): Promise<SignUpResult> {
  const email = (formData.get("email") as string)?.trim() ?? "";
  const password = (formData.get("password") as string) ?? "";

  const parsed = signUpInputSchema.safeParse({ email, password });
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? "Invalid input.";
    return { success: false, error: msg };
  }

  const { allowed } = checkAndIncrementSignupRateLimit(email);
  if (!allowed) {
    return {
      success: false,
      error: "Too many attempts; try again later.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: undefined },
  });

  if (signUpError) {
    const msg = signUpError.message?.toLowerCase() ?? "";
    if (
      msg.includes("already") ||
      msg.includes("registered") ||
      msg.includes("already been registered") ||
      signUpError.status === 422
    ) {
      return {
        success: false,
        error: "An account with this email already exists.",
      };
    }
    return {
      success: false,
      error: signUpError.message ?? "Sign up failed. Please try again.",
    };
  }

  const user = data.user;
  if (!user) {
    return { success: false, error: "Sign up failed. Please try again." };
  }

  if (data.user?.identities && data.user.identities.length === 0) {
    return {
      success: false,
      error: "An account with this email already exists.",
    };
  }

  const { error: insertError } = await supabase.from("profiles").insert({
    id: user.id,
    onboarding_complete: false,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return { success: true };
    }
    return {
      success: false,
      error: "Account created but setup failed. Please sign in to continue.",
    };
  }

  return { success: true };
}
