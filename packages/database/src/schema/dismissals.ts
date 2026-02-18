/**
 * Zod schema for dismissals table validation.
 * Per data-model.md: user_id and scholarship_id must be valid UUIDs.
 */

import { z } from 'zod';

/** Input schema for dismissScholarship Server Action */
export const dismissalInputSchema = z.object({
  scholarship_id: z.string().uuid(),
  discovery_run_id: z.string().uuid().optional().nullable(),
});

export type DismissalInputSchema = z.infer<typeof dismissalInputSchema>;
