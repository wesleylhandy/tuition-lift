/**
 * DB-first lookup: query high-trust scholarships (trust_score ≥ 60) before external search.
 * US4: Reduces external API latency; uses scholarship_cycle_verifications for cycle-aware flags.
 *
 * Per research §3: trust_score ≥ 60 (Vetted Commercial + High Trust).
 * Per data-model: scholarship_cycle_verifications for "verified for cycle X?" checks.
 */
import {
  createDbClient,
  awardYearToAcademicYear,
  isScholarshipVerifiedForCycle,
} from "@repo/db";
import type { DiscoveryResult } from "../schemas";
import type { AnonymizedProfile } from "./schemas";

const TRUST_THRESHOLD = 60;

/** Raw scholarship row from DB (select subset). */
interface ScholarshipRow {
  id: string;
  title: string;
  url: string | null;
  trust_score: number;
  deadline: string | null;
  amount: number | null;
  metadata: {
    snippet?: string;
    categories?: string[];
  } | null;
}

/**
 * True when deadline (YYYY-MM-DD) is before today.
 */
function isPastDeadline(deadline: string | null): boolean {
  if (!deadline) return false;
  const d = new Date(deadline);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return !Number.isNaN(d.getTime()) && d < today;
}

/**
 * Queries scholarships with trust_score ≥ 60.
 * Match by award year: academic year used for cycle verification checks.
 * Returns DiscoveryResult-shaped items for merge with Tavily results.
 */
export async function queryDbFirstScholarships(
  profile: AnonymizedProfile,
  discoveryRunId: string
): Promise<DiscoveryResult[]> {
  const awardYear = profile.award_year;
  if (typeof awardYear !== "number") return [];
  const academicYear = awardYearToAcademicYear(awardYear);

  const db = createDbClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- scholarships typed after db:generate
  const { data: rows, error } = await (db as any)
    .from("scholarships")
    .select("id, title, url, trust_score, deadline, amount, metadata")
    .gte("trust_score", TRUST_THRESHOLD)
    .not("url", "is", null);

  if (error || !rows || rows.length === 0) return [];

  const results: DiscoveryResult[] = [];
  for (const row of rows as ScholarshipRow[]) {
    const url = row.url?.trim();
    if (!url) continue;

    const verified = await isScholarshipVerifiedForCycle(row.id, academicYear);
    const pastDeadline = isPastDeadline(row.deadline);
    const needsReverification = !verified && pastDeadline;

    const metadata = (row.metadata ?? {}) as { snippet?: string; categories?: string[] };
    const content = metadata.snippet ?? row.title;
    const categories = metadata.categories ?? [];

    const dr: DiscoveryResult = {
      id: row.id,
      discovery_run_id: discoveryRunId,
      title: row.title,
      url,
      trust_score: row.trust_score,
      need_match_score: 0,
      content: content || undefined,
      verification_status: needsReverification ? "potentially_expired" : undefined,
      categories: categories.length > 0 ? categories : undefined,
      deadline: row.deadline ?? undefined,
      amount: row.amount ?? null,
      merit_tag:
        categories[0] === "need_blind"
          ? "need_blind"
          : categories[0] === "merit"
            ? "merit_only"
            : categories[0] === "need_based"
              ? "need_based"
              : undefined,
    };
    results.push(dr);
  }

  return results;
}
