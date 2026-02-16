/**
 * @repo/db — TuitionLift shared database package
 * Single source of truth for types, schemas, and client.
 */

export type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
  CompositeTypes,
} from './generated/database.types.js';

export { Constants } from './generated/database.types.js';
