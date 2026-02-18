"use server";

/**
 * Server Actions for Quick Onboarder Wizard.
 * signUp (Step 1), saveAcademicProfile (Step 2), finishOnboarding (Step 3).
 * @see specs/008-quick-onboarder/contracts/server-actions.md
 */

import { z } from "zod";
import { headers } from "next/headers";
import { createServerSupabaseClient } from "../supabase/server";
import { checkAndIncrementSignupRateLimit } from "../rate-limit";
import { isUsStateCode } from "../constants/us-states";
import { withEncryptedSai } from "@repo/db";

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

// --- saveAcademicProfile (Step 2) ---

const saveAcademicProfileInputSchema = z.object({
  intended_major: z
    .string()
    .trim()
    .min(1, "Major is required.")
    .max(200, "Major must be 200 characters or less."),
  state: z
    .string()
    .trim()
    .refine((v) => isUsStateCode(v), "Please select a valid US state."),
  full_name: z.string().trim().optional().transform((v) => v || undefined),
  gpa_weighted: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === "" || v === undefined || v === null) return undefined;
      const n = typeof v === "string" ? parseFloat(v) : v;
      return Number.isNaN(n) ? undefined : n;
    })
    .refine(
      (v) => v === undefined || (v >= 0 && v <= 6),
      "Weighted GPA must be between 0 and 6."
    ),
  gpa_unweighted: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === "" || v === undefined || v === null) return undefined;
      const n = typeof v === "string" ? parseFloat(v) : v;
      return Number.isNaN(n) ? undefined : n;
    })
    .refine(
      (v) => v === undefined || (v >= 0 && v <= 4),
      "Unweighted GPA must be between 0 and 4."
    ),
});

export type SaveAcademicProfileResult = {
  success: boolean;
  error?: string;
};

/**
 * saveAcademicProfile — Upsert academic profile (intended_major, state required;
 * full_name, gpa_weighted, gpa_unweighted optional).
 * Per contracts/server-actions.md §2.
 */
export async function saveAcademicProfile(
  formData: FormData
): Promise<SaveAcademicProfileResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Not authenticated" };
  }

  const raw = {
    intended_major: formData.get("intended_major") ?? "",
    state: formData.get("state") ?? "",
    full_name: formData.get("full_name") ?? "",
    gpa_weighted: formData.get("gpa_weighted") ?? "",
    gpa_unweighted: formData.get("gpa_unweighted") ?? "",
  };

  const parsed = saveAcademicProfileInputSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? "Invalid input.";
    return { success: false, error: msg };
  }

  const { intended_major, state, full_name, gpa_weighted, gpa_unweighted } =
    parsed.data;

  const stateCode = state.toUpperCase().trim();

  const { error: upsertError } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        intended_major,
        state: stateCode,
        full_name: full_name || null,
        gpa_weighted: gpa_weighted ?? null,
        gpa_unweighted: gpa_unweighted ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

  if (upsertError) {
    return {
      success: false,
      error: "Failed to save profile. Please try again.",
    };
  }

  return { success: true };
}

// --- finishOnboarding (Step 3) ---

const pellEligibilityEnum = z.enum(["eligible", "ineligible", "unknown"]);

const finishOnboardingInputSchema = z.object({
  sai: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === "" || v === undefined || v === null) return undefined;
      const n = typeof v === "string" ? parseInt(v, 10) : v;
      return Number.isNaN(n) ? undefined : n;
    })
    .refine(
      (v) => v === undefined || (v >= -1500 && v <= 999999),
      "SAI must be between -1500 and 999999."
    ),
  pell_eligibility: pellEligibilityEnum.optional(),
});

export type FinishOnboardingResult = {
  success: boolean;
  error?: string;
  discoveryTriggered?: boolean;
};

/**
 * finishOnboarding — Save financial profile (SAI, Pell), set onboarding_complete,
 * trigger discovery. Per contracts/server-actions.md §3.
 * T022: If discovery trigger fails, still set onboarding_complete; return discoveryTriggered: false.
 */
export async function finishOnboarding(
  formData: FormData
): Promise<FinishOnboardingResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Not authenticated" };
  }

  const raw = {
    sai: formData.get("sai") ?? "",
    pell_eligibility: formData.get("pell_eligibility") ?? "",
  };

  const parsed = finishOnboardingInputSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? "Invalid input.";
    return { success: false, error: msg };
  }

  const { sai: saiParsed, pell_eligibility: pellValue } = parsed.data;

  const profilePayload = {
    id: user.id,
    sai: saiParsed ?? null,
    pell_eligibility_status: pellValue ?? null,
    onboarding_complete: true,
    updated_at: new Date().toISOString(),
  };

  const encryptedPayload = withEncryptedSai(profilePayload);

  const { error: upsertError } = await supabase
    .from("profiles")
    .upsert(encryptedPayload, { onConflict: "id" });

  if (upsertError) {
    return {
      success: false,
      error: "Failed to save profile. Please try again.",
    };
  }

  let discoveryTriggered = false;
  try {
    const h = await headers();
    const host = h.get("host") ?? "localhost:3000";
    const proto = h.get("x-forwarded-proto") ?? "http";
    const cookie = h.get("cookie") ?? "";
    const baseUrl = `${proto}://${host}`;
    const res = await fetch(`${baseUrl}/api/discovery/trigger`, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    discoveryTriggered = res.ok;
  } catch {
    // Trigger failed; user not stuck per T022 and contracts §3
  }

  return { success: true, discoveryTriggered };
}
