/**
 * GET /api/me — Current user context for dashboard (userId, threadId, awardYear).
 * Auth: required. US1 T023: awardYear included for discovery/tracking gate in UI.
 * T048: hasApplicationsForOtherYear when user changed award_year and has apps for another year.
 */
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createDbClient, awardYearToAcademicYear } from "@repo/db";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createDbClient();
  const { data: profile } = await db
    .from("profiles")
    .select("award_year")
    .eq("id", user.id)
    .single();

  const awardYear = profile?.award_year ?? null;
  let hasApplicationsForOtherYear = false;

  if (awardYear != null) {
    const currentAcademicYear = awardYearToAcademicYear(awardYear);
    const { data: otherYearApps } = await db
      .from("applications")
      .select("id")
      .eq("user_id", user.id)
      .neq("academic_year", currentAcademicYear)
      .limit(1);
    hasApplicationsForOtherYear = (otherYearApps?.length ?? 0) > 0;
  }

  return NextResponse.json({
    userId: user.id,
    threadId: `user_${user.id}`,
    awardYear,
    hasApplicationsForOtherYear,
  });
}
