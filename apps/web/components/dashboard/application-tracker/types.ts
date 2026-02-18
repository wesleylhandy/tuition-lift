/**
 * Application Tracker types — shared between API and client.
 * Per T028 [US3].
 */

export type DisplayBucket =
  | "Tracked"
  | "Drafting"
  | "Review"
  | "Submitted"
  | "Outcome Pending"
  | "Won"
  | "Lost";

export interface TrackerApplication {
  applicationId: string;
  scholarshipTitle: string;
  scholarshipUrl: string | null;
  status: string;
  coachState: string;
  deadline: string | null;
  amount: number | null;
}

export interface ApplicationsResponse {
  buckets: Record<DisplayBucket, TrackerApplication[]>;
}
