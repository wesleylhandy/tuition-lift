/**
 * COA saved schools API — GET list, POST add, DELETE remove.
 * Per contracts/api-coa-comparison.md §2–4. Auth: student only.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../../lib/supabase/server";
import { createDbClient } from "@repo/db";
import { z } from "zod";

const POST_SCHEMA = z.object({
  institutionId: z.string().uuid(),
});

const DELETE_SCHEMA = z.object({
  institutionId: z.string().uuid(),
});

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
  const { data: savedRows } = await db
    .from("user_saved_schools")
    .select("institution_id, saved_at")
    .eq("user_id", user.id)
    .order("saved_at", { ascending: false });

  if (!savedRows?.length) {
    return NextResponse.json({ savedSchools: [] });
  }

  const instIds = savedRows.map((r) => r.institution_id);
  const { data: institutions } = await db
    .from("institutions")
    .select("id, name, institution_type, state, coa, sticker_price, net_price")
    .in("id", instIds);

  const instById = new Map(
    (institutions ?? []).map((i) => [i.id, i])
  );

  const savedSchools = savedRows.map((row) => {
    const inst = instById.get(row.institution_id);
    return {
      institutionId: row.institution_id,
      name: inst?.name ?? "Unknown",
      institutionType: inst?.institution_type ?? "4_year",
      state: inst?.state ?? null,
      coa: inst?.coa ?? null,
      stickerPrice: inst?.sticker_price ?? null,
      netPrice: inst?.net_price ?? null,
      savedAt: row.saved_at,
    };
  });

  return NextResponse.json({ savedSchools });
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
      { error: "institutionId must be a valid UUID" },
      { status: 400 }
    );
  }

  const { institutionId } = parsed.data;
  const db = createDbClient();

  const { data: inst } = await db
    .from("institutions")
    .select("id")
    .eq("id", institutionId)
    .single();

  if (!inst) {
    return NextResponse.json(
      { error: "Institution not found" },
      { status: 400 }
    );
  }

  const { error } = await db.from("user_saved_schools").upsert(
    {
      user_id: user.id,
      institution_id: institutionId,
    },
    { onConflict: "user_id,institution_id", ignoreDuplicates: true }
  );

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { success: true, institutionId },
        { status: 201 }
      );
    }
    return NextResponse.json(
      { error: "Failed to save school" },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { success: true, institutionId },
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
      { error: "institutionId must be a valid UUID" },
      { status: 400 }
    );
  }

  const { institutionId } = parsed.data;
  const db = createDbClient();

  const { data, error } = await db
    .from("user_saved_schools")
    .delete()
    .eq("user_id", user.id)
    .eq("institution_id", institutionId)
    .select("user_id")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "Failed to remove saved school" },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "Saved school not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}
