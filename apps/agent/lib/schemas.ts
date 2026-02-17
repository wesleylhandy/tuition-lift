/**
 * Zod schemas for TuitionLiftState and embedded entities.
 * Per data-model.md §11 — validation before writing to state or external APIs.
 */
import { z } from "zod";

// --- FinancialProfile ---

export const householdIncomeBracketEnum = z.enum([
  "Low",
  "Moderate",
  "Middle",
  "Upper-Middle",
  "High",
]);

export const FinancialProfileSchema = z.object({
  estimated_sai: z.number().min(-1500).max(999999),
  is_pell_eligible: z.boolean(),
  household_income_bracket: householdIncomeBracketEnum,
});

export type FinancialProfile = z.infer<typeof FinancialProfileSchema>;

// --- UserProfile ---

export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  major: z.string().min(1),
  state: z.string().min(1),
  gpa: z.number().min(0).max(4).optional(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

// --- DiscoveryResult ---

export const DiscoveryResultSchema = z.object({
  id: z.string(),
  discovery_run_id: z.string().uuid(),
  title: z.string(),
  url: z.string(),
  trust_score: z.number().min(0).max(100),
  need_match_score: z.number().min(0).max(100),
});

export type DiscoveryResult = z.infer<typeof DiscoveryResultSchema>;

// --- ActiveMilestone ---

export const milestoneStatusEnum = z.enum([
  "pending",
  "in_progress",
  "done",
]);

export const ActiveMilestoneSchema = z.object({
  id: z.string(),
  scholarship_id: z.string().uuid(),
  title: z.string(),
  priority: z.number(),
  status: milestoneStatusEnum,
});

export type ActiveMilestone = z.infer<typeof ActiveMilestoneSchema>;

// --- ErrorLogEntry ---

export const ErrorLogEntrySchema = z.object({
  node: z.string(),
  message: z.string(),
  timestamp: z.string().datetime(),
});

export type ErrorLogEntry = z.infer<typeof ErrorLogEntrySchema>;
