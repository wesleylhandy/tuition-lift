/**
 * Saved institutions queries for discovery criteria expansion (014 US7).
 * user_saved_schools + institutions join; returns institution names for query generation.
 */

import { createDbClient } from "./client";

/** Max institution names to include in discovery queries (FR-014). */
const MAX_SAVED_NAMES = 10;

/**
 * Fetches saved institution names for a user (user_saved_schools join institutions).
 * Returns up to 10 names for discovery query generation. Per SC-009.
 */
export async function getSavedInstitutionNamesForUser(
  userId: string
): Promise<string[]> {
  const db = createDbClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- user_saved_schools typed after migrations
  const { data, error } = await (db as any)
    .from("user_saved_schools")
    .select("institution_id")
    .eq("user_id", userId)
    .order("saved_at", { ascending: false })
    .limit(MAX_SAVED_NAMES);

  if (error || !data?.length) return [];

  const instIds = data.map((r: { institution_id: string }) => r.institution_id);
  const { data: institutions } = await db
    .from("institutions")
    .select("name")
    .in("id", instIds);

  const names = (institutions ?? [])
    .filter((i: { name?: string }) => typeof i?.name === "string" && i.name.trim().length > 0)
    .map((i: { name: string }) => i.name.trim().slice(0, 200))
    .slice(0, MAX_SAVED_NAMES);

  return names;
}
