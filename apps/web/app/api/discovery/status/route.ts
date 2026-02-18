/**
 * GET /api/discovery/status — Poll discovery status.
 * Auth: thread_id must belong to user (user_${userId}).
 *
 * @see specs/003-langgraph-orchestration/contracts/api-discovery.md §2 — response shape
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../../lib/supabase/server";
import { resolveDiscoveryStatus } from "../../../../lib/discovery-status";

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
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

  const status = await resolveDiscoveryStatus(threadId, user.id);
  if (!status) {
    return NextResponse.json(
      { error: "Thread not found or not owned by user" },
      { status: 404 }
    );
  }

  return NextResponse.json(status);
}
