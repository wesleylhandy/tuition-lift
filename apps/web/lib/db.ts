/**
 * @repo/db stub consumer — validates package setup (T034).
 * Re-export for use in Server Components, Server Actions, API routes.
 */
export { createDbClient } from '@repo/db';
export { profileSchema, waitlistSchema, parseOrThrow } from '@repo/db';
export type { Database, Tables, Enums } from '@repo/db';
