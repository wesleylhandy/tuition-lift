"use server";

/**
 * Server Action: getPrepChecklistData
 * Returns profile completeness and discovery state for Coach's Prep Checklist (US5).
 * Per FR-015: items derived from profile (intended_major, state, GPA, SAI) and discovery state.
 */
import { createServerSupabaseClient } from "../supabase/server";
import { createDbClient, decryptSai } from "@repo/db";

export type PrepChecklistItem = {
  id: string;
  label: string;
  action: "complete_profile" | "complete_gpa" | "add_financial_profile" | "start_discovery" | "broaden_criteria";
  href: string;
};

export type PrepChecklistData = {
  items: PrepChecklistItem[];
  /** True if discovery has ever completed for this user */
  hasDiscoveryRun: boolean;
};

export async function getPrepChecklistData(): Promise<PrepChecklistData | null> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.id) {
    return null;
  }

  const db = createDbClient();
  const userId = user.id;
  const threadId = `user_${userId}`;

  const [profileRes, discoveryRes] = await Promise.all([
    db
      .from("profiles")
      .select("intended_major, state, gpa_weighted, gpa_unweighted, sai")
      .eq("id", userId)
      .maybeSingle(),
    db
      .from("discovery_completions")
      .select("discovery_run_id")
      .eq("thread_id", threadId)
      .eq("user_id", userId)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const profile = profileRes.data;
  const discovery = discoveryRes.data;

  const hasMajor = Boolean(profile?.intended_major?.trim());
  const hasState = Boolean(profile?.state?.trim());
  const gpaW = profile?.gpa_weighted;
  const gpaU = profile?.gpa_unweighted;
  const hasGpa =
    (typeof gpaW === "number" && gpaW >= 0 && gpaW <= 6) ||
    (typeof gpaU === "number" && gpaU >= 0 && gpaU <= 4);
  const sai = decryptSai(profile?.sai);
  const hasSai = sai !== null && sai >= -1500 && sai <= 999999;
  const hasDiscoveryRun = Boolean(discovery?.discovery_run_id);

  const items: PrepChecklistItem[] = [];

  if (!hasMajor || !hasState) {
    items.push({
      id: "complete_profile",
      label: "Complete your profile (major and state required for discovery)",
      action: "complete_profile",
      href: "/discovery",
    });
  }
  if ((hasMajor || hasState) && !hasGpa) {
    items.push({
      id: "complete_gpa",
      label: "Complete your GPA for better scholarship matches",
      action: "complete_gpa",
      href: "/discovery",
    });
  }
  if ((hasMajor || hasState) && !hasSai) {
    items.push({
      id: "add_financial_profile",
      label: "Add your financial profile (SAI) for need-based matches",
      action: "add_financial_profile",
      href: "/discovery",
    });
  }
  if (!hasDiscoveryRun) {
    items.push({
      id: "start_discovery",
      label: "Start discovery to find scholarships",
      action: "start_discovery",
      href: "/discovery",
    });
  } else {
    items.push({
      id: "broaden_criteria",
      label: "Review eligibility or broaden criteria for more matches",
      action: "broaden_criteria",
      href: "/discovery",
    });
  }

  return { items, hasDiscoveryRun };
}
