/**
 * Parent link API — POST creates link, DELETE removes link.
 * Per contracts/api-parents.md §1, §2. Auth: student for both.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../../lib/supabase/server";
import { createDbClient } from "@repo/db";
import { z } from "zod";

const POST_SCHEMA = z.object({
  parentEmail: z.string().email(),
});

const DELETE_SCHEMA = z.object({
  parentId: z.string().uuid(),
});

type DbClient = ReturnType<typeof createDbClient>;

/** Lookup auth user by email via admin listUsers. Paginated; checks first 1000. */
async function findUserByEmail(
  db: DbClient,
  email: string
): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  let page = 1;
  const perPage = 1000;
  while (page <= 10) {
    const { data } = await db.auth.admin.listUsers({ page, perPage });
    const users = data?.users ?? [];
    const match = users.find(
      (u: { email?: string | null }) =>
        u.email?.trim().toLowerCase() === normalized
    );
    if (match) return match.id;
    if (users.length < perPage) return null;
    page += 1;
  }
  return null;
}

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
      { error: "parentEmail must be a valid email" },
      { status: 400 }
    );
  }

  const { parentEmail } = parsed.data;
  const studentId = user.id;
  const db = createDbClient();

  const existingId = await findUserByEmail(db, parentEmail);

  let parentId: string;

  if (existingId) {
    parentId = existingId;
  } else {
    // Create parent account via Admin API
    const { data: newUser, error: createError } =
      await db.auth.admin.createUser({
        email: parentEmail,
        email_confirm: true,
        user_metadata: { role: "parent" },
        app_metadata: { role: "parent" },
      });

    if (createError || !newUser?.user) {
      return NextResponse.json(
        { error: "Failed to create parent account" },
        { status: 500 }
      );
    }
    parentId = newUser!.user!.id;

    // Ensure profile exists (onboarding may create on first sign-in; we create minimal row)
    await db.from("profiles").upsert(
      {
        id: parentId,
        full_name: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id", ignoreDuplicates: true }
    );
  }

  if (parentId === studentId) {
    return NextResponse.json(
      { error: "Cannot link yourself as parent" },
      { status: 400 }
    );
  }

  const { error: linkError } = await db
    .from("parent_students")
    .upsert(
      {
        parent_id: parentId,
        student_id: studentId,
      },
      { onConflict: "parent_id,student_id", ignoreDuplicates: true }
    );

  if (linkError) {
    if (linkError.code === "23505") {
      return NextResponse.json(
        { error: "Already linked" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create link" },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      linkId: `${parentId}-${studentId}`,
      parentId,
    },
    { status: 201 }
  );
}

export async function DELETE(request: NextRequest) {
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

  const parsed = DELETE_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "parentId must be a valid UUID" },
      { status: 400 }
    );
  }

  const { parentId } = parsed.data;
  const studentId = user.id;

  const db = createDbClient();
  const { error } = await db
    .from("parent_students")
    .delete()
    .eq("parent_id", parentId)
    .eq("student_id", studentId);

  if (error) {
    return NextResponse.json(
      { error: "Failed to unlink" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
