/**
 * POST /api/discovery/trigger — Start discovery or return in-progress status.
 * FR-012a: Validate required profile fields; FR-013a: Return status if run in progress.
 * @see contracts/api-discovery.md
 */
import { NextResponse } from "next/server";
import { inngest } from "../../../../lib/inngest/client";
import { createServerSupabaseClient } from "../../../../lib/supabase/server";
import { createDbClient } from "@repo/db";
import { loadProfile } from "agent/load-profile";
import { randomUUID } from "node:crypto";

export async function POST() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = user.id;
  const threadId = `user_${userId}`;

  const { user_profile, financial_profile } = await loadProfile(userId);

  if (!user_profile?.major || !user_profile?.state) {
    return NextResponse.json(
      {
        error: "Profile incomplete",
        message:
          "Please complete your profile: major and state are required for discovery. Add them in your profile settings.",
      },
      { status: 400 }
    );
  }

  const db = createDbClient();
  const { data: existing } = await db
    .from("discovery_completions")
    .select("discovery_run_id, status")
    .eq("thread_id", threadId)
    .eq("user_id", userId)
    .eq("status", "running")
    .limit(1)
    .maybeSingle();

  if (existing?.status === "running") {
    return NextResponse.json({
      threadId,
      discoveryRunId: existing.discovery_run_id,
      status: "running",
      message:
        "Discovery already in progress. Refresh or check back for updates.",
    });
  }

  const discoveryRunId = randomUUID();

  await inngest.send({
    name: "tuition-lift/discovery.requested",
    data: {
      userId,
      threadId,
      discoveryRunId,
      useSaiRange: false,
    },
  });

  return NextResponse.json({
    threadId,
    discoveryRunId,
    status: "running",
    message:
      "Discovery in progress. You'll be notified when results are ready.",
  });
}
