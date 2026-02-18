/**
 * Zod schema for notification_log table validation.
 * Per data-model.md §2 — FR-010 (24h frequency limit); SC-008 template_name for auditability.
 */

import { z } from 'zod';

export const notificationChannelEnum = z.enum(['email', 'dashboard_toast']);

export const notificationLogSchema = z.object({
  user_id: z.string().uuid(),
  channel: notificationChannelEnum,
  sent_at: z.string().datetime().optional(),
  notification_type: z.string().nullable().optional(),
  template_name: z.string().nullable().optional(),
  application_ids: z.array(z.string().uuid()).nullable().optional(),
});

export type NotificationLogSchema = z.infer<typeof notificationLogSchema>;
