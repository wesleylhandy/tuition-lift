/**
 * Major Pivot queries (US3): career_outcomes and institutions for Coach recommendations.
 * Used when user indicates undecided major; Coach suggests majors and schools by interest match.
 */

import { createDbClient } from "./client";

export interface CareerOutcomeRow {
  id: string;
  major_name: string;
  career_path: string | null;
  mean_annual_wage: number | null;
  cip_code: string | null;
  soc_code: string | null;
}

export interface InstitutionRow {
  id: string;
  name: string;
  institution_type: string;
  state: string | null;
  net_price: number | null;
  coa: number | null;
}

const MAX_MAJORS = 8;
const MAX_INSTITUTIONS = 6;

/**
 * Fetches career outcomes (majors) matching given keywords or category hints.
 * Uses ilike on major_name and career_path when keywords provided; otherwise returns top by mean wage.
 */
export async function getCareerOutcomesByInterest(
  keywords: string[],
  options?: { limit?: number }
): Promise<CareerOutcomeRow[]> {
  const db = createDbClient();
  const limit = options?.limit ?? MAX_MAJORS;

  const { data, error } = await db
    .from("career_outcomes")
    .select("id, major_name, career_path, mean_annual_wage, cip_code, soc_code")
    .limit(100);

  if (error) return [];

  let rows = (data ?? []) as CareerOutcomeRow[];
  if (keywords.length > 0) {
    const lower = keywords.map((k) => k.toLowerCase());
    const scored = rows.map((r) => {
      const text = `${r.major_name ?? ""} ${r.career_path ?? ""}`.toLowerCase();
      const score = lower.filter((k) => text.includes(k)).length;
      return { row: r, score };
    });
    rows = scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((s) => s.row);
  }

  if (rows.length === 0 && keywords.length > 0) {
    const { data: fallback } = await db
      .from("career_outcomes")
      .select("id, major_name, career_path, mean_annual_wage, cip_code, soc_code")
      .not("mean_annual_wage", "is", null)
      .order("mean_annual_wage", { ascending: false })
      .limit(limit);
    rows = (fallback ?? []) as CareerOutcomeRow[];
  } else if (rows.length === 0) {
    const { data: d } = await db
      .from("career_outcomes")
      .select("id, major_name, career_path, mean_annual_wage, cip_code, soc_code")
      .order("mean_annual_wage", { ascending: false })
      .limit(limit);
    rows = (d ?? []) as CareerOutcomeRow[];
  }

  return rows.slice(0, limit);
}

/**
 * Fetches institutions optionally filtered by state.
 * Returns mix of 4-year, community college, trade school when no state filter.
 */
export async function getInstitutionsForRecommendation(
  stateCode?: string | null,
  options?: { limit?: number }
): Promise<InstitutionRow[]> {
  const db = createDbClient();
  const limit = options?.limit ?? MAX_INSTITUTIONS;

  let query = db
    .from("institutions")
    .select("id, name, institution_type, state, net_price, coa")
    .limit(limit * 2);

  if (stateCode?.trim()) {
    query = query.ilike("state", stateCode.trim());
  }

  const { data, error } = await query;
  if (error) return [];
  const rows = (data ?? []) as InstitutionRow[];
  return rows.slice(0, limit);
}
