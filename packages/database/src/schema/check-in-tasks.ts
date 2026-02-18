/**
 * Zod schema for check_in_tasks table validation.
 * Per data-model.md §3 — FR-011 Check-in 21 days after submission.
 */

import { z } from 'zod';

export const checkInStatusEnum = z.enum([
  'pending',
  'completed',
  'dismissed',
]);

export const checkInTaskSchema = z.object({
  user_id: z.string().uuid(),
  application_id: z.string().uuid(),
  due_at: z.string().datetime(),
  status: checkInStatusEnum.optional(),
  created_at: z.string().datetime().optional(),
  completed_at: z.string().datetime().nullable().optional(),
});

export type CheckInTaskSchema = z.infer<typeof checkInTaskSchema>;
