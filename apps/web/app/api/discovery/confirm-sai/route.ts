/**
 * POST /api/discovery/confirm-sai — HITL confirmation for SAI range (FR-016).
 * When Coach asks user to approve using SAI bands in search.
 * Validates thread owned by user; sends event to resume graph.
 * @see contracts/api-discovery.md
 */
import { NextResponse } from "next/server";
import { inngest } from "../../../../lib/inngest/client";
import { createServerSupabaseClient } from "../../../../lib/supabase/server";

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = user.id;

  let body: { threadId?: string; approved?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON", message: "Request body must be JSON." },
      { status: 400 }
    );
  }

  const threadId = body?.threadId?.trim();
  const approved = Boolean(body?.approved);

  if (!threadId) {
    return NextResponse.json(
      { error: "threadId required", message: "threadId is required." },
      { status: 400 }
    );
  }

  if (threadId !== `user_${userId}`) {
    return NextResponse.json(
      { error: "Forbidden", message: "Thread does not belong to you." },
      { status: 403 }
    );
  }

  await inngest.send({
    name: "tuition-lift/discovery.confirm-sai",
    data: { userId, threadId, approved },
  });

  return NextResponse.json({
    success: true,
    message: approved
      ? "Search will use SAI range. Discovery continues."
      : "Search will use income tiers only. Discovery continues.",
  });
}
