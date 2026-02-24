/**
 * Parent contributions API — POST adds income or manual scholarship.
 * Per contracts/api-parents.md §3. Auth: parent only; must be linked to student.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../../lib/supabase/server";
import { createDbClient, type Json } from "@repo/db";
import { z } from "zod";

const INCOME_PAYLOAD = z.object({
  amount: z.number().finite().min(0),
  source: z.string().min(1).max(200).optional(),
});

const MANUAL_SCHOLARSHIP_PAYLOAD = z.object({
  title: z.string().min(1).max(300),
  amount: z.number().finite().min(0),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD").optional(),
});

const POST_SCHEMA = z.object({
  studentId: z.string().uuid(),
  contributionType: z.enum(["income", "manual_scholarship"]),
  payload: z.unknown(),
});

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = POST_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request: studentId, contributionType, and payload required" },
      { status: 400 }
    );
  }

  const { studentId, contributionType, payload } = parsed.data;

  const payloadSchema =
    contributionType === "income"
      ? INCOME_PAYLOAD
      : MANUAL_SCHOLARSHIP_PAYLOAD;
  const payloadResult = payloadSchema.safeParse(payload);
  if (!payloadResult.success) {
    return NextResponse.json(
      { error: "Invalid payload for contribution type" },
      { status: 400 }
    );
  }

  const db = createDbClient();

  const { data: link } = await db
    .from("parent_students")
    .select("student_id")
    .eq("parent_id", user.id)
    .eq("student_id", studentId)
    .single();

  if (!link) {
    return NextResponse.json(
      { error: "Parent not linked to student" },
      { status: 403 }
    );
  }

  const contributionPayload = JSON.parse(
    JSON.stringify(payloadResult.data)
  );
  const { data: inserted, error } = await db
    .from("parent_contributions")
    .insert({
      student_id: studentId,
      parent_id: user.id,
      contribution_type: contributionType,
      payload: contributionPayload as Json,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    return NextResponse.json(
      { error: "Failed to add contribution" },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { success: true, contributionId: inserted.id },
    { status: 201 }
  );
}
