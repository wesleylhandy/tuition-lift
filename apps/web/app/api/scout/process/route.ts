/**
 * POST /api/scout/process — Start Scout run.
 * Per specs/007-scout-vision-ingestion: research §12, T006.
 * Auth, validate JSON body (input_type, url|name|file_path), create scout_run,
 * invoke manual_research_node, return run_id.
 * @see contracts/scout-api.md §1
 */
import { NextResponse } from "next/server";
import { z } from "zod";

import { ScoutInputSchema } from "@repo/db";
import { runManualResearchNode } from "agent/lib/nodes/manual-research";
import { createServerSupabaseClient } from "../../../../lib/supabase/server";

const ProcessBodySchema = z.object({
  input_type: z.enum(["url", "name", "file"]),
  url: z.string().url().optional(),
  name: z.string().min(1).optional(),
  file_path: z.string().min(1).optional(),
});

/** Maps API body to ScoutInput; validates required field for type. */
function parseScoutInput(body: z.infer<typeof ProcessBodySchema>) {
  const input = {
    type: body.input_type,
    url: body.url,
    name: body.name,
    file_path: body.file_path,
  };
  return ScoutInputSchema.parse(input);
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof ProcessBodySchema>;
  try {
    const raw = await request.json();
    body = ProcessBodySchema.parse(raw);
  } catch {
    return NextResponse.json(
      { error: "Invalid input", message: "Requires input_type and url, name, or file_path" },
      { status: 400 }
    );
  }

  let scoutInput: z.infer<typeof ScoutInputSchema>;
  try {
    scoutInput = parseScoutInput(body);
  } catch {
    return NextResponse.json(
      { error: "Invalid input", message: "url required for url, name for name, file_path for file" },
      { status: 400 }
    );
  }

  const { data: run, error: insertError } = await supabase
    .from("scout_runs")
    .insert({
      user_id: user.id,
      step: "searching_sources",
      message: "Scout started",
    })
    .select("id")
    .single();

  if (insertError || !run?.id) {
    return NextResponse.json(
      { error: "Failed to create scout run" },
      { status: 500 }
    );
  }

  await runManualResearchNode(scoutInput, {
    runId: run.id,
    userId: user.id,
    supabase,
  });

  return NextResponse.json(
    { run_id: run.id, message: "Scout started" },
    { status: 201 }
  );
}
