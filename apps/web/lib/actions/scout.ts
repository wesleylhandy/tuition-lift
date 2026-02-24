"use server";

/**
 * Scout Server Actions — startScoutProcess, confirmScoutScholarship.
 * Per contracts/scout-server-actions.md. T014, T018.
 */
import { z } from "zod";
import { createServerSupabaseClient } from "../supabase/server";
import {
  ExtractedScholarshipDataSchema,
  ScoutInputSchema,
  type ExtractedScholarshipData,
  type TablesInsert,
} from "@repo/db";
import { getCurrentAcademicYear } from "../utils/academic-year";
import { runManualResearchNode } from "agent/lib/nodes/manual-research";

/** Local ScholarshipMetadata schema for confirmScoutScholarship; mirrors agent discovery schemas */
const scoringFactorsSchema = z.object({
  domain_tier: z.enum(["high", "vetted", "under_review"]),
  longevity_score: z.number().min(0).max(25),
  fee_check: z.enum(["pass", "fail"]),
});
const ScholarshipMetadataSchema = z.object({
  source_url: z.string(),
  snippet: z.string(),
  scoring_factors: scoringFactorsSchema,
  trust_report: z.string(),
  categories: z.array(z.string()),
  verification_status: z.enum([
    "verified",
    "ambiguous_deadline",
    "potentially_expired",
    "needs_manual_review",
  ]),
});

// --- startScoutProcess (T014) ---

export type ScoutProcessInput =
  | { input_type: "url"; url: string }
  | { input_type: "name"; name: string }
  | { input_type: "file"; file_path: string };

export type StartScoutProcessResult =
  | { success: true; run_id: string }
  | { success: false; error: string };

function toScoutInput(input: ScoutProcessInput) {
  const type = input.input_type;
  const obj =
    type === "url"
      ? { type: "url" as const, url: input.url }
      : type === "name"
        ? { type: "name" as const, name: input.name }
        : { type: "file" as const, file_path: input.file_path };
  return ScoutInputSchema.parse(obj);
}

export async function startScoutProcess(
  input: ScoutProcessInput
): Promise<StartScoutProcessResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  let scoutInput;
  try {
    scoutInput = toScoutInput(input);
  } catch {
    return { success: false, error: "Invalid input" };
  }

  const { data: run, error: insertError } = await supabase
    .from("scout_runs")
    .insert({
      user_id: user.id,
      step: "searching_sources",
      message: "Scout started",
    })
    .select("id")
    .single();

  if (insertError || !run?.id) {
    return { success: false, error: "Failed to create scout run" };
  }

  await runManualResearchNode(scoutInput, {
    runId: run.id,
    userId: user.id,
    supabase,
  });

  return { success: true, run_id: run.id };
}

// --- confirmScoutScholarship (T018) ---

export type ConfirmScoutResult =
  | { success: true; scholarshipId: string; applicationId: string }
  | { success: false; error: string }
  | { success: false; duplicate: true; existingTitle: string };

/** Maps ExtractedScholarshipData to ScholarshipMetadata per data-model §4 */
function toScholarshipMetadata(
  data: ExtractedScholarshipData
): z.infer<typeof ScholarshipMetadataSchema> {
  const scoring = data.scoring_factors ?? {
    domain_tier: "under_review" as const,
    longevity_score: 0,
    fee_check: "pass" as const,
  };
  return {
    source_url: data.url ?? "",
    snippet: (data.eligibility ?? "").slice(0, 500),
    scoring_factors: scoring,
    trust_report: data.trust_report ?? "Manual Scout entry",
    categories: ["other"],
    verification_status: data.verification_status,
  };
}

/** scholarship_category enum values */
const VALID_CATEGORIES = [
  "merit",
  "need_based",
  "minority",
  "field_specific",
  "other",
] as const;

type ScholarshipCategory = (typeof VALID_CATEGORIES)[number];

function toPrimaryCategory(categories: string[]): ScholarshipCategory {
  const first = categories[0];
  if (first && VALID_CATEGORIES.includes(first as ScholarshipCategory))
    return first as ScholarshipCategory;
  return "other";
}

export async function confirmScoutScholarship(
  data: unknown
): Promise<ConfirmScoutResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = ExtractedScholarshipDataSchema.safeParse(data);
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? "Invalid scholarship data";
    return { success: false, error: msg };
  }

  const extracted = parsed.data;
  const metadata = toScholarshipMetadata(extracted);
  const metaParsed = ScholarshipMetadataSchema.safeParse(metadata);
  if (!metaParsed.success) {
    return { success: false, error: "Invalid metadata" };
  }

  const url = extracted.url && extracted.url.trim() ? extracted.url : null;

  const now = new Date().toISOString();
  const category = toPrimaryCategory(metaParsed.data.categories);

  const metadataJson = JSON.parse(
    JSON.stringify(metaParsed.data)
  ) as TablesInsert<"scholarships">["metadata"];
  const scholarshipRow: TablesInsert<"scholarships"> = {
    title: extracted.title,
    url,
    trust_score: extracted.trust_score,
    amount: extracted.amount ?? null,
    deadline: extracted.deadline ?? null,
    category,
    metadata: metadataJson,
    updated_at: now,
  };

  if (url) {
    const { data: existing, error: fetchErr } = await supabase
      .from("scholarships")
      .select("id")
      .eq("url", url)
      .maybeSingle();

    if (fetchErr) {
      return { success: false, error: "Failed to check existing scholarship" };
    }

    if (existing) {
      const { error: updateErr } = await supabase
        .from("scholarships")
        .update({
          title: scholarshipRow.title,
          trust_score: scholarshipRow.trust_score,
          amount: scholarshipRow.amount,
          deadline: scholarshipRow.deadline,
          category: scholarshipRow.category,
          metadata: scholarshipRow.metadata,
          updated_at: now,
        })
        .eq("id", existing.id);

      if (updateErr) {
        return { success: false, error: "Failed to update scholarship" };
      }

      const academicYear = getCurrentAcademicYear();
      const { data: app, error: appErr } = await supabase
        .from("applications")
        .insert({
          user_id: user.id,
          scholarship_id: existing.id,
          academic_year: academicYear,
          status: "draft",
        })
        .select("id")
        .single();

      if (appErr) {
        if (appErr.code === "23505") {
          const { data: existingApp } = await supabase
            .from("applications")
            .select("id")
            .eq("user_id", user.id)
            .eq("scholarship_id", existing.id)
            .eq("academic_year", academicYear)
            .maybeSingle();
          return {
            success: true,
            scholarshipId: existing.id,
            applicationId: existingApp?.id ?? "",
          };
        }
        return { success: false, error: "Failed to add application" };
      }

      return {
        success: true,
        scholarshipId: existing.id,
        applicationId: app.id,
      };
    }
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("scholarships")
    .insert(scholarshipRow)
    .select("id")
    .single();

  if (insertErr) {
    return { success: false, error: `Failed to create scholarship: ${insertErr.message}` };
  }

  const academicYear = getCurrentAcademicYear();
  const { data: app, error: appErr } = await supabase
    .from("applications")
    .insert({
      user_id: user.id,
      scholarship_id: inserted.id,
      academic_year: academicYear,
      status: "draft",
    })
    .select("id")
    .single();

  if (appErr) {
    return { success: false, error: "Failed to add application" };
  }

  return {
    success: true,
    scholarshipId: inserted.id,
    applicationId: app.id,
  };
}
