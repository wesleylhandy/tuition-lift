/**
 * GET /api/scout/status/:runId — Poll Scout run status.
 * Per specs/007-scout-vision-ingestion: T007.
 * Auth, verify run belongs to user (RLS), return step, message, result from scout_runs.
 * @see contracts/scout-api.md §2
 */
import { NextRequest, NextResponse } from "next/server";

import { createServerSupabaseClient } from "../../../../../lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
): Promise<NextResponse> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { runId } = await params;
  if (!runId) {
    return NextResponse.json(
      { error: "runId required" },
      { status: 400 }
    );
  }

  const { data: run, error } = await supabase
    .from("scout_runs")
    .select("id, step, message, result")
    .eq("id", runId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch scout run" },
      { status: 500 }
    );
  }

  if (!run) {
    return NextResponse.json(
      { error: "Run not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    run_id: run.id,
    step: run.step,
    message: run.message ?? null,
    result: run.result ?? null,
  });
}
