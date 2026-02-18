/**
 * GET /api/coach/game-plan — Daily Top 3 Game Plan.
 *
 * Coach–Orchestration Integration (plan.md): This route reads from the applications table
 * ONLY. It MUST NOT read from or write to LangGraph checkpoint (active_milestones).
 * - Source: applications (momentum_score desc), check_in_tasks (pending)
 * - Forbidden: graph.getState, checkpoint update, active_milestones
 *
 * When user has tracked applications, Top 3 comes from applications. When user has
 * discovery results but no applications, orchestration's active_milestones (003) is the
 * source — consumed by 006 Dashboard, not by this Coach API.
 *
 * T016: auth, compute Top 3 on demand from applications, include pending check-ins.
 *
 * @see specs/005-coach-execution-engine/contracts/coach-api.md §1 — response contract
 */
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../../lib/supabase/server";
import { getGamePlanForUser } from "agent/lib/coach/game-plan";

export async function GET() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const gamePlan = await getGamePlanForUser(user.id);
    return NextResponse.json(gamePlan);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load game plan";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
