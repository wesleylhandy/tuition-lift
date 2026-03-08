/**
 * Coach Game Plan — Top 3 batch logic.
 * Per plan.md "Coach–Orchestration Integration": This module reads from and writes to
 * the applications table ONLY. It MUST NOT write to LangGraph checkpoint (active_milestones).
 * - Source: applications (momentum_score)
 * - Persists: momentum_score to applications (002) only
 * - Forbidden: checkpoint update, active_milestones write
 *
 * Orchestration (003) active_milestones serves discovery flow when user has no tracked
 * applications. When user has applications, Coach Game Plan uses applications table.
 *
 * T014: load users with applications, compute Momentum Score, persist momentum_score.
 * T015: zero-apps users skipped (they have no applications; API returns suggestion).
 * T016: getGamePlanForUser — compute Top 3 on demand for GET /api/coach/game-plan.
 * US5 (T036–T038): Alternative Path comparison for Squeezed Middle when 009 catalog has data.
 */

import {
  createDbClient,
  decryptSai,
  getSaiZoneConfig,
} from "@repo/db";
import { computeMomentumScoreForApplication } from "./momentum-score";
import { dbToCoachState } from "./state-mapper";
import type { CoachState } from "./state-mapper";
import type { DbApplicationStatus } from "./state-mapper";

/** Active statuses for Top 3 (draft = Tracked/Drafting/Review; submitted = Outcome Pending). */
const ACTIVE_STATUSES: DbApplicationStatus[] = ["draft", "submitted"];

export interface RunGamePlanBatchResult {
  processed: number;
  skipped: number;
  updated: number;
}

interface AppWithScholarship {
  id: string;
  user_id: string;
  status: DbApplicationStatus;
  scholarships: {
    deadline: string | null;
    trust_score: number;
  } | null;
}

/**
 * T014: Run game plan batch — load users with applications, compute Momentum Score,
 * persist momentum_score to applications only. Zero-apps users are skipped (they do not
 * appear in applications table). No checkpoint write.
 */
export async function runGamePlanBatch(): Promise<RunGamePlanBatchResult> {
  const db = createDbClient();

  const { data: apps, error: fetchError } = await db
    .from("applications")
    .select(
      `
      id,
      user_id,
      status,
      scholarships (
        deadline,
        trust_score
      )
    `
    )
    .in("status", ACTIVE_STATUSES);

  if (fetchError) {
    throw new Error(`Game plan batch fetch failed: ${fetchError.message}`);
  }

  const rows = (apps ?? []) as unknown as AppWithScholarship[];
  let updated = 0;

  for (const row of rows) {
    const trustScore = row.scholarships?.trust_score ?? 50;
    const deadline = row.scholarships?.deadline ?? null;
    const momentumScore = computeMomentumScoreForApplication({
      deadline,
      trustScore,
      applicationStatus: row.status,
    });

    const { error: updateError } = await db
      .from("applications")
      .update({
        momentum_score: momentumScore,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    if (updateError) {
      throw new Error(
        `Game plan batch update failed for ${row.id}: ${updateError.message}`
      );
    }
    updated++;
  }

  const uniqueUsers = new Set(rows.map((r) => r.user_id));
  return {
    processed: uniqueUsers.size,
    skipped: 0,
    updated,
  };
}

/** US5 (T036): Squeezed Middle = Grey Zone per 009 (pell_cutoff < SAI <= grey_zone_end). */
function isSqueezedMiddle(
  sai: number,
  zone: { pell_cutoff: number; grey_zone_end: number }
): boolean {
  return sai > zone.pell_cutoff && sai <= zone.grey_zone_end;
}

const INSTITUTION_TYPE_LABELS: Record<string, string> = {
  "4_year": "4-Year College",
  community_college: "Community College",
  trade_school: "Trade School",
  city_college: "City College",
};

/** US5 (T037–T038): Query 009 catalog for Alternative Path comparison. Returns null when no data. */
async function fetchAlternativePathComparison(
  db: ReturnType<typeof createDbClient>
): Promise<AlternativePathComparison | null> {
  const types = ["4_year", "community_college", "trade_school"] as const;
  const { data: rows, error } = await db
    .from("institutions")
    .select("name, institution_type, net_price, sticker_price")
    .in("institution_type", types);

  if (error || !rows?.length) return null;

  const byType = new Map<string, Array<{ name: string; price: number | null }>>();
  for (const r of rows as Array<{
    name: string;
    institution_type: string;
    net_price: number | null;
    sticker_price: number | null;
  }>) {
    const price =
      typeof r.net_price === "number" && !Number.isNaN(r.net_price)
        ? r.net_price
        : typeof r.sticker_price === "number" && !Number.isNaN(r.sticker_price)
          ? r.sticker_price
          : null;
    if (!byType.has(r.institution_type)) {
      byType.set(r.institution_type, []);
    }
    byType.get(r.institution_type)!.push({ name: r.name, price });
  }

  if (byType.size < 2) return null;

  const items: AlternativePathItem[] = [];
  for (const [type, insts] of byType) {
    const withPrice = insts.filter((i) => i.price != null);
    const sample = withPrice[0] ?? insts[0];
    if (!sample) continue;
    const label = INSTITUTION_TYPE_LABELS[type] ?? type;
    const estimatedNetPrice =
      sample.price != null ? Math.round(sample.price) : null;
    items.push({
      institutionType: type,
      label,
      sampleName: sample.name,
      estimatedNetPrice,
    });
  }

  if (items.length < 2) return null;

  return {
    disclaimer:
      "Estimated costs from curated catalog — actual costs vary. Not guaranteed.",
    items,
  };
}

/** Coach persona suggestion by state (FR-015: dynamic micro-copy). */
const STATE_SUGGESTIONS: Record<CoachState, string> = {
  Tracked: "Spend 5 minutes reviewing requirements and getting started.",
  Drafting: "5 minutes on the intro today — small wins add up.",
  Review: "Final pass today — you're in the red zone.",
  Submitted: "You've submitted — great work. Check for confirmation emails.",
  "Outcome Pending": "No updates yet. Patience — decisions take time.",
  Won: "Congratulations! Confirm your win to update your total.",
  Lost: "On to the next. Each application sharpens your skills.",
};

export interface Top3Item {
  applicationId: string;
  scholarshipTitle: string;
  momentumScore: number;
  deadline: string | null;
  coachState: CoachState;
  suggestion: string;
  /** T027 [US2]: 0–100 from Discovery; null for Scout path; used for prioritization display */
  needMatchScore: number | null;
}

export interface PendingCheckIn {
  checkInTaskId: string;
  applicationId: string;
  dueAt: string;
  prompt: string;
}

/** Per 006 FR-007: cumulative $ from applications where status='awarded' AND confirmed_at IS NOT NULL */
export interface DebtLifted {
  totalCents: number;
}

/** Per 006 FR-008: nearest deadline or next actionable milestone */
export interface NextWin {
  /** ISO date string (YYYY-MM-DD) or null */
  deadline: string | null;
  /** Application/scholarship title for context */
  label: string | null;
}

/** US5 (T037–T038): Alternative Path comparison for Squeezed Middle. Per 009: clearly labeled, avoids misrepresentation. */
export interface AlternativePathItem {
  /** Institution type: 4_year, community_college, trade_school */
  institutionType: string;
  /** Human-readable label (e.g., "4-Year College", "Trade School") */
  label: string;
  /** Sample institution name */
  sampleName: string;
  /** Estimated net price (dollars); per 009 FR-004, potential outcomes not guaranteed */
  estimatedNetPrice: number | null;
}

/** US5: Trade School vs 4-Year (or Community College) comparison. Only included when catalog has data. */
export interface AlternativePathComparison {
  /** Per 009: clearly labeled to avoid misrepresenting potential outcomes */
  disclaimer: string;
  items: AlternativePathItem[];
}

export interface GamePlanResponse {
  top3: Top3Item[];
  pendingCheckIns?: PendingCheckIn[];
  suggestion?: string;
  generatedAt: string;
  /** Per 006 FR-007: Debt Lifted from confirmed Won applications */
  debtLifted?: DebtLifted;
  /** Per 006 FR-008: Next Win countdown — nearest deadline */
  nextWin?: NextWin;
  /** US5: Alternative Path comparison for Squeezed Middle when 009 catalog has data; omitted otherwise */
  alternativePathComparison?: AlternativePathComparison;
}

function resolveAwardYearForZone(awardYear: number | null): number {
  const y = new Date().getFullYear();
  if (awardYear != null && awardYear >= y && awardYear <= y + 4) {
    return awardYear;
  }
  return y;
}

/**
 * T016: Get game plan for user — compute Top 3 on demand from applications
 * (ordered by momentum_score desc), include pending check-in tasks.
 * Zero-apps: returns suggestion per FR-001a. No checkpoint read/write.
 * US5: Include Alternative Path comparison for Squeezed Middle when catalog has data.
 */
export async function getGamePlanForUser(
  userId: string
): Promise<GamePlanResponse> {
  const db = createDbClient();
  const generatedAt = new Date().toISOString();

  const { data: profileRow } = await db
    .from("profiles")
    .select("sai, award_year")
    .eq("id", userId)
    .single();

  let alternativePathComparison: AlternativePathComparison | undefined;
  const sai = profileRow?.sai != null ? decryptSai(profileRow.sai) : null;
  const awardYear = resolveAwardYearForZone(
    typeof profileRow?.award_year === "number" ? profileRow.award_year : null
  );
  const zoneConfig = await getSaiZoneConfig(awardYear);
  if (
    typeof sai === "number" &&
    zoneConfig &&
    isSqueezedMiddle(sai, zoneConfig)
  ) {
    const comparison = await fetchAlternativePathComparison(db);
    if (comparison) alternativePathComparison = comparison;
  }

  const { data: apps, error: appsError } = await db
    .from("applications")
    .select(
      `
      id,
      momentum_score,
      need_match_score,
      status,
      scholarships (
        title,
        deadline,
        trust_score
      )
    `
    )
    .eq("user_id", userId)
    .in("status", ACTIVE_STATUSES)
    .order("momentum_score", { ascending: false, nullsFirst: false })
    .limit(3);

  if (appsError) {
    throw new Error(`Game plan fetch failed: ${appsError.message}`);
  }

  const rows = (apps ?? []) as Array<{
    id: string;
    momentum_score: number | null;
    need_match_score: number | null;
    status: DbApplicationStatus;
    scholarships: { title: string; deadline: string | null; trust_score: number } | null;
  }>;

  if (rows.length === 0) {
    // Still compute debtLifted for zero-apps users (might have Won from before)
    const { data: awardedRows } = await db
      .from("applications")
      .select("scholarships ( amount )")
      .eq("user_id", userId)
      .eq("status", "awarded")
      .not("confirmed_at", "is", null);
    let totalCents = 0;
    if (awardedRows) {
      for (const row of awardedRows as Array<{ scholarships: { amount: number | null } | null }>) {
        const amt = row.scholarships?.amount;
        if (typeof amt === "number" && amt > 0) {
          totalCents += Math.round(amt * 100);
        }
      }
    }
    return {
      top3: [],
      suggestion:
        "Add applications or run discovery to get your game plan.",
      debtLifted: { totalCents },
      nextWin: { deadline: null, label: null },
      generatedAt,
      ...(alternativePathComparison && { alternativePathComparison }),
    };
  }

  const top3: Top3Item[] = rows.map((row) => {
    const coachState = dbToCoachState(row.status);
    const momentumScore =
      row.momentum_score ??
      computeMomentumScoreForApplication({
        deadline: row.scholarships?.deadline ?? null,
        trustScore: row.scholarships?.trust_score ?? 50,
        applicationStatus: row.status,
      });
    return {
      applicationId: row.id,
      scholarshipTitle: row.scholarships?.title ?? "Scholarship",
      momentumScore,
      deadline: row.scholarships?.deadline ?? null,
      coachState,
      suggestion: STATE_SUGGESTIONS[coachState],
      needMatchScore: row.need_match_score ?? null,
    };
  });

  const { data: checkIns, error: checkInsError } = await db
    .from("check_in_tasks")
    .select("id, application_id, due_at")
    .eq("user_id", userId)
    .eq("status", "pending");

  if (checkInsError) {
    throw new Error(`Check-in tasks fetch failed: ${checkInsError.message}`);
  }

  const pendingCheckIns: PendingCheckIn[] = (checkIns ?? []).map((c) => ({
    checkInTaskId: c.id,
    applicationId: c.application_id,
    dueAt: c.due_at,
    prompt: "Have you heard back? Any updates?",
  }));

  // 006 FR-007: Debt Lifted — sum scholarships.amount for applications where status='awarded' AND confirmed_at IS NOT NULL
  const { data: awardedRows } = await db
    .from("applications")
    .select("scholarships ( amount )")
    .eq("user_id", userId)
    .eq("status", "awarded")
    .not("confirmed_at", "is", null);

  const debtLifted: DebtLifted = {
    totalCents: 0,
  };
  if (awardedRows) {
    for (const row of awardedRows as Array<{ scholarships: { amount: number | null } | null }>) {
      const amt = row.scholarships?.amount;
      if (typeof amt === "number" && amt > 0) {
        debtLifted.totalCents += Math.round(amt * 100);
      }
    }
  }

  // 006 FR-008: Next Win — nearest future deadline from top3; fallback to all apps if top3 has none
  let nextWin: NextWin = { deadline: null, label: null };
  const today = new Date().toISOString().slice(0, 10);
  const deadlinesFromTop3 = top3
    .filter((t) => t.deadline)
    .map((t) => ({ deadline: t.deadline!, title: t.scholarshipTitle }));
  let futureDeadlines = deadlinesFromTop3
    .filter((d) => d.deadline >= today)
    .sort((a, b) => a.deadline.localeCompare(b.deadline));
  if (futureDeadlines.length === 0) {
    const { data: allApps } = await db
      .from("applications")
      .select("scholarships ( deadline, title )")
      .eq("user_id", userId)
      .in("status", ACTIVE_STATUSES);
    const fromAll = (allApps ?? []) as Array<{
      scholarships: { deadline: string | null; title: string } | null;
    }>;
    const fromAllDeadlines: Array<{ deadline: string; title: string }> = [];
    for (const r of fromAll) {
      const sch = r.scholarships;
      const dl = sch?.deadline;
      if (dl && dl >= today) {
        fromAllDeadlines.push({
          deadline: dl,
          title: sch?.title ?? "Scholarship",
        });
      }
    }
    fromAllDeadlines.sort((a, b) => a.deadline.localeCompare(b.deadline));
    futureDeadlines = fromAllDeadlines;
  }
  const firstDeadline = futureDeadlines[0];
  if (firstDeadline) {
    nextWin = {
      deadline: firstDeadline.deadline,
      label: firstDeadline.title,
    };
  } else {
    const firstTask = top3[0];
    if (firstTask) {
      nextWin = { deadline: null, label: firstTask.scholarshipTitle };
    }
  }

  return {
    top3,
    pendingCheckIns,
    debtLifted,
    nextWin,
    generatedAt,
    ...(alternativePathComparison && { alternativePathComparison }),
  };
}
