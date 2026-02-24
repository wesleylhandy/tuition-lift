/**
 * COA comparison API — SAI vs average COA of saved schools, Need-to-Merit zone.
 * Per contracts/api-coa-comparison.md §1. Auth: student only.
 */
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../../lib/supabase/server";
import { createDbClient, decryptSai, getSaiZoneConfig } from "@repo/db";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const studentId = user.id;
  const db = createDbClient();

  const { data: profile } = await db
    .from("profiles")
    .select("sai, award_year")
    .eq("id", studentId)
    .single();

  const sai = profile?.sai != null ? decryptSai(profile.sai) : null;
  const awardYear = profile?.award_year ?? new Date().getFullYear();

  const { data: savedRows } = await db
    .from("user_saved_schools")
    .select("institution_id")
    .eq("user_id", studentId);

  const instIds = (savedRows ?? []).map((r) => r.institution_id);
  let institutions: Array<{ id: string; name: string; institution_type: string; coa: number | null }> = [];

  if (instIds.length > 0) {
    const { data: instData } = await db
      .from("institutions")
      .select("id, name, institution_type, coa")
      .in("id", instIds);
    institutions = instData ?? [];
  }

  const instById = new Map(
    institutions.map((i) => [i.id, i])
  );
  const savedSchools: Array<{
    institutionId: string;
    name: string;
    institutionType: string;
    coa: number | null;
    financialNeed: number;
  }> = [];
  let totalCoa = 0;
  let coaCount = 0;

  for (const row of savedRows ?? []) {
    const inst = instById.get(row.institution_id);
    if (!inst) continue;
    const coa = inst.coa != null ? Number(inst.coa) : null;
    const financialNeed =
      sai != null && coa != null ? coa - sai : coa ?? 0;
    savedSchools.push({
      institutionId: row.institution_id,
      name: inst.name,
      institutionType: inst.institution_type,
      coa,
      financialNeed,
    });
    if (coa != null) {
      totalCoa += coa;
      coaCount += 1;
    }
  }

  const averageCoa =
    coaCount > 0 ? Math.round((totalCoa / coaCount) * 100) / 100 : null;

  let needToMeritZone: "need_based" | "merit_based";
  let fallbackUsed = false;
  let fallbackMessage: string | undefined;

  if (averageCoa != null && sai != null) {
    needToMeritZone = averageCoa - sai > 0 ? "need_based" : "merit_based";
  } else {
    fallbackUsed = true;
    fallbackMessage = "Add saved schools to see your Need-to-Merit transition";
    const zoneConfig = await getSaiZoneConfig(awardYear);
    if (sai != null && zoneConfig) {
      needToMeritZone =
        sai < zoneConfig.merit_lean_threshold ? "need_based" : "merit_based";
    } else {
      needToMeritZone = "merit_based";
    }
  }

  return NextResponse.json({
    sai: sai ?? 0,
    awardYear,
    averageCoa,
    needToMeritZone,
    savedSchools,
    fallbackUsed,
    ...(fallbackMessage && { fallbackMessage }),
  });
}
