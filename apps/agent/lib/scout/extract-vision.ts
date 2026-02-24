/**
 * extract-vision: GPT-4o vision extraction from base64 image (T023).
 * Extracts scholarship data from images (PNG/JPG) and scanned PDF pages.
 * Returns ExtractedScholarshipData with research_required flags.
 * Prompt-injection hardening: delimiters and ignore-instructions (Constitution §4).
 */
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { parseScoutEnv } from "../env";
import type { ExtractedScholarshipData } from "@repo/db";
import {
  buildDocumentUserMessage,
  TEXT_EXTRACTION_SYSTEM_INSTRUCTION,
  VISION_EXTRACTION_INSTRUCTION,
} from "./prompt-injection-hardening";

const VISION_EXTRACT_SCHEMA = z.object({
  title: z.string().min(1).describe("Scholarship name"),
  amount: z.number().nullable().describe("Award amount in dollars, or null if not found"),
  deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "ISO date YYYY-MM-DD")
    .nullable()
    .describe("Deadline YYYY-MM-DD, or null if not found"),
  eligibility: z.string().nullable().describe("Eligibility requirements text, or null"),
  url: z
    .string()
    .url()
    .nullable()
    .or(z.literal(""))
    .describe("Application or official URL, or empty if not found"),
  title_research_required: z.boolean().describe("True if title is unclear or inferred"),
  amount_research_required: z.boolean().describe("True if amount is unclear or inferred"),
  deadline_research_required: z.boolean().describe("True if deadline is unclear or inferred"),
  eligibility_research_required: z.boolean().describe("True if eligibility is unclear or inferred"),
  url_research_required: z.boolean().describe("True if URL is missing or inferred"),
});

type VisionExtractOutput = z.infer<typeof VISION_EXTRACT_SCHEMA>;

/**
 * Extracts scholarship data from plain text via GPT-4o (no vision).
 * Used for digital PDFs with sufficient text density.
 * Hardened: uses delimiters and ignore-instructions to resist prompt injection.
 */
export async function extractFromText(
  text: string
): Promise<ExtractedScholarshipData> {
  const env = parseScoutEnv();
  const llm = new ChatOpenAI({
    model: env.SCOUT_VISION_MODEL,
    temperature: 0.2,
  }).withStructuredOutput(VISION_EXTRACT_SCHEMA, {
    name: "extracted_scholarship",
    strict: true,
  });

  const documentMessage = buildDocumentUserMessage(text);
  const result = (await llm.invoke([
    { role: "system" as const, content: TEXT_EXTRACTION_SYSTEM_INSTRUCTION },
    {
      role: "user" as const,
      content: documentMessage,
    },
  ])) as VisionExtractOutput;

  const researchRequired: Record<string, boolean> = {
    title: result.title_research_required,
    amount: result.amount_research_required,
    deadline: result.deadline_research_required,
    eligibility: result.eligibility_research_required,
    url: result.url_research_required,
  };

  return {
    title: result.title,
    amount: result.amount,
    deadline: result.deadline,
    eligibility: result.eligibility,
    url: result.url && result.url.trim() ? result.url : null,
    trust_score: 50,
    research_required: researchRequired,
    verification_status: "needs_manual_review",
  };
}

/**
 * Extracts scholarship data from base64-encoded image via GPT-4o vision.
 */
export async function extractFromVision(
  base64Image: string,
  mimeType: "image/png" | "image/jpeg"
): Promise<ExtractedScholarshipData> {
  const env = parseScoutEnv();
  const llm = new ChatOpenAI({
    model: env.SCOUT_VISION_MODEL,
    temperature: 0.2,
  }).withStructuredOutput(VISION_EXTRACT_SCHEMA, {
    name: "extracted_scholarship",
    strict: true,
  });

  const dataUrl = `data:${mimeType};base64,${base64Image}`;
  const result = (await llm.invoke([
    {
      role: "user" as const,
      content: [
        { type: "text" as const, text: VISION_EXTRACTION_INSTRUCTION },
        {
          type: "image_url" as const,
          image_url: { url: dataUrl },
        },
      ],
    },
  ])) as VisionExtractOutput;

  const researchRequired: Record<string, boolean> = {
    title: result.title_research_required,
    amount: result.amount_research_required,
    deadline: result.deadline_research_required,
    eligibility: result.eligibility_research_required,
    url: result.url_research_required,
  };

  return {
    title: result.title,
    amount: result.amount,
    deadline: result.deadline,
    eligibility: result.eligibility,
    url: result.url && result.url.trim() ? result.url : null,
    trust_score: 50,
    research_required: researchRequired,
    verification_status: "needs_manual_review",
  };
}
