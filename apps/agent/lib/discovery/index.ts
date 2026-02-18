/**
 * Discovery engine modules: query generation, search, dedupe, verification, trust scoring.
 * Populated by tasks T011–T023.
 */
export {
  AnonymizedProfileSchema,
  type AnonymizedProfile,
} from "./schemas";
export {
  scrubPiiFromProfile,
  type ProfileWithPossiblePii,
} from "./pii-scrub";
