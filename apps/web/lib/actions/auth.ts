"use server";

/**
 * Server Actions for authentication: signIn, signUp (password setup), requestMagicLink.
 * Uses createServerSupabaseClient, Zod validation, rate limiting, getSafeRedirectTo.
 * @see specs/012-auth-bridge-protected-routing/contracts/auth-server-actions.md
 */

import { z } from "zod";
import { headers } from "next/headers";
import { createServerSupabaseClient } from "../supabase/server";
import {
  checkAndIncrementFailedLoginRateLimit,
  checkAndIncrementSignupRateLimit,
} from "../rate-limit";
import { getSafeRedirectTo } from "../auth/redirect-allowlist";

export type AuthActionResult = {
  success: boolean;
  error?: string;
  redirect?: string;
};

const emailSchema = z.string().email("Please enter a valid email address.");
const passwordSchema = z.string().min(8, "Password must be at least 8 characters.");

const signInInputSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

const signUpInputSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

const magicLinkInputSchema = z.object({
  email: emailSchema,
});

function parseFormDataOrObject<T>(
  formData: FormData | Record<string, unknown>,
  emailKey: string,
  passwordKey?: string,
  redirectKey?: string
): { email: string; password?: string; redirectTo?: string } {
  if (formData instanceof FormData) {
    const email = (formData.get(emailKey) as string)?.trim() ?? "";
    const password = passwordKey
      ? ((formData.get(passwordKey) as string) ?? "")
      : undefined;
    const redirectTo = redirectKey
      ? ((formData.get(redirectKey) as string) ?? undefined)
      : undefined;
    return { email, password, redirectTo };
  }
  const obj = formData as Record<string, unknown>;
  return {
    email: (String(obj[emailKey] ?? "")).trim(),
    password: passwordKey ? (obj[passwordKey] as string) : undefined,
    redirectTo: redirectKey ? (obj[redirectKey] as string) : undefined,
  };
}

/**
 * signIn — Authenticate returning user with email + password.
 * Rate limit: 5 failed attempts per email per 15 min.
 * On success: redirect to /onboard or /dashboard based on onboarding_complete;
 * honor redirectTo when allowlisted.
 */
export async function signIn(
  formData: FormData | { email: string; password: string; redirectTo?: string }
): Promise<AuthActionResult> {
  const { email, password, redirectTo } = parseFormDataOrObject(
    formData instanceof FormData ? formData : { ...formData },
    "email",
    "password",
    "redirectTo"
  );

  const parsed = signInInputSchema.safeParse({ email, password });
  if (!parsed.success) {
    const msg =
      parsed.error.errors[0]?.message ?? "Please enter a valid email and password.";
    return { success: false, error: msg };
  }

  const { allowed } = checkAndIncrementFailedLoginRateLimit(parsed.data.email);
  if (!allowed) {
    return {
      success: false,
      error: "Too many attempts. Please try again later.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return {
      success: false,
      error: "Invalid email or password.",
    };
  }

  const user = data.user;
  if (!user) {
    return { success: false, error: "Invalid email or password." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_complete")
    .eq("id", user.id)
    .single();

  const defaultPath =
    profile?.onboarding_complete === true ? "/dashboard" : "/onboard";
  const redirect = getSafeRedirectTo(redirectTo ?? null, defaultPath);

  return { success: true, redirect };
}

/**
 * signUp (Password Setup) — Create account when user sets password on /auth/password-setup.
 * Rate limit: 3 attempts per email per hour.
 * On success: insert profiles row (onboarding_complete=false), return redirect to /onboard.
 */
export async function signUp(
  formData: FormData | { email: string; password: string; redirectTo?: string }
): Promise<AuthActionResult> {
  const { email, password, redirectTo } = parseFormDataOrObject(
    formData instanceof FormData ? formData : { ...formData },
    "email",
    "password",
    "redirectTo"
  );

  const parsed = signUpInputSchema.safeParse({ email, password });
  if (!parsed.success) {
    const msg =
      parsed.error.errors[0]?.message ?? "Please enter a valid email and password.";
    return { success: false, error: msg };
  }

  const { allowed } = checkAndIncrementSignupRateLimit(parsed.data.email);
  if (!allowed) {
    return {
      success: false,
      error: "Too many attempts. Please try again later.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    const msg = error.message?.toLowerCase() ?? "";
    if (
      msg.includes("already") ||
      msg.includes("registered") ||
      error.status === 422
    ) {
      return { success: false, error: "An account with this email already exists." };
    }
    return {
      success: false,
      error: "Sign up failed. Please try again.",
    };
  }

  const user = data.user;
  if (!user) {
    return { success: false, error: "Sign up failed. Please try again." };
  }

  if (user.identities && user.identities.length === 0) {
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
      // Duplicate — profile already exists (e.g. Magic Link before password setup)
      const redirect = getSafeRedirectTo(redirectTo ?? null, "/onboard");
      return { success: true, redirect };
    }
    return {
      success: false,
      error: "Account created but setup failed. Please sign in to continue.",
    };
  }

  const redirect = getSafeRedirectTo(redirectTo ?? null, "/onboard");
  return { success: true, redirect };
}

/**
 * requestMagicLink — Send Magic Link to user's email from Check Email view.
 * Rate limit: 3 attempts per email per hour.
 * On success: return { success: true }; user sees "Check your email".
 */
export async function requestMagicLink(
  formData: FormData | { email: string }
): Promise<AuthActionResult> {
  const { email } = parseFormDataOrObject(
    formData instanceof FormData ? formData : { ...formData },
    "email"
  );

  const parsed = magicLinkInputSchema.safeParse({ email });
  if (!parsed.success) {
    const msg =
      parsed.error.errors[0]?.message ?? "Please enter a valid email address.";
    return { success: false, error: msg };
  }

  const { allowed } = checkAndIncrementSignupRateLimit(parsed.data.email);
  if (!allowed) {
    return {
      success: false,
      error: "Too many attempts. Please try again later.",
    };
  }

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const origin = `${proto}://${host}`;

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return {
      success: false,
      error: "Failed to send magic link. Please try again.",
    };
  }

  return { success: true };
}
