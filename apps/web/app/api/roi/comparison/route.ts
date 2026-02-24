/**
 * ROI comparison API — institutions and career outcomes for side-by-side comparison.
 * Per contracts/api-parents.md §4. Auth: student or linked parent.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../../lib/supabase/server";
import { createDbClient } from "@repo/db";
import { resolveStudentIdForRoi } from "../../../../lib/roi-helpers";

const PATH_TYPES = [
  "4_year",
  "community_college",
  "trade_school",
] as const;

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const studentIdParam = searchParams.get("student_id");
  const pathTypesParam = searchParams.get("path_types");
  const pathTypes = pathTypesParam
    ? (pathTypesParam.split(",").map((s) => s.trim()) as string[])
    : PATH_TYPES;

  const resolved = await resolveStudentIdForRoi(user, studentIdParam ?? undefined);
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  const { studentId } = resolved;
  const db = createDbClient();

  // Filter institution_types to valid enum values
  const validPathTypes = pathTypes.filter((t) =>
    PATH_TYPES.includes(t as (typeof PATH_TYPES)[number])
  );
  const institutionTypes =
    validPathTypes.length > 0 ? validPathTypes : [...PATH_TYPES];

  const { data: institutions, error: instError } = await db
    .from("institutions")
    .select("id, name, institution_type, state, sticker_price, automatic_merit, net_price")
    .in("institution_type", institutionTypes);

  if (instError) {
    return NextResponse.json(
      { error: "Failed to fetch institutions" },
      { status: 500 }
    );
  }

  const { data: careerOutcomes } = await db
    .from("career_outcomes")
    .select("id, major_name, career_path, mean_annual_wage");

  // Scholarship totals: awarded (status=awarded) and potential (draft, submitted)
  const { data: applications } = await db
    .from("applications")
    .select("id, scholarship_id, status")
    .eq("user_id", studentId);

  const scholarshipIds =
    applications?.map((a) => a.scholarship_id) ?? [];
  const awardedIds =
    applications?.filter((a) => a.status === "awarded").map((a) => a.scholarship_id) ?? [];
  const potentialIds =
    applications?.filter((a) =>
      ["draft", "submitted"].includes(a.status)
    ).map((a) => a.scholarship_id) ?? [];

  let awardedTotal = 0;
  let potentialTotal = 0;

  if (scholarshipIds.length > 0) {
    const { data: scholarships } = await db
      .from("scholarships")
      .select("id, amount")
      .in("id", scholarshipIds);

    const amountById = new Map(
      (scholarships ?? []).map((s) => [
        s.id,
        (typeof s.amount === "number" && !Number.isNaN(s.amount)
          ? s.amount
          : 0),
      ])
    );
    awardedTotal = awardedIds.reduce(
      (sum, id) => sum + (amountById.get(id) ?? 0),
      0
    );
    potentialTotal = potentialIds.reduce(
      (sum, id) => sum + (amountById.get(id) ?? 0),
      0
    );
  }

  const items = (institutions ?? []).map((inst) => {
    const raw = inst.net_price;
    const netPrice =
      typeof raw === "number" && !Number.isNaN(raw) ? raw : 0;
    const remainingConfirmed = Math.max(0, netPrice - awardedTotal);
    const remainingIfPotential = Math.max(
      0,
      netPrice - awardedTotal - potentialTotal
    );
    return {
      id: inst.id,
      name: inst.name,
      institutionType: inst.institution_type,
      state: inst.state,
      stickerPrice: inst.sticker_price,
      automaticMerit: inst.automatic_merit,
      netPrice: inst.net_price,
      remainingConfirmed,
      remainingIfPotential,
    };
  });

  return NextResponse.json({
    institutions: items,
    careerOutcomes: careerOutcomes ?? [],
    scholarshipSummary: {
      awardedTotal,
      potentialTotal,
    },
  });
}
