/**
 * Coach Execution Engine Zod schemas.
 * Per data-model.md §9 — CoachStateMappingSchema validates Coach state strings.
 */

import { z } from 'zod';

/** Valid Coach states per data-model.md §1. Used for state-mapper validation. */
export const coachStateMappingSchema = z.enum([
  'Tracked',
  'Drafting',
  'Review',
  'Submitted',
  'Outcome Pending',
  'Won',
  'Lost',
]);

export type CoachStateMapping = z.infer<typeof coachStateMappingSchema>;
