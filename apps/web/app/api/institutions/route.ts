/**
 * Institutions list API — returns institutions for add-school flow.
 * Auth required (student dashboard).
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../lib/supabase/server";
import { createDbClient } from "@repo/db";

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const typeParam = searchParams.get("type");
  const limit = Math.min(
    parseInt(searchParams.get("limit") ?? "50", 10) || 50,
    200
  );

  const db = createDbClient();
  let query = db
    .from("institutions")
    .select("id, name, institution_type, state, coa, sticker_price, net_price")
    .limit(limit)
    .order("name");

  if (typeParam && ["4_year", "community_college", "trade_school", "city_college"].includes(typeParam)) {
    query = query.eq("institution_type", typeParam);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch institutions" },
      { status: 500 }
    );
  }

  const items = (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    institutionType: r.institution_type,
    state: r.state,
    coa: r.coa,
    stickerPrice: r.sticker_price,
    netPrice: r.net_price,
  }));

  return NextResponse.json({ institutions: items });
}
