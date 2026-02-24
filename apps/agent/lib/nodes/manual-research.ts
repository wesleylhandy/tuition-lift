/**
 * manual_research_node: Scout extraction + verification for URL/name/file inputs.
 * Per specs/007-scout-vision-ingestion: research §12, T008, T009.
 * For URL/name: Tavily + TrustScorer + CycleVerifier.
 * For file: delegates to extractFromFile (T025 wires extract-vision/extract-pdf).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { ExtractedScholarshipData, ScoutInput } from "@repo/db";
import { search } from "../discovery/tavily-client";
import { scoreTrust } from "../discovery/trust-scorer";
import { verify as verifyCycle } from "../discovery/cycle-verifier";

/** Extracts YYYY-MM-DD deadline from text. Returns first ISO match or null. */
function extractDeadline(text: string): string | null {
  const iso = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) return iso[0];
  const us = text.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/);
  if (!us) return null;
  const [_, m, d, y] = us;
  const year = (y?.length ?? 0) === 2 ? 2000 + parseInt(y ?? "0", 10) : parseInt(y ?? "0", 10);
  const month = parseInt(m ?? "0", 10) - 1;
  const day = parseInt(d ?? "0", 10);
  const date = new Date(year, month, day);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

/**
 * Extracts scholarship data from file (Storage path).
 * T025 wires: fetch from Storage, detect MIME, call extract-pdf or extract-vision.
 */
async function extractFromFile(
  _filePath: string,
  ctx: ManualResearchContext
): Promise<ExtractedScholarshipData | null> {
  const { runId, userId, supabase } = ctx;
  await supabase
    .from("scout_runs")
    .update({
      step: "error",
      message: "File extraction not yet implemented. Use URL or name for now.",
      updated_at: new Date().toISOString(),
    })
    .eq("id", runId)
    .eq("user_id", userId);
  return null;
}

/** Extracts dollar amount from text. Returns first match or null. */
function extractAmount(text: string): number | null {
  const m = text.match(/\$[\s]*([\d,]+)(?:\.[\d]+)?/);
  if (!m) return null;
  const num = parseInt((m[1] ?? "0").replace(/,/g, ""), 10);
  return Number.isNaN(num) ? null : num;
}

export interface ManualResearchContext {
  runId: string;
  userId: string;
  supabase: SupabaseClient;
}

/**
 * Runs Scout extraction: URL/name via Tavily+TrustScorer+CycleVerifier;
 * file path returns error until T025 wires extract.
 */
export async function runManualResearchNode(
  input: ScoutInput,
  ctx: ManualResearchContext
): Promise<void> {
  const { runId, userId, supabase } = ctx;

  const updateRun = async (updates: {
    step: "reading_document" | "searching_sources" | "calculating_trust" | "complete" | "error";
    message?: string | null;
    result?: ExtractedScholarshipData | null;
  }) => {
    await supabase
      .from("scout_runs")
      .update({
        step: updates.step,
        message: updates.message ?? null,
        result: updates.result ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", runId)
      .eq("user_id", userId);
  };

  try {
    if (input.type === "file") {
      const filePath = input.file_path;
      if (!filePath) {
        await updateRun({ step: "error", message: "Missing file_path for file input." });
        return;
      }
      await updateRun({ step: "reading_document", message: "Reading document..." });
      const extracted = await extractFromFile(filePath, ctx);
      if (extracted) {
        await updateRun({ step: "complete", message: `Extracted "${extracted.title}".`, result: extracted });
      }
      return;
    }

    const query = input.type === "url" ? (input.url ?? "") : (input.name ?? "");
    if (!query) {
      await updateRun({
        step: "error",
        message: "Missing url or name for Scout input.",
      });
      return;
    }

    await updateRun({
      step: "searching_sources",
      message: "Searching official sources...",
    });

    const results = await search(query);
    const top = results[0];
    if (!top || !top.url) {
      await updateRun({
        step: "error",
        message: "No results found. Try a different URL or scholarship name.",
      });
      return;
    }

    await updateRun({
      step: "calculating_trust",
      message: "Calculating trust score...",
    });

    const trust = await scoreTrust({
      url: top.url,
      title: top.title,
      content: top.content,
    });

    const deadline = extractDeadline(top.content);
    const cycleResult = verifyCycle({ deadline, url: top.url });

    const amount = extractAmount(top.content);
    const eligibility = top.content?.slice(0, 500) ?? null;

    const researchRequired: Record<string, boolean> = {
      title: false,
      amount: amount === null,
      deadline: deadline === null,
      eligibility: false,
      url: false,
    };

    const extracted: ExtractedScholarshipData = {
      title: top.title,
      amount,
      deadline: cycleResult.deadline,
      eligibility,
      url: top.url,
      trust_score: trust.trust_score,
      research_required: researchRequired,
      verification_status: cycleResult.verification_status,
      scoring_factors: trust.scoring_factors,
      trust_report: trust.trust_report,
    };

    await updateRun({
      step: "complete",
      message: `Found "${top.title}". Trust score: ${trust.trust_score}.`,
      result: extracted,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scout processing failed.";
    await updateRun({
      step: "error",
      message,
    });
    throw err;
  }
}
