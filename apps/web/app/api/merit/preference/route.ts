/**
 * Merit preference API — GET returns current preference and threshold status;
 * PATCH updates profiles.merit_filter_preference.
 * US1 (009): Merit Hunter toggle.
 *
 * @see specs/009-squeezed-middle-roi/tasks.md T026
 */
import { NextRequest, NextResponse } from "next/server";
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

  const db = createDbClient();
  const { data: row, error } = await db
    .from("profiles")
    .select("sai, merit_filter_preference, award_year")
    .eq("id", user.id)
    .single();

  if (error || !row) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const sai = decryptSai(row.sai);
  const awardYear = row.award_year ?? new Date().getFullYear();
  const zoneConfig = sai != null ? await getSaiZoneConfig(awardYear) : null;
  const saiAboveThreshold =
    sai != null &&
    zoneConfig != null &&
    typeof sai === "number" &&
    sai >= zoneConfig.merit_lean_threshold;

  const pref =
    row.merit_filter_preference === "merit_only" ? "merit_only" : "show_all";

  return NextResponse.json({
    meritFilterPreference: pref,
    saiAboveThreshold,
    awardYear: row.award_year ?? awardYear,
  });
}

const PATCH_SCHEMA = { meritFilterPreference: ["merit_only", "show_all"] as const };

export async function PATCH(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { meritFilterPreference?: string };
  try {
    body = (await request.json()) ?? {};
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const pref = body.meritFilterPreference;
  if (
    !pref ||
    !PATCH_SCHEMA.meritFilterPreference.includes(
      pref as (typeof PATCH_SCHEMA.meritFilterPreference)[number]
    )
  ) {
    return NextResponse.json(
      {
        error:
          "meritFilterPreference must be 'merit_only' or 'show_all'",
      },
      { status: 400 }
    );
  }

  const db = createDbClient();
  const { error: updateError } = await db
    .from("profiles")
    .update({
      merit_filter_preference: pref,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to update preference" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, meritFilterPreference: pref });
}
