"use server";

/**
 * Scout Server Actions — uploadScoutFile, startScoutProcess, confirmScoutScholarship.
 * Per contracts/scout-server-actions.md. T014, T018, T022.
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
import { checkFuzzyDuplicate } from "agent/lib/scout/fuzzy-dedup";

const SCOUT_MAX_FILE_SIZE_BYTES =
  (parseFloat(process.env.SCOUT_MAX_FILE_SIZE_MB ?? "10") || 10) * 1024 * 1024;
const VALID_MIMES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
] as const;

// --- uploadScoutFile (T022) ---

export type UploadScoutFileResult =
  | { success: true; path: string }
  | { success: false; error: string };

export async function uploadScoutFile(
  formData: FormData
): Promise<UploadScoutFileResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { success: false, error: "No file provided" };
  }

  if (!VALID_MIMES.includes(file.type as (typeof VALID_MIMES)[number])) {
    return { success: false, error: "Please upload PDF, PNG, or JPG only" };
  }
  if (file.size > SCOUT_MAX_FILE_SIZE_BYTES) {
    return {
      success: false,
      error: `File too large (max ${Math.round(SCOUT_MAX_FILE_SIZE_BYTES / 1024 / 1024)} MB)`,
    };
  }

  const ext = file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : "jpg";
  const uuid = crypto.randomUUID();
  const path = `${user.id}/${uuid}.${ext}`;

  const buffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from("scout_uploads")
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return {
      success: false,
      error: uploadError.message ?? "Failed to upload file",
    };
  }

  return { success: true, path };
}

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

  try {
    await runManualResearchNode(scoutInput, {
      runId: run.id,
      userId: user.id,
      supabase,
    });
  } catch {
    // Node updates scout_runs to error; still return run_id so client can poll and see error state.
  }

  return { success: true, run_id: run.id };
}

// --- confirmScoutScholarship (T018) ---

export type ConfirmScoutResult =
  | { success: true; scholarshipId: string; applicationId: string }
  | { success: true; scholarshipId: string; applicationId: string; potentiallyExpired: true }
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
  data: unknown,
  options?: { forceAdd?: boolean }
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

  if (!options?.forceAdd) {
    const dup = await checkFuzzyDuplicate(extracted.title, user.id, supabase);
    if (dup.match) {
      return {
        success: false,
        duplicate: true,
        existingTitle: dup.existingTitle,
      };
    }
  }

  const deadline = extracted.deadline ?? null;
  const today = new Date().toISOString().slice(0, 10);
  const potentiallyExpired =
    deadline !== null && deadline < today ? true : undefined;

  const metadata = toScholarshipMetadata(extracted);
  if (potentiallyExpired && metadata.verification_status !== "potentially_expired") {
    metadata.verification_status = "potentially_expired";
  }
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
          return potentiallyExpired
            ? {
                success: true,
                scholarshipId: existing.id,
                applicationId: existingApp?.id ?? "",
                potentiallyExpired: true,
              }
            : {
                success: true,
                scholarshipId: existing.id,
                applicationId: existingApp?.id ?? "",
              };
        }
        return { success: false, error: "Failed to add application" };
      }

      return potentiallyExpired
        ? {
            success: true,
            scholarshipId: existing.id,
            applicationId: app.id,
            potentiallyExpired: true,
          }
        : {
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

  return potentiallyExpired
    ? {
        success: true,
        scholarshipId: inserted.id,
        applicationId: app.id,
        potentiallyExpired: true,
      }
    : {
        success: true,
        scholarshipId: inserted.id,
        applicationId: app.id,
      };
}
