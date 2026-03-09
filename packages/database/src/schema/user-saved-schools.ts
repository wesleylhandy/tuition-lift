/**
 * Zod schema for user_saved_schools table validation.
 * College list: applied, accepted, committed status per data-model §2.2.
 */

import { z } from 'zod';

export const userSavedSchoolsStatusEnum = z.enum([
  'applied',
  'accepted',
  'committed',
]);

export const userSavedSchoolsSchema = z.object({
  user_id: z.string().uuid(),
  institution_id: z.string().uuid(),
  saved_at: z.string().datetime().optional(),
  status: userSavedSchoolsStatusEnum.optional().default('applied'),
});

export type UserSavedSchoolsSchema = z.infer<typeof userSavedSchoolsSchema>;
