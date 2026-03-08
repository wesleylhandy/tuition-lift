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

function getAwardYearRange() {
  const y = new Date().getFullYear();
  return { min: y, max: y + 4 };
}

const signUpAwardYearSchema = z
  .union([z.string(), z.number()])
  .refine(
    (v) => {
      if (v === "" || v === undefined || v === null) return false;
      const n = typeof v === "string" ? parseInt(v, 10) : v;
      const { min, max } = getAwardYearRange();
      return !Number.isNaN(n) && n >= min && n <= max;
    },
    (v) => ({
      message: `Award year must be between ${getAwardYearRange().min} and ${getAwardYearRange().max}.`,
    })
  )
  .transform((v) => {
    const n = typeof v === "string" ? parseInt(v, 10) : v;
    return Number.isNaN(n) ? null : n;
  });

const signUpInputSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  award_year: signUpAwardYearSchema,
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
  const awardYearRaw = formData.get("award_year");

  const parsed = signUpInputSchema.safeParse({
    email,
    password,
    award_year: awardYearRaw ?? "",
  });
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

  const awardYear = parsed.success ? parsed.data.award_year : null;

  const { error: insertError } = await supabase.from("profiles").insert({
    id: user.id,
    onboarding_complete: false,
    award_year: awardYear,
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

// --- saveAwardYear (Step 0 resume: logged-in user with no award_year) ---

const saveAwardYearSchema = z
  .union([z.string(), z.number()])
  .refine(
    (v) => {
      if (v === "" || v === undefined || v === null) return false;
      const n = typeof v === "string" ? parseInt(v, 10) : v;
      const y = new Date().getFullYear();
      return !Number.isNaN(n) && n >= y && n <= y + 4;
    },
    { message: "Please select a valid award year." }
  )
  .transform((v) => {
    const n = typeof v === "string" ? parseInt(v, 10) : v;
    return Number.isNaN(n) ? null : n;
  });

export type SaveAwardYearResult = {
  success: boolean;
  error?: string;
};

/**
 * saveAwardYear — Persist award_year for logged-in user (Step 0 resume).
 * Used when user returns mid-flow with account but no award_year in profile.
 */
export async function saveAwardYear(
  formData: FormData
): Promise<SaveAwardYearResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Not authenticated" };
  }

  const raw = formData.get("award_year") ?? "";
  const parsed = saveAwardYearSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid award year." };
  }

  const awardYear = parsed.data;
  if (awardYear === null) {
    return { success: false, error: "Please select a valid award year." };
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      award_year: awardYear,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (updateError) {
    return {
      success: false,
      error: "Failed to save. Please try again.",
    };
  }

  return { success: true };
}

// --- saveAcademicProfile (Step 2) ---
// award_year collected in Step 0; not in Step 2 form.

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
  sat_total: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === "" || v === undefined || v === null) return undefined;
      const n = typeof v === "string" ? parseInt(v, 10) : v;
      return Number.isNaN(n) ? undefined : n;
    })
    .refine(
      (v) => v === undefined || (v >= 400 && v <= 1600),
      "SAT total must be between 400 and 1600."
    ),
  act_composite: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === "" || v === undefined || v === null) return undefined;
      const n = typeof v === "string" ? parseInt(v, 10) : v;
      return Number.isNaN(n) ? undefined : n;
    })
    .refine(
      (v) => v === undefined || (v >= 1 && v <= 36),
      "ACT composite must be between 1 and 36."
    ),
  spikes: z
    .string()
    .optional()
    .transform((v) => {
      if (!v?.trim()) return undefined;
      return v
        .split(/[,;\n]/)
        .map((s) => s.trim().slice(0, 100))
        .filter((s) => s.length > 0)
        .slice(0, 10);
    }),
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
    sat_total: formData.get("sat_total") ?? "",
    act_composite: formData.get("act_composite") ?? "",
    spikes: formData.get("spikes") ?? "",
  };

  const parsed = saveAcademicProfileInputSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? "Invalid input.";
    return { success: false, error: msg };
  }

  const {
    intended_major,
    state,
    full_name,
    gpa_weighted,
    gpa_unweighted,
    sat_total,
    act_composite,
    spikes,
  } = parsed.data;

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
        sat_total: sat_total ?? null,
        act_composite: act_composite ?? null,
        spikes: spikes?.length ? spikes : null,
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
  pell_eligibility: z.preprocess(
    (v) => (v === "" || v === undefined ? undefined : v),
    pellEligibilityEnum.optional()
  ),
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
