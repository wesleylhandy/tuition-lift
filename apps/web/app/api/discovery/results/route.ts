/**
 * GET /api/discovery/results — Retrieve discovery results and milestones.
 * Auth: thread_id must belong to user.
 *
 * @see specs/003-langgraph-orchestration/contracts/api-discovery.md §4 — discoveryRunId, discoveryResults, activeMilestones
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../../lib/supabase/server";
import { graph } from "agent";

export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const threadId = request.nextUrl.searchParams.get("thread_id");
  if (!threadId) {
    return NextResponse.json(
      { error: "thread_id query parameter required" },
      { status: 400 }
    );
  }

  if (threadId !== `user_${user.id}`) {
    return NextResponse.json(
      { error: "Thread not found or not owned by user" },
      { status: 404 }
    );
  }

  // LangGraph JS: getState(config) retrieves checkpoint — contracts §4 response shape
  const config = { configurable: { thread_id: threadId } };
  const state = await graph.getState(config);
  const values = (state?.values ?? {}) as {
    discovery_results?: Array<{
      id: string;
      discovery_run_id: string;
      title: string;
      url: string;
      trust_score: number;
      need_match_score: number;
    }>;
    active_milestones?: Array<{
      id: string;
      scholarship_id: string;
      title: string;
      priority: number;
      status: string;
    }>;
  };

  const results = values.discovery_results ?? [];
  const milestones = values.active_milestones ?? [];

  const discoveryRunId =
    results[0]?.discovery_run_id ?? null;

  return NextResponse.json({
    discoveryRunId,
    discoveryResults: results.map((r) => ({
      id: r.id,
      discoveryRunId: r.discovery_run_id,
      title: r.title,
      url: r.url,
      trustScore: r.trust_score,
      needMatchScore: r.need_match_score,
    })),
    activeMilestones: milestones.map((m) => ({
      id: m.id,
      scholarshipId: m.scholarship_id,
      title: m.title,
      priority: m.priority,
      status: m.status,
    })),
  });
}
