/**
 * ScholarshipUpsert: INSERT ON CONFLICT(url) DO UPDATE per FR-015.
 * Persists verified discovery results to scholarships with metadata JSONB.
 * US3/FR-016a: metadata.categories stores all applicable categories
 * (e.g. need_based + field_specific) when scholarship fits multiple.
 *
 * @see contracts/discovery-internals.md §6, data-model.md §2
 */
import { createDbClient } from "@repo/db";
import type { TablesInsert } from "@repo/db";
import type { DiscoveryResult } from "../schemas";
import type { ScholarshipMetadata } from "./schemas";
import { ScholarshipMetadataSchema } from "./schemas";

/** scholarship_category enum values from 002 migration */
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

/**
 * Upserts a scholarship by URL. ON CONFLICT(url) updates trust_score, metadata, updated_at.
 * Returns the scholarship id (existing or newly inserted).
 */
export async function upsertScholarship(
  result: DiscoveryResult,
  metadata: ScholarshipMetadata
): Promise<string> {
  const parsed = ScholarshipMetadataSchema.safeParse(metadata);
  if (!parsed.success) {
    throw new Error(
      `Invalid scholarship metadata: ${parsed.error.message}`
    );
  }

  const supabase = createDbClient();
  const now = new Date().toISOString();
  const primaryCategory = toPrimaryCategory(parsed.data.categories);

  const row: TablesInsert<"scholarships"> = {
    title: result.title,
    url: result.url,
    trust_score: result.trust_score,
    amount: result.amount ?? null,
    deadline: result.deadline ?? null,
    category: primaryCategory,
    metadata: parsed.data as TablesInsert<"scholarships">["metadata"],
    updated_at: now,
  };

  const { data, error } = await supabase
    .from("scholarships")
    .upsert(row, {
      onConflict: "url",
      ignoreDuplicates: false,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Scholarship upsert failed: ${error.message}`);
  }

  return data.id;
}
