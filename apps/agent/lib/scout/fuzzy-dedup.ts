/**
 * Fuzzy deduplication for Scout scholarship titles.
 * T031 [US5]: Uses fuzzball.ratio to detect potential duplicates.
 * Per data-model §5: query user's scholarship titles, compare incoming title.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { ratio } from "fuzzball";
import { parseScoutEnv } from "../env";

export type FuzzyDuplicateResult =
  | { match: true; existingTitle: string }
  | { match: false };

/**
 * Checks if the given title fuzzy-matches any of the user's existing scholarship titles.
 * Uses fuzzball.ratio; threshold from SCOUT_DEDUP_SIMILARITY_THRESHOLD (default 0.85).
 *
 * @param title - Incoming scholarship title
 * @param userId - Authenticated user ID
 * @param supabase - Supabase client (with RLS)
 * @returns Match result with existing title if similarity ≥ threshold
 */
export async function checkFuzzyDuplicate(
  title: string,
  userId: string,
  supabase: SupabaseClient
): Promise<FuzzyDuplicateResult> {
  if (!title?.trim()) return { match: false };

  const { SCOUT_DEDUP_SIMILARITY_THRESHOLD } = parseScoutEnv();
  const thresholdPercent = Math.round(SCOUT_DEDUP_SIMILARITY_THRESHOLD * 100);

  const { data: applications } = await supabase
    .from("applications")
    .select("scholarship_id")
    .eq("user_id", userId);

  if (!applications?.length) return { match: false };

  const scholarshipIds = [...new Set(applications.map((a) => a.scholarship_id))];

  const { data: scholarships } = await supabase
    .from("scholarships")
    .select("title")
    .in("id", scholarshipIds);

  if (!scholarships?.length) return { match: false };

  const trimmedTitle = title.trim();
  for (const s of scholarships) {
    const existing = s.title?.trim();
    if (!existing) continue;
    const score = ratio(trimmedTitle, existing);
    if (score >= thresholdPercent) {
      return { match: true, existingTitle: existing };
    }
  }

  return { match: false };
}
